import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { BudgetOAuthProvider, AUTH_CODE_LIFETIME_MS } from "./oauth-provider.js";
import { budgetLogin } from "./budget-api.js";
import { getClient, insertGrant, newOpaqueToken } from "./db.js";
import { renderLoginPage } from "./login-page.js";
import { createBudgetServer } from "./tools.js";

const PORT = Number(process.env.PORT) || 8787;
// RENDER_EXTERNAL_URL is injected automatically by Render for every web service;
// MCP_PUBLIC_URL lets us override it (e.g. for local dev against a tunnel).
const PUBLIC_URL =
  process.env.MCP_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;
const issuerUrl = new URL(PUBLIC_URL);

const provider = new BudgetOAuthProvider();

const app = express();
app.use(cors());

// Standard MCP OAuth endpoints: /.well-known/*, /register, /authorize (GET),
// /token, /revoke — wired straight to our provider above.
app.use(
  mcpAuthRouter({
    provider,
    issuerUrl,
    resourceServerUrl: new URL("/mcp", issuerUrl),
    resourceName: "Budget App",
  })
);

// Our own login form's submit target. The GET /authorize step (handled by
// mcpAuthRouter above) already validated client_id/redirect_uri and rendered
// this form via provider.authorize(); here we perform the actual budget-app
// login and mint the authorization code.
app.post(
  "/authorize/login",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const {
      email,
      password,
      client_id,
      redirect_uri,
      state,
      code_challenge,
      resource,
      scope,
    } = req.body ?? {};

    const client = await getClient(client_id);
    if (!client || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid request");
      return;
    }

    try {
      const { token: budgetJwt, user } = await budgetLogin(email, password);

      const code = newOpaqueToken();
      await insertGrant({
        token: code,
        grantType: "code",
        clientId: client_id,
        userId: user.id,
        budgetJwt,
        codeChallenge: code_challenge,
        redirectUri: redirect_uri,
        resource: resource || undefined,
        scopes: scope ? scope.split(" ") : [],
        expiresAt: new Date(Date.now() + AUTH_CODE_LIFETIME_MS),
      });

      const redirect = new URL(redirect_uri);
      redirect.searchParams.set("code", code);
      if (state) redirect.searchParams.set("state", state);
      res.redirect(302, redirect.toString());
    } catch (err) {
      res.status(401).send(
        renderLoginPage({
          clientId: client_id,
          clientName: client.client_name,
          redirectUri: redirect_uri,
          state,
          codeChallenge: code_challenge,
          resource,
          scope: scope ?? "",
          error: "אימייל או סיסמה שגויים",
        })
      );
    }
  }
);

const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(
  new URL("/mcp", issuerUrl)
);

app.post(
  "/mcp",
  requireBearerAuth({ verifier: provider, resourceMetadataUrl }),
  express.json(),
  async (req, res) => {
    const budgetJwt = req.auth?.extra?.budgetJwt as string | undefined;
    if (!budgetJwt) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    // Fresh server + transport per request (stateless mode) — keeps each
    // call strictly scoped to the JWT that came with its own access token.
    const server = createBudgetServer(budgetJwt);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Budget MCP server listening on :${PORT} (issuer ${issuerUrl})`);
});
