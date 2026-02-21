import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as express from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { UnifiedService } from "../services/unified.service";

// Define the express Router
export const mcpRouter = express.Router();

let transport: SSEServerTransport | null = null;
const unifiedService = new UnifiedService();

// Create the MCP server
const server = new Server(
    {
        name: "agentone-crm-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define tools
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

// Use a simple map to store the context for the active SSE session.
// In a full production setup with multiple concurrent SSEs, you might need a way to pass
// Context down more elegantly (e.g., via session IDs). Because SSEServerTransport handles one
// persistent connection to standard out, we'll store the context in a module variable when SSE is opened.
let activeContext: { orgId?: string, userId?: string } = {};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        let result: any;
        switch (request.params.name) {
            case "smartSearch":
                result = await unifiedService.smartSearch(request.params.arguments || {}, activeContext);
                break;
            case "getDashboard":
                result = await unifiedService.getDashboard(request.params.arguments || {}, activeContext);
                break;
            case "scheduleActivity":
                result = await unifiedService.scheduleActivity(request.params.arguments || {}, activeContext);
                break;
            case "getUpcomingActivities":
                result = await unifiedService.getUpcomingActivities(request.params.arguments || {}, activeContext);
                break;
            case "getOverdueActivities":
                result = await unifiedService.getOverdueActivities(request.params.arguments || {}, activeContext);
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

// The SSE endpoint N8n will connect to
mcpRouter.get("/sse", async (req: AuthenticatedRequest, res: express.Response) => {
    // Populate active context from middleware (Firebase or API Key)
    activeContext = {
        orgId: req.apiKey?.organisationId || req.user?.organizationId || undefined,
        userId: req.user?.userId || undefined
    };

    transport = new SSEServerTransport("/api/mcp/messages", res);
    await server.connect(transport);

    // Provide the required onclose handler explicitly if not done by transport itself
    res.on("close", () => {
        if (transport) {
            console.log("MCP SSE Client disconnected");
        }
    });
});

mcpRouter.post("/messages", async (req: express.Request, res: express.Response) => {
    if (!transport) {
        res.status(400).send("No active SSE connection");
        return;
    }
    await transport.handlePostMessage(req, res);
});
