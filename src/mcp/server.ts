/**
 * @swagger
 * tags:
 *   name: MCP Server
 *   description: |
 *     Model Context Protocol (MCP) Server for AI Agents (n8n, Claude, etc.)
 *
 *     **How to use:**
 *     1. Call `GET /api/v1/api/mcp/sse` to open an SSE (Server-Sent Events) stream — keep this connection alive.
 *     2. While SSE is open, send JSON-RPC 2.0 requests to `POST /api/v1/api/mcp/messages`.
 *     3. All endpoints require the `x-api-key` header.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     McpJsonRpcRequest:
 *       type: object
 *       required:
 *         - jsonrpc
 *         - id
 *         - method
 *         - params
 *       properties:
 *         jsonrpc:
 *           type: string
 *           enum: ["2.0"]
 *           example: "2.0"
 *         id:
 *           type: integer
 *           example: 1
 *         method:
 *           type: string
 *           enum: ["tools/list", "tools/call"]
 *           description: "`tools/list` to list all tools, `tools/call` to invoke a specific tool"
 *           example: "tools/call"
 *         params:
 *           type: object
 *           description: Parameters for the method
 *
 *     McpListToolsParams:
 *       type: object
 *       description: Empty params for `tools/list`
 *       example: {}
 *
 *     McpCallToolParams:
 *       type: object
 *       required:
 *         - name
 *         - arguments
 *       properties:
 *         name:
 *           type: string
 *           enum: [smartSearch, getDashboard, scheduleActivity, getUpcomingActivities, getOverdueActivities]
 *           description: The tool to call
 *         arguments:
 *           type: object
 *           description: Tool-specific arguments (see individual schemas below)
 *
 *     SmartSearchArgs:
 *       type: object
 *       description: Arguments for the `smartSearch` tool
 *       properties:
 *         query:
 *           type: string
 *           description: Search query (phone number, email, or name)
 *           example: "john.doe@example.com"
 *         entityTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [all, lead, opportunity, account, contact]
 *           description: Which entity types to search
 *           example: ["lead", "contact"]
 *         filters:
 *           type: object
 *           properties:
 *             ownerId:
 *               type: string
 *               description: "Filter by owner. Use 'mine' for current user or a specific user ID"
 *               example: "mine"
 *             status:
 *               type: string
 *               example: "New"
 *             rating:
 *               type: string
 *               example: "Hot"
 *             stage:
 *               type: string
 *               example: "Qualification"
 *         limit:
 *           type: integer
 *           default: 10
 *           example: 5
 *
 *     GetDashboardArgs:
 *       type: object
 *       description: Arguments for the `getDashboard` tool
 *       properties:
 *         timeRange:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: week
 *           example: "week"
 *         userId:
 *           type: string
 *           description: Filter by a specific user (for managers). Leave empty for self.
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *     ScheduleActivityArgs:
 *       type: object
 *       required:
 *         - subject
 *         - when
 *       description: Arguments for the `scheduleActivity` tool
 *       properties:
 *         subject:
 *           type: string
 *           example: "Follow-up call with John Doe"
 *         when:
 *           type: string
 *           description: Natural language time expression
 *           example: "tomorrow 3pm"
 *         activityType:
 *           type: string
 *           enum: [CALL, MEETING, EMAIL, TASK]
 *           default: CALL
 *           example: "CALL"
 *         priority:
 *           type: string
 *           enum: [HIGH, NORMAL, LOW]
 *           default: NORMAL
 *           example: "HIGH"
 *         description:
 *           type: string
 *           example: "Discuss Q1 renewal pricing"
 *         relatedTo:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [lead, opportunity, account, contact]
 *               example: "lead"
 *             id:
 *               type: string
 *               example: "550e8400-e29b-41d4-a716-446655440001"
 *
 *     GetUpcomingActivitiesArgs:
 *       type: object
 *       description: Arguments for the `getUpcomingActivities` tool
 *       properties:
 *         days:
 *           type: integer
 *           default: 7
 *           description: Number of days ahead to look
 *           example: 7
 *         limit:
 *           type: integer
 *           default: 20
 *           example: 20
 *
 *     GetOverdueActivitiesArgs:
 *       type: object
 *       description: Arguments for the `getOverdueActivities` tool
 *       properties:
 *         limit:
 *           type: integer
 *           default: 20
 *           example: 20
 *
 *     McpToolResponse:
 *       type: object
 *       properties:
 *         jsonrpc:
 *           type: string
 *           example: "2.0"
 *         id:
 *           type: integer
 *           example: 1
 *         result:
 *           type: object
 *           properties:
 *             content:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "text"
 *                   text:
 *                     type: string
 *                     description: JSON stringified result of the tool call
 */

