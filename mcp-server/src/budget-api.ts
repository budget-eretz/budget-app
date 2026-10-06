const API_URL = process.env.BUDGET_API_URL || "http://localhost:4567/api";

export interface BudgetLoginResult {
  token: string;
  user: { id: number; email: string; full_name?: string };
}

/**
 * Logs into budget-app with a user's own email/password (entered once, on the
 * MCP "Connect" login page) and returns the JWT budget-app itself issues.
 * We never store the password — only this JWT.
 */
export async function budgetLogin(
  email: string,
  password: string
): Promise<BudgetLoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Login failed: ${err || res.statusText}`);
  }

  return res.json();
}

/** Decodes a JWT's payload without verifying the signature (we trust it — we
 * just received it directly from budget-app's own /auth/login moments ago). */
export function decodeJwtExpiry(jwt: string): Date {
  const [, payloadB64] = jwt.split(".");
  if (!payloadB64) throw new Error("Malformed JWT");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  if (typeof payload.exp !== "number") {
    throw new Error("JWT has no exp claim");
  }
  return new Date(payload.exp * 1000);
}

/** Reads the budget-app user id (`userId` claim) from the user's own JWT, used
 * only to narrow list results client-side — authorization stays in the backend. */
export function decodeJwtUserId(jwt: string): number | null {
  try {
    const [, payloadB64] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function apiGet(jwt: string, path: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${err}`);
  }
  return res.json();
}

export async function apiRequest(
  jwt: string,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
