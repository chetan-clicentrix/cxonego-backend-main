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
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as express from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { UnifiedService } from "../services/unified.service";

// Define the express Router
export const mcpRouter = express.Router();

const unifiedService = new UnifiedService();

// ─── Session Registry ────────────────────────────────────────────────────────
// Map of sessionId → { transport, context }
// Supports multiple concurrent connections (e.g. n8n with 3 sub-agents)
const activeSessions = new Map<string, {
    transport: SSEServerTransport;
    context: { orgId?: string; userId?: string };
}>();

// ─── MCP Server Factory ──────────────────────────────────────────────────────
// Each SSE connection gets its OWN Server instance to avoid "Already connected" error
function createMcpServer(context: { orgId?: string; userId?: string }): Server {
    const server = new Server(
        { name: "agentone-crm-mcp", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    // List all available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "smartSearch",
                    description: "Smart search across Leads, Opportunities, Accounts, or Contacts using phone, email, or name. Automatically handles encrypted data.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query (phone, email, name)" },
                            entityTypes: {
                                type: "array",
                                items: { type: "string", enum: ["all", "lead", "opportunity", "account", "contact"] },
                                description: "Entities to search inside"
                            },
                            filters: {
                                type: "object",
                                properties: {
                                    ownerId: { type: "string", description: "Filter by owner ('mine' or specific user ID)" },
                                    status: { type: "string" },
                                    rating: { type: "string" },
                                    stage: { type: "string" }
                                }
                            },
                            limit: { type: "integer", default: 10 }
                        }
                    }
                },
                {
                    name: "getDashboard",
                    description: "Get comprehensive dashboard data including leads, opportunities, activities metrics for specified time range",
                    inputSchema: {
                        type: "object",
                        properties: {
                            timeRange: { type: "string", enum: ["today", "week", "month", "quarter", "year"], default: "week" },
                            userId: { type: "string", description: "Filter by specific user (for managers)" }
                        }
                    }
                },
                {
                    name: "scheduleActivity",
                    description: "Create a new activity (call, meeting, email, task) using natural language time expressions like 'tomorrow 3pm', 'in 2 hours', 'next week'",
                    inputSchema: {
                        type: "object",
                        properties: {
                            subject: { type: "string" },
                            when: { type: "string", description: "Natural language time" },
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
                    description: "Retrieve open activities due in the next X days",
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
                    description: "Retrieve open activities that are past their due date",
                    inputSchema: {
                        type: "object",
                        properties: {
                            limit: { type: "integer", default: 20 }
                        }
                    }
                }
            ]
        };
    });

    // Handle tool calls — context is captured per-connection via closure
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            let result: any;
            switch (request.params.name) {
                case "smartSearch":
                    result = await unifiedService.smartSearch(request.params.arguments || {}, context);
                    break;
                case "getDashboard":
                    result = await unifiedService.getDashboard(request.params.arguments || {}, context);
                    break;
                case "scheduleActivity":
                    result = await unifiedService.scheduleActivity(request.params.arguments || {}, context);
                    break;
                case "getUpcomingActivities":
                    result = await unifiedService.getUpcomingActivities(request.params.arguments || {}, context);
                    break;
                case "getOverdueActivities":
                    result = await unifiedService.getOverdueActivities(request.params.arguments || {}, context);
                    break;
                default:
                    throw new Error(`Tool not found: ${request.params.name}`);
            }
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        } catch (err: any) {
            return {
                content: [{ type: "text", text: `Error: ${err.message}` }],
                isError: true
            };
        }
    });

    return server;
}

// ─── SSE Endpoint ────────────────────────────────────────────────────────────
// n8n/AI agents connect here to open a persistent SSE stream
mcpRouter.get("/sse", async (req: AuthenticatedRequest, res: express.Response) => {
    // Capture auth context from API key middleware
    const context = {
        orgId: req.apiKey?.organisationId || req.user?.organizationId || undefined,
        userId: req.user?.userId || undefined
    };

    // Create a fresh Server instance for this connection
    const serverInstance = createMcpServer(context);
    const transport = new SSEServerTransport("/api/v1/api/mcp/messages", res);

    await serverInstance.connect(transport);

    const sessionId = transport.sessionId;
    activeSessions.set(sessionId, { transport, context });

    console.log(`[MCP] New SSE session: ${sessionId} | orgId: ${context.orgId} | active sessions: ${activeSessions.size}`);

    // Clean up when client disconnects
    res.on("close", () => {
        activeSessions.delete(sessionId);
        console.log(`[MCP] Session closed: ${sessionId} | remaining: ${activeSessions.size}`);
    });
});

// ─── Messages Endpoint ───────────────────────────────────────────────────────
// n8n posts JSON-RPC tool calls here, routed by sessionId
mcpRouter.post("/messages", async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
        res.status(400).send(`No active SSE session for sessionId: ${sessionId}`);
        return;
    }

    await session.transport.handlePostMessage(req, res, req.body);
});