/**
 * @swagger
 * /api/mcp/sse:
 *   get:
 *     summary: Open MCP SSE Connection
 *     description: |
 *       Opens a persistent Server-Sent Events (SSE) stream. This connection **must remain open** for the MCP
 *       session to work. Once connected, use `POST /api/v1/api/mcp/messages` to send JSON-RPC tool calls.
 *
 *       **This endpoint cannot be tested directly in Swagger UI** (SSE streams are persistent connections).
 *       Use `curl`, Postman (with SSE support), or the MCP Inspector instead:
 *       ```
 *       curl -N -H "x-api-key: YOUR_KEY" http://localhost:PORT/api/v1/api/mcp/sse
 *       ```
 *     tags: [MCP Server]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: SSE stream opened successfully. Events will be streamed as the AI agent sends tool calls.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\n\n"
 *       401:
 *         description: Missing or invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "API key is required. Provide it in 'x-api-key' header."
 */

/**
 * @swagger
 * /api/mcp/messages:
 *   post:
 *     summary: Send MCP Tool Call (JSON-RPC 2.0)
 *     description: |
 *       Sends a JSON-RPC 2.0 message to the MCP server. **Requires an active SSE connection** opened via
 *       `GET /api/v1/api/mcp/sse`. Use this to list tools or call any of the 5 available CRM tools.
 *
 *       ---
 *       ### Available Tools
 *
 *       | Tool | Description |
 *       |------|-------------|
 *       | `smartSearch` | Search leads, opportunities, accounts, or contacts by phone/email/name |
 *       | `getDashboard` | Get dashboard metrics for a time range |
 *       | `scheduleActivity` | Create a call, meeting, email, or task using natural language time |
 *       | `getUpcomingActivities` | List activities due in the next N days |
 *       | `getOverdueActivities` | List activities past their due date |
 *
 *       ---
 *       ### Example — List all tools
 *       ```json
 *       { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }
 *       ```
 *
 *       ### Example — Call `getDashboard`
 *       ```json
 *       {
 *         "jsonrpc": "2.0", "id": 2, "method": "tools/call",
 *         "params": { "name": "getDashboard", "arguments": { "timeRange": "week" } }
 *       }
 *       ```
 *
 *       ### Example — Call `smartSearch`
 *       ```json
 *       {
 *         "jsonrpc": "2.0", "id": 3, "method": "tools/call",
 *         "params": { "name": "smartSearch", "arguments": { "query": "john", "entityTypes": ["lead"], "limit": 5 } }
 *       }
 *       ```
 *
 *       ### Example — Call `scheduleActivity`
 *       ```json
 *       {
 *         "jsonrpc": "2.0", "id": 4, "method": "tools/call",
 *         "params": {
 *           "name": "scheduleActivity",
 *           "arguments": {
 *             "subject": "Follow-up call with John",
 *             "when": "tomorrow 3pm",
 *             "activityType": "CALL",
 *             "priority": "HIGH",
 *             "relatedTo": { "type": "lead", "id": "YOUR_LEAD_ID" }
 *           }
 *         }
 *       }
 *       ```
 *
 *       ### Example — Call `getUpcomingActivities`
 *       ```json
 *       {
 *         "jsonrpc": "2.0", "id": 5, "method": "tools/call",
 *         "params": { "name": "getUpcomingActivities", "arguments": { "days": 7, "limit": 20 } }
 *       }
 *       ```
 *
 *       ### Example — Call `getOverdueActivities`
 *       ```json
 *       {
 *         "jsonrpc": "2.0", "id": 6, "method": "tools/call",
 *         "params": { "name": "getOverdueActivities", "arguments": { "limit": 20 } }
 *       }
 *       ```
 *     tags: [MCP Server]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/McpJsonRpcRequest'
 *           examples:
 *             listTools:
 *               summary: List all available tools
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 1
 *                 method: "tools/list"
 *                 params: {}
 *             getDashboard:
 *               summary: Get dashboard metrics
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 2
 *                 method: "tools/call"
 *                 params:
 *                   name: "getDashboard"
 *                   arguments:
 *                     timeRange: "week"
 *             smartSearch:
 *               summary: Smart search across CRM entities
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 3
 *                 method: "tools/call"
 *                 params:
 *                   name: "smartSearch"
 *                   arguments:
 *                     query: "john"
 *                     entityTypes: ["lead", "contact"]
 *                     limit: 5
 *             scheduleActivity:
 *               summary: Schedule a new activity
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 4
 *                 method: "tools/call"
 *                 params:
 *                   name: "scheduleActivity"
 *                   arguments:
 *                     subject: "Follow-up call with John"
 *                     when: "tomorrow 3pm"
 *                     activityType: "CALL"
 *                     priority: "HIGH"
 *             getUpcomingActivities:
 *               summary: Get upcoming activities
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 5
 *                 method: "tools/call"
 *                 params:
 *                   name: "getUpcomingActivities"
 *                   arguments:
 *                     days: 7
 *                     limit: 20
 *             getOverdueActivities:
 *               summary: Get overdue activities
 *               value:
 *                 jsonrpc: "2.0"
 *                 id: 6
 *                 method: "tools/call"
 *                 params:
 *                   name: "getOverdueActivities"
 *                   arguments:
 *                     limit: 20
 *     responses:
 *       200:
 *         description: JSON-RPC response from the MCP server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/McpToolResponse'
 *       400:
 *         description: No active SSE connection — open /api/mcp/sse first
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "No active SSE connection"
 *       401:
 *         description: Missing or invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired API key"
 */


