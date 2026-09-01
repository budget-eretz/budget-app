import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiRequest } from "./budget-api.js";

/**
 * Builds a fresh McpServer with all budget tools bound to one user's JWT.
 * Called once per HTTP request (see index.ts) so each request acts strictly
 * as the user whose access token it carried — never another user's session.
 */
export function createBudgetServer(jwt: string): McpServer {
  const server = new McpServer({
    name: "budget-reimbursements",
    version: "1.0.0",
  });

  server.tool(
    "list_my_funds",
    "Get all funds accessible to the user with their balances. Use this to find the right fund before submitting a reimbursement.",
    {},
    async () => {
      const data = await apiGet(jwt, "/funds/accessible");
      const budgets = data.budgets || [];

      const lines: string[] = [];
      for (const budget of budgets) {
        for (const fund of budget.funds || []) {
          lines.push(
            `[${fund.id}] ${fund.name} (budget: ${budget.name}) — allocated: ₪${fund.allocated_amount}, available: ₪${fund.available_amount}`
          );
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  server.tool(
    "submit_reimbursement",
    "Submit a reimbursement request. Requires fund ID (use list_my_funds first), amount, description, and expense date.",
    {
      fundId: z.number().describe("Fund ID to submit the reimbursement to"),
      amount: z.number().positive().describe("Amount in ILS (shekel)"),
      description: z.string().describe("What the expense was for"),
      expenseDate: z.string().describe("Date of expense in YYYY-MM-DD format"),
      receiptUrl: z
        .string()
        .optional()
        .describe("URL of receipt image (optional)"),
    },
    async ({ fundId, amount, description, expenseDate, receiptUrl }) => {
      const result = await apiRequest(jwt, "POST", "/reimbursements", {
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
      const reimbursements = await apiGet(jwt, `/reimbursements/my${query}`);

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

  server.tool(
    "update_reimbursement",
    "Update a pending/under_review reimbursement. Use list_my_reimbursements first to find the ID. Only works on reimbursements that haven't been approved yet.",
    {
      id: z.number().describe("Reimbursement ID to update"),
      fundId: z.number().optional().describe("New fund ID"),
      amount: z.number().positive().optional().describe("New amount in ILS"),
      description: z.string().optional().describe("New description"),
      expenseDate: z
        .string()
        .optional()
        .describe("New date in YYYY-MM-DD format"),
      receiptUrl: z.string().optional().describe("New receipt URL"),
    },
    async ({ id, ...updates }) => {
      const body: any = {};
      if (updates.fundId !== undefined) body.fundId = updates.fundId;
      if (updates.amount !== undefined) body.amount = updates.amount;
      if (updates.description !== undefined)
        body.description = updates.description;
      if (updates.expenseDate !== undefined)
        body.expenseDate = updates.expenseDate;
      if (updates.receiptUrl !== undefined)
        body.receiptUrl = updates.receiptUrl;

      const result = await apiRequest(
        jwt,
        "PATCH",
        `/reimbursements/${id}`,
        body
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Reimbursement #${id} updated successfully!\nAmount: ₪${result.amount}\nDescription: ${result.description}\nStatus: ${result.status}`,
          },
        ],
      };
    }
  );

  server.tool(
    "delete_reimbursement",
    "Delete a pending/under_review reimbursement. Use list_my_reimbursements first to find the ID. Only works on reimbursements that haven't been approved yet.",
    {
      id: z.number().describe("Reimbursement ID to delete"),
    },
    async ({ id }) => {
      await apiRequest(jwt, "DELETE", `/reimbursements/${id}`);

      return {
        content: [
          {
            type: "text" as const,
            text: `Reimbursement #${id} deleted successfully.`,
          },
        ],
      };
    }
  );

  return server;
}
