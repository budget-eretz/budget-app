export interface LoginPageParams {
  clientId: string;
  clientName?: string;
  redirectUri: string;
  state?: string;
  codeChallenge: string;
  resource?: string;
  scope: string;
  error?: string;
}

function esc(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
      c
    ]!)
  );
}

export function renderLoginPage(params: LoginPageParams): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>התחברות - תקציב</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f4f5f7; display: flex;
         align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  form { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08);
         width: 320px; }
  h1 { font-size: 1.1rem; margin: 0 0 .25rem; }
  p.sub { color: #666; font-size: .85rem; margin: 0 0 1.25rem; }
  label { display: block; font-size: .85rem; margin: .75rem 0 .25rem; }
  input[type=email], input[type=password] {
    width: 100%; padding: .5rem; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;
  }
  button { margin-top: 1.25rem; width: 100%; padding: .6rem; border: none; border-radius: 6px;
           background: #2563eb; color: #fff; font-size: .95rem; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .error { color: #b91c1c; background: #fef2f2; padding: .5rem .75rem; border-radius: 6px;
           font-size: .85rem; margin-bottom: .75rem; }
</style>
</head>
<body>
<form method="post" action="/authorize/login">
  <h1>התחברות למערכת התקציב</h1>
  <p class="sub">${esc(params.clientName) || "אפליקציה חיצונית"} מבקשת גישה לחשבון שלך</p>
  ${params.error ? `<div class="error">${esc(params.error)}</div>` : ""}
  <label for="email">אימייל</label>
  <input type="email" id="email" name="email" required autofocus>
  <label for="password">סיסמה</label>
  <input type="password" id="password" name="password" required>
  <input type="hidden" name="client_id" value="${esc(params.clientId)}">
  <input type="hidden" name="redirect_uri" value="${esc(params.redirectUri)}">
  <input type="hidden" name="state" value="${esc(params.state)}">
  <input type="hidden" name="code_challenge" value="${esc(params.codeChallenge)}">
  <input type="hidden" name="resource" value="${esc(params.resource)}">
  <input type="hidden" name="scope" value="${esc(params.scope)}">
  <button type="submit">התחבר</button>
</form>
</body>
</html>`;
}