import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import * as express from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { UnifiedService } from "../services/unified.service";

export const mcpRouter = express.Router();
const unifiedService = new UnifiedService();

interface McpSession {
    server: Server;
    transport: StreamableHTTPServerTransport;
    context: { orgId?: string; userId?: string };
}
const activeSessions = new Map<string, McpSession>();

const LOAN_TYPES = [
    "Auto Loan - Car Loan",
    "Housing Loan - Home Loan - HL",
    "Business Loan - BL",
    "Personal Loan - PL",
    "Credit Card",
    "Current Account",
    "Saving Account",
    "Construction Equipment Loan",
    "Commercial Vehicle Loan"
];

const PIPELINE_STAGES = [
    "Document Collection", "Proposal Preparation", "Login Desk",
    "Query", "Query Resolution", "Approved", "Disbursed", "PDD", "Won", "Lost"
];

function createMcpServer(context: { orgId?: string; userId?: string }): Server {
    const server = new Server(
        { name: "agentone-crm-mcp", version: "2.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: "smartSearch",
                description: "Universal Data Engine: Search across Leads, Proposals (Opportunities), Clients (Accounts), Contacts, and Activities. Returns data rows or aggregated analytical data if 'groupBy' is used.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search term for name, phone, email, etc." },
                        entityTypes: { type: "array", items: { type: "string", enum: ["all", "lead", "opportunity", "account", "contact", "activity"] }, description: "Entities to search. 'all' searches everything." },
                        filters: {
                            type: "object",
                            description: "Dynamic filters. Keys can be any valid entity attribute (e.g., loanAmount, city, stage, bank, zone, applicantType). Values can be string, number, or array of strings.",
                            additionalProperties: {}
                        },
                        groupBy: { type: "string", description: "If provided, returns aggregated metrics grouped by this attribute instead of individual rows. E.g., 'stage', 'bank', 'leadSource', 'loanType'." },
                        limit: { type: "integer", default: 10 }
                    }
                }
            },
            {
                name: "getDashboard",
                description: "Advanced Analytics for DSA: Pipeline metrics, Disbursed Volume, and Bank-wise status for a user or team. Can optionally group data.",
                inputSchema: {
                    type: "object",
                    properties: {
                        timeRange: { type: "string", enum: ["today", "week", "month", "quarter", "year", "all"], default: "week" },
                        userId: { type: "string" },
                        groupBy: { type: "string", description: "If provided, groups pipeline metrics by this dimension. E.g., 'stage', 'bank', 'loanType', 'leadSource'." }
                    }
                }
            },
            {
                name: "scheduleActivity",
                description: "Create a follow-up call/meeting/task. Time is natural language: 'tomorrow 3pm', 'in 2 hours'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        subject: { type: "string" },
                        when: { type: "string" },
                        activityType: { type: "string", enum: ["CALL", "MEETING", "EMAIL", "TASK"], default: "CALL" },
                        priority: { type: "string", enum: ["HIGH", "NORMAL", "LOW"], default: "NORMAL" },
                        description: { type: "string" },
                        relatedTo: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["lead", "opportunity", "account", "contact"] },
                                id: { type: "string" }
                            }
                        }
                    },
                    required: ["subject", "when"]
                }
            },
            {
                name: "getUpcomingActivities",
                description: "Get open activities due in the next N days.",
                inputSchema: {
                    type: "object",
                    properties: {
                        days: { type: "integer", default: 7 },
                        limit: { type: "integer", default: 20 }
                    }
                }
            },
            {
                name: "getOverdueActivities",
                description: "Get open activities past their due date.",
                inputSchema: {
                    type: "object",
                    properties: { limit: { type: "integer", default: 20 } }
                }
            },
            {
                name: "getNotes",
                description: "Read notes on a lead, opportunity, account, contact, or case.",
                inputSchema: {
                    type: "object",
                    properties: {
                        entityType: { type: "string", enum: ["lead", "opportunity", "account", "contact", "case"] },
                        entityId: { type: "string" },
                        limit: { type: "integer", default: 10 }
                    },
                    required: ["entityType", "entityId"]
                }
            },
            {
                name: "createNote",
                description: "Save a call note or bank query on a lead/opportunity. E.g. 'HDFC query: income proof mismatch'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        entityType: { type: "string", enum: ["lead", "opportunity", "account", "contact", "case"] },
                        entityId: { type: "string" },
                        content: { type: "string" },
                        tags: { type: "string", description: "Comma-separated: 'bank-query,cibil,document'" }
                    },
                    required: ["entityType", "entityId", "content"]
                }
            },
            {
                name: "getPipelineByStage",
                description: "View active loan files by stage and/or loan type. Returns stage summary + total pipeline value.",
                inputSchema: {
                    type: "object",
                    properties: {
                        stage: { type: "string", enum: PIPELINE_STAGES },
                        loanType: { type: "string" },
                        ownerId: { type: "string", description: "'mine' or userId" },
                        limit: { type: "integer", default: 20 }
                    }
                }
            },
            {
                name: "updateOpportunityStage",
                description: "Move a loan file to a new stage. Optionally log a reason as a note.",
                inputSchema: {
                    type: "object",
                    properties: {
                        opportunityId: { type: "string" },
                        newStage: { type: "string", enum: PIPELINE_STAGES },
                        note: { type: "string", description: "Optional reason (saved as note)" }
                    },
                    required: ["opportunityId", "newStage"]
                }
            },
            {
                name: "getBankFiles",
                description: "Find loan files submitted to a bank, optionally filtered by stage. E.g. all HDFC files in Query.",
                inputSchema: {
                    type: "object",
                    properties: {
                        bankName: { type: "string", description: "Partial match: 'HDFC', 'Axis', 'SBI'" },
                        stage: { type: "string", enum: PIPELINE_STAGES },
                        limit: { type: "integer", default: 20 }
                    },
                    required: ["bankName"]
                }
            },
            {
                name: "updateLeadStatus",
                description: "Update lead status (New/Qualified/Closed) or rating (Hot/Warm/Cold) after a call.",
                inputSchema: {
                    type: "object",
                    properties: {
                        leadId: { type: "string" },
                        status: { type: "string", enum: ["New", "In Progress", "Qualified", "Closed"] },
                        rating: { type: "string", enum: ["Hot", "Warm", "Cold"] }
                    },
                    required: ["leadId"]
                }
            },
            {
                name: "convertLeadToOpportunity",
                description: "Convert a qualified lead into an active loan file. Stage defaults to Document Collection.",
                inputSchema: {
                    type: "object",
                    properties: {
                        leadId: { type: "string" },
                        loanType: { type: "string", enum: LOAN_TYPES },
                        estimatedRevenue: { type: "string", description: "Loan amount in INR e.g. '5000000'" },
                        estimatedCloseDate: { type: "string", description: "YYYY-MM-DD (defaults 90 days)" },
                        banks: { type: "array", items: { type: "string" }, description: "Bank names to link" }
                    },
                    required: ["leadId", "loanType", "estimatedRevenue"]
                }
            },
            {
                name: "getCases",
                description: "Get service/support cases filtered by status or priority.",
                inputSchema: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: ["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed", "Cancelled"] },
                        priority: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
                        limit: { type: "integer", default: 10 }
                    }
                }
            },
            {
                name: "createLead",
                description: "Create a new loan lead in the CRM after gathering info from the customer. Ask for fullName, phone, and loanType before calling. Automatically checks for duplicate phone numbers.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fullName: { type: "string", description: "Customer's full name" },
                        phone: { type: "string", description: "Mobile number (10 digits)" },
                        loanType: { type: "string", enum: LOAN_TYPES, description: "Type of loan required" },
                        loanAmount: { type: "string", description: "Loan amount in INR (e.g. '5000000' for ₹50L)" },
                        email: { type: "string", description: "Email address (optional)" },
                        city: { type: "string", default: "Pune", description: "Customer's city" },
                        state: { type: "string", default: "Maharashtra", description: "Customer's state" },
                        zone: { type: "string", description: "Zone or area" },
                        taluka: { type: "string", description: "Taluka (for rural leads)" },
                        village: { type: "string", description: "Village name" },
                        pincode: { type: "string", description: "PIN code" },
                        leadSource: { type: "string", description: "How did they contact us? e.g. 'Referral', 'WhatsApp', 'Walk-in', 'Direct'" },
                        rating: { type: "string", enum: ["Hot", "Warm", "Cold"], description: "Lead quality based on urgency. Default: Cold" },
                        description: { type: "string", description: "Additional notes about this lead" }
                    },
                    required: ["fullName", "phone", "loanType"]
                }
            },
            {
                name: "listUsers",
                description: "List active users in the current organization for reassignment.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "reassignEntity",
                description: "Change ownership of a Lead, Opportunity, Activity, or Note. Automatically notifies the new owner.",
                inputSchema: {
                    type: "object",
                    properties: {
                        entityType: { type: "string", enum: ["lead", "opportunity", "activity", "note"] },
                        entityId: { type: "string" },
                        newOwnerId: { type: "string", description: "The userId of the new owner." },
                        reason: { type: "string", description: "Reason for the transfer (optional)" }
                    },
                    required: ["entityType", "entityId", "newOwnerId"]
                }
            },
            {
                name: "qualifyLead",
                description: "Qualify a lead, marking it as ready for conversion. Updates status and wasQualified flag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        leadId: { type: "string" },
                        notes: { type: "string", description: "Qualification notes (income, verification, etc.)" }
                    },
                    required: ["leadId"]
                }
            },
            {
                name: "exportPipelineToExcel",
                description: "Generate a professional XLSX pipeline dashboard/report. Returns a download link.",
                inputSchema: {
                    type: "object",
                    properties: {
                        loanType: { type: "string", enum: LOAN_TYPES },
                        timeRange: { type: "string", description: "Description of window e.g. 'this month', 'all time'" }
                    }
                }
            },
            {
                name: "learnAgentSkill",
                description: "Teach the agent a new multi-step skill or persistent knowledge recipe. Use this after a complex task is successfully solved.",
                inputSchema: {
                    type: "object",
                    properties: {
                        skillName: { type: "string", description: "Unique internal name for the skill." },
                        description: { type: "string", description: "What this skill accomplishes." },
                        instructions: { type: "string", description: "The detailed steps, markdown recipes, or logic to remember." },
                        triggerKeywords: { type: "string", description: "Comma-separated words that should trigger this skill search." }
                    },
                    required: ["skillName", "instructions"]
                }
            },
            {
                name: "findAgentSkills",
                description: "Search for previously learned skills or specialized knowledge to help solve the current user request.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Keyword or name to search for." }
                    }
                }
            },
            {
                name: "createOpportunity",
                description: "Create a new opportunity directly without converting from a lead.",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        stageId: { type: "string", enum: PIPELINE_STAGES, default: "Document Collection" },
                        loanType: { type: "string", enum: LOAN_TYPES },
                        loanAmount: { type: "string", description: "Loan amount requested" },
                        estimatedRevenue: { type: "string", description: "Estimated revenue from loan" },
                        estimatedCloseDate: { type: "string", description: "YYYY-MM-DD" },
                        accountId: { type: "string", description: "Account/Company ID to associate" },
                        contactId: { type: "string", description: "Contact ID to associate" },
                        banks: { type: "array", items: { type: "string" }, description: "Associated bank names" },
                        description: { type: "string" }
                    },
                    required: ["title", "loanType"]
                }
            },
            {
                name: "updateLead",
                description: "Update general fields and details of an existing Lead.",
                inputSchema: {
                    type: "object",
                    properties: {
                        leadId: { type: "string" },
                        fullName: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        loanType: { type: "string", enum: LOAN_TYPES },
                        loanAmount: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        status: { type: "string", enum: ["New", "In Progress", "Qualified", "Closed"] },
                        rating: { type: "string", enum: ["Hot", "Warm", "Cold"] },
                        description: { type: "string" }
                    },
                    required: ["leadId"]
                }
            },
            {
                name: "updateOpportunity",
                description: "Update general fields and details of an existing Opportunity.",
                inputSchema: {
                    type: "object",
                    properties: {
                        opportunityId: { type: "string" },
                        title: { type: "string" },
                        stage: { type: "string", enum: PIPELINE_STAGES },
                        status: { type: "string", enum: ["Active", "Won", "Lost"] },
                        loanType: { type: "string", enum: LOAN_TYPES },
                        loanAmount: { type: "string" },
                        estimatedRevenue: { type: "string" },
                        estimatedCloseDate: { type: "string" },
                        description: { type: "string" }
                    },
                    required: ["opportunityId"]
                }
            }
        ]
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const args = request.params.arguments || {};
            let result: any;
            switch (request.params.name) {
                case "smartSearch": result = await unifiedService.smartSearch(args, context); break;
                case "getDashboard": result = await unifiedService.getDashboard(args, context); break;
                case "scheduleActivity": result = await unifiedService.scheduleActivity(args, context); break;
                case "getUpcomingActivities": result = await unifiedService.getUpcomingActivities(args, context); break;
                case "getOverdueActivities": result = await unifiedService.getOverdueActivities(args, context); break;
                case "getNotes": result = await unifiedService.getNotes(args, context); break;
                case "createNote": result = await unifiedService.createNote(args, context); break;
                case "getPipelineByStage": result = await unifiedService.getPipelineByStage(args, context); break;
                case "updateOpportunityStage": result = await unifiedService.updateOpportunityStage(args, context); break;
                case "getBankFiles": result = await unifiedService.getBankFiles(args, context); break;
                case "updateLeadStatus": result = await unifiedService.updateLeadStatus(args, context); break;
                case "convertLeadToOpportunity": result = await unifiedService.convertLeadToOpportunity(args, context); break;
                case "getCases": result = await unifiedService.getCases(args, context); break;
                case "createLead": result = await unifiedService.createLead(args, context); break;
                case "listUsers": result = await unifiedService.listUsers(args, context); break;
                case "reassignEntity": result = await unifiedService.reassignEntity(args, context); break;
                case "qualifyLead": result = await unifiedService.qualifyLead(args, context); break;
                case "exportPipelineToExcel": result = await unifiedService.exportPipelineToExcel(args, context); break;
                case "learnAgentSkill": result = await unifiedService.learnAgentSkill(args, context); break;
                case "findAgentSkills": result = await unifiedService.findAgentSkills(args, context); break;
                case "createOpportunity": result = await unifiedService.createOpportunity(args, context); break;
                case "updateLead": result = await unifiedService.updateLead(args, context); break;
                case "updateOpportunity": result = await unifiedService.updateOpportunity(args, context); break;
                default: throw new Error(`Unknown tool: ${request.params.name}`);
            }
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
            return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
        }
    });

    return server;
}

