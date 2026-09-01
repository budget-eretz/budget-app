-- MCP remote server OAuth: registered clients (e.g. claude.ai, via Dynamic Client Registration)
-- and issued grants (authorization codes / access tokens / refresh tokens).
--
-- No budget-app passwords are ever stored here — only the JWT each user already
-- received from POST /auth/login, keyed by a hash of the opaque MCP token.

CREATE TABLE mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  data JSONB NOT NULL, -- full OAuthClientInformationFull object, as returned by the MCP SDK
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mcp_oauth_grants (
  token_hash TEXT PRIMARY KEY, -- SHA-256 hex of the raw code/access/refresh token
  grant_type TEXT NOT NULL CHECK (grant_type IN ('code', 'access', 'refresh')),
  client_id TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_jwt TEXT NOT NULL,
  code_challenge TEXT, -- only set on 'code' rows
  redirect_uri TEXT, -- only set on 'code' rows
  resource TEXT,
  scopes JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_oauth_grants_expires_at ON mcp_oauth_grants (expires_at);
CREATE INDEX idx_mcp_oauth_grants_client_type ON mcp_oauth_grants (client_id, grant_type);
