import { Pool } from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

// ---- OAuth clients (Dynamic Client Registration) ----

export async function getClient(
  clientId: string
): Promise<OAuthClientInformationFull | undefined> {
  const { rows } = await pool.query(
    "SELECT data FROM mcp_oauth_clients WHERE client_id = $1",
    [clientId]
  );
  return rows[0]?.data;
}

export async function insertClient(
  client: OAuthClientInformationFull
): Promise<void> {
  await pool.query(
    "INSERT INTO mcp_oauth_clients (client_id, data) VALUES ($1, $2)",
    [client.client_id, client]
  );
}

export { randomUUID };

// ---- OAuth grants (authorization codes / access tokens / refresh tokens) ----

export type GrantType = "code" | "access" | "refresh";

export interface GrantRow {
  token_hash: string;
  grant_type: GrantType;
  client_id: string;
  user_id: number;
  budget_jwt: string;
  code_challenge: string | null;
  redirect_uri: string | null;
  resource: string | null;
  scopes: string[];
  expires_at: Date;
}

export async function insertGrant(row: {
  token: string;
  grantType: GrantType;
  clientId: string;
  userId: number;
  budgetJwt: string;
  codeChallenge?: string;
  redirectUri?: string;
  resource?: string;
  scopes: string[];
  expiresAt: Date;
}): Promise<void> {
  await pool.query(
    `INSERT INTO mcp_oauth_grants
      (token_hash, grant_type, client_id, user_id, budget_jwt, code_challenge, redirect_uri, resource, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      hashToken(row.token),
      row.grantType,
      row.clientId,
      row.userId,
      row.budgetJwt,
      row.codeChallenge ?? null,
      row.redirectUri ?? null,
      row.resource ?? null,
      JSON.stringify(row.scopes),
      row.expiresAt,
    ]
  );
}

export async function getGrant(
  token: string,
  grantType: GrantType
): Promise<GrantRow | undefined> {
  const { rows } = await pool.query(
    "SELECT * FROM mcp_oauth_grants WHERE token_hash = $1 AND grant_type = $2",
    [hashToken(token), grantType]
  );
  return rows[0];
}

export async function deleteGrant(token: string): Promise<void> {
  await pool.query("DELETE FROM mcp_oauth_grants WHERE token_hash = $1", [
    hashToken(token),
  ]);
}