// ─── GET /sse ─────────────────────────────────────────────────────────────────
// n8n sometimes probes GET /sse as a health check before sending POST initialize.
// Return a valid SSE keepalive stream so it doesn't get 400.
// If a Mcp-Session-Id header is present, route to that session's transport.
mcpRouter.get("/sse", async (req: AuthenticatedRequest, res: express.Response) => {
    const headerSessionId = req.headers["mcp-session-id"] as string | undefined;

    if (headerSessionId && activeSessions.has(headerSessionId)) {
        // Route to existing session for server-sent notifications
        const session = activeSessions.get(headerSessionId)!;
        await session.transport.handleRequest(req as any, res, req.body);
        return;
    }

    // No session yet — return a valid SSE stream (keepalive ping)
    // This satisfies n8n's connectivity check without erroring.
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
    });
    res.write(": mcp-ready\n\n");

    const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);
    res.on("close", () => clearInterval(keepAlive));
});

// ─── POST /sse ─────────────────────────────────────────────────────────────────
// n8n uses Streamable HTTP: POST /sse (no sessionId) for initialize,
// then POST /sse with Mcp-Session-Id header for tool calls.
mcpRouter.post("/sse", async (req: AuthenticatedRequest, res: express.Response) => {
    const context = {
        orgId: req.apiKey?.organisationId || req.user?.organizationId || undefined,
        userId: req.user?.userId || undefined
    };

    const headerSessionId = req.headers["mcp-session-id"] as string | undefined;

    if (headerSessionId && activeSessions.has(headerSessionId)) {
        // Existing session — route directly
        const session = activeSessions.get(headerSessionId)!;
        await session.transport.handleRequest(req as any, res, req.body);
        return;
    }

    // New session — create Server + StreamableHTTP transport
    const server = createMcpServer(context);
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
            activeSessions.set(newSessionId, { server, transport, context });
            console.log(`[MCP] Session created: ${newSessionId} (org: ${context.orgId}, active: ${activeSessions.size})`);
        }
    });

    transport.onclose = () => {
        const sid = (transport as any).sessionId;
        if (sid) {
            activeSessions.delete(sid);
            console.log(`[MCP] Session closed: ${sid} (active: ${activeSessions.size})`);
        }
    };

    await server.connect(transport);
    await transport.handleRequest(req as any, res, req.body);
});

// ─── POST /messages — backward compat ─────────────────────────────────────────
mcpRouter.post("/messages", async (req: AuthenticatedRequest, res: express.Response) => {
    const headerSessionId = req.headers["mcp-session-id"] as string | undefined;
    const querySessionId = req.query.sessionId as string | undefined;
    const sessionId = headerSessionId || querySessionId;

    if (!sessionId) { res.status(400).json({ error: "Missing Mcp-Session-Id header or ?sessionId param." }); return; }
    const session = activeSessions.get(sessionId);
    if (!session) { res.status(404).json({ error: `Session not found: ${sessionId}` }); return; }
    await session.transport.handleRequest(req as any, res, req.body);
});
