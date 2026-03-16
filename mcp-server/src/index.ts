import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.BUDGET_API_URL || "http://localhost:4567/api";
const EMAIL = process.env.BUDGET_EMAIL;
const PASSWORD = process.env.BUDGET_PASSWORD;

let token: string | null = null;

async function ensureAuth(): Promise<string> {
  if (token) return token;

  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Missing BUDGET_EMAIL or BUDGET_PASSWORD environment variables"
    );
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed: ${err}`);
  }

  const data = await res.json();
  token = data.token;
  return token!;
}

async function apiGet(path: string): Promise<any> {
  const jwt = await ensureAuth();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error (${res.status}): ${err}`);
  }
  return res.json();
}

async function apiPost(path: string, body: any): Promise<any> {
  const jwt = await ensureAuth();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error (${res.status}): ${err}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "budget-reimbursements",
  version: "1.0.0",
});

// Tool: list_my_funds
server.tool(
  "list_my_funds",
  "Get all funds accessible to the user with their balances. Use this to find the right fund before submitting a reimbursement.",
  {},
  async () => {
    const funds = await apiGet("/funds");

    const formatted = funds.map(
      (f: any) =>
        `[${f.id}] ${f.name} (budget: ${f.budget_name || f.budget_id}) — allocated: ₪${f.allocated_amount}, spent: ₪${f.spent_amount}, planned: ₪${f.planned_amount}, available: ₪${f.available_amount}`
    );

    return {
      content: [{ type: "text" as const, text: formatted.join("\n") }],
    };
  }
);

// Tool: submit_reimbursement
server.tool(
  "submit_reimbursement",
  "Submit a reimbursement request. Requires fund ID (use list_my_funds first), amount, description, and expense date.",
  {
    fundId: z.number().describe("Fund ID to submit the reimbursement to"),
    amount: z.number().positive().describe("Amount in ILS (shekel)"),
    description: z.string().describe("What the expense was for"),
    expenseDate: z
      .string()
      .describe("Date of expense in YYYY-MM-DD format"),
    receiptUrl: z
      .string()
      .optional()
      .describe("URL of receipt image (optional)"),
  },
  async ({ fundId, amount, description, expenseDate, receiptUrl }) => {
    const result = await apiPost("/reimbursements", {
      fundId,
      amount,
      description,
      expenseDate,
      receiptUrl: receiptUrl || null,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Reimbursement submitted successfully!\nID: ${result.id}\nAmount: ₪${result.amount}\nFund: ${fundId}\nStatus: ${result.status}\nDescription: ${result.description}`,
        },
      ],
    };
  }
);

// Tool: list_my_reimbursements
server.tool(
  "list_my_reimbursements",
  "List the user's submitted reimbursements. Can filter by status. Use this to check for duplicates before submitting or to report on reimbursement status.",
  {
    status: z
      .enum(["pending", "under_review", "approved", "rejected", "paid"])
      .optional()
      .describe("Filter by status (optional)"),
  },
  async ({ status }) => {
    const query = status ? `?status=${status}` : "";
    const reimbursements = await apiGet(`/reimbursements/my${query}`);

    if (reimbursements.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: status
              ? `No reimbursements with status "${status}".`
              : "No reimbursements found.",
          },
        ],
      };
    }

    const formatted = reimbursements.map(
      (r: any) =>
        `[${r.id}] ₪${r.amount} — ${r.description} | fund: ${r.fund_name || r.fund_id} | date: ${r.expense_date} | status: ${r.status}`
    );

    return {
      content: [{ type: "text" as const, text: formatted.join("\n") }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
