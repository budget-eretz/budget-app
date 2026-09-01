import type { Response } from "express";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  deleteGrant,
  getClient,
  getGrant,
  insertClient,
  insertGrant,
  newOpaqueToken,
  randomUUID,
} from "./db.js";
import { renderLoginPage } from "./login-page.js";

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches budget-app's own JWT lifetime
const AUTH_CODE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes, single use

class BudgetClientsStore implements OAuthRegisteredClientsStore {
  async getClient(
    clientId: string
  ): Promise<OAuthClientInformationFull | undefined> {
    return getClient(clientId);
  }

  async registerClient(
    metadata: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const client: OAuthClientInformationFull = {
      ...metadata,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    await insertClient(client);
    return client;
  }
}

export class BudgetOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new BudgetClientsStore();

  /**
   * Renders our own login form instead of redirecting anywhere — the form's
   * hidden fields carry the (already-validated by the SDK) authorize params
   * through to POST /authorize/login, which does the actual budget-app login.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    res.send(
      renderLoginPage({
        clientId: client.client_id,
        clientName: client.client_name,
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        resource: params.resource?.toString(),
        scope: params.scopes?.join(" ") ?? "",
      })
    );
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const grant = await getGrant(authorizationCode, "code");
    if (!grant || grant.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    return grant.code_challenge!;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const grant = await getGrant(authorizationCode, "code");
    if (!grant || grant.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    if (grant.expires_at.getTime() < Date.now()) {
      await deleteGrant(authorizationCode);
      throw new InvalidGrantError("Authorization code expired");
    }

    await deleteGrant(authorizationCode); // single use

    return issueTokens({
      clientId: client.client_id,
      userId: grant.user_id,
      budgetJwt: grant.budget_jwt,
      scopes: grant.scopes,
    });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[]
  ): Promise<OAuthTokens> {
    const grant = await getGrant(refreshToken, "refresh");
    if (!grant || grant.client_id !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    if (grant.expires_at.getTime() < Date.now()) {
      await deleteGrant(refreshToken);
      throw new InvalidGrantError("Refresh token expired — please reconnect");
    }

    await deleteGrant(refreshToken); // rotate

    return issueTokens({
      clientId: client.client_id,
      userId: grant.user_id,
      budgetJwt: grant.budget_jwt,
      scopes: scopes ?? grant.scopes,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const grant = await getGrant(token, "access");
    if (!grant) {
      throw new InvalidTokenError("Invalid access token");
    }
    if (grant.expires_at.getTime() < Date.now()) {
      throw new InvalidTokenError("Access token expired");
    }

    return {
      token,
      clientId: grant.client_id,
      scopes: grant.scopes,
      expiresAt: Math.floor(grant.expires_at.getTime() / 1000),
      extra: { budgetJwt: grant.budget_jwt, userId: grant.user_id },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    await deleteGrant(request.token);
  }
}

async function issueTokens(params: {
  clientId: string;
  userId: number;
  budgetJwt: string;
  scopes: string[];
}): Promise<OAuthTokens> {
  const accessToken = newOpaqueToken();
  const refreshToken = newOpaqueToken();

  // The MCP access token lives exactly as long as the underlying budget-app
  // JWT does — once that expires, tool calls will fail and the client is
  // told to reconnect, so we never need to guess or hardcode a duration.
  const accessExpiresAt = decodeJwtExpiry(params.budgetJwt);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  await insertGrant({
    token: accessToken,
    grantType: "access",
    clientId: params.clientId,
    userId: params.userId,
    budgetJwt: params.budgetJwt,
    scopes: params.scopes,
    expiresAt: accessExpiresAt,
  });

  await insertGrant({
    token: refreshToken,
    grantType: "refresh",
    clientId: params.clientId,
    userId: params.userId,
    budgetJwt: params.budgetJwt,
    scopes: params.scopes,
    expiresAt: refreshExpiresAt,
  });

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: Math.max(
      1,
      Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000)
    ),
    refresh_token: refreshToken,
    scope: params.scopes.join(" "),
  };
}

function decodeJwtExpiry(jwt: string): Date {
  const [, payloadB64] = jwt.split(".");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  return new Date(payload.exp * 1000);
}

export { AUTH_CODE_LIFETIME_MS };
