import { Router } from "express";
import { apiKeyAuth } from "../middlewares/apiKey.middleware";
import UnifiedController from "../controllers/unified.controller";

const router = Router();
const controller = new UnifiedController();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: API key for WhatsApp automation and external integrations
 *   schemas:
 *     SearchRequest:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Search query (phone, email, name)
 *           example: "9876543210"
 *         entityTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [all, lead, opportunity, account, contact]
 *           example: ["lead", "opportunity"]
 *         filters:
 *           type: object
 *           properties:
 *             ownerId:
 *               type: string
 *               description: Filter by owner ("mine" or specific user ID)
 *               example: "mine"
 *             status:
 *               type: string
 *               example: "NEW"
 *             rating:
 *               type: string
 *               example: "HOT"
 *             stage:
 *               type: string
 *               example: "DOCUMENT_COLLECTION"
 *         limit:
 *           type: integer
 *           default: 10
 *           example: 5
 *     SearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             leads:
 *               type: array
 *               items:
 *                 type: object
 *             opportunities:
 *               type: array
 *               items:
 *                 type: object
 *             accounts:
 *               type: array
 *               items:
 *                 type: object
 *             contacts:
 *               type: array
 *               items:
 *                 type: object
 *     DashboardResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             timeRange:
 *               type: string
 *               example: "week"
 *             leads:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 new:
 *                   type: integer
 *                 qualified:
 *                   type: integer
 *                 hot:
 *                   type: integer
 *             opportunities:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 active:
 *                   type: integer
 *                 won:
 *                   type: integer
 *                 lost:
 *                   type: integer
 *                 pipelineValue:
 *                   type: number
 *             activities:
 *               type: object
 *               properties:
 *                 upcoming:
 *                   type: integer
 *                 overdue:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *             summary:
 *               type: object
 *               properties:
 *                 conversionRate:
 *                   type: string
 *                 winRate:
 *                   type: string
 *     ScheduleActivityRequest:
 *       type: object
 *       required:
 *         - subject
 *         - when
 *       properties:
 *         subject:
 *           type: string
 *           example: "Call Rajesh about home loan"
 *         when:
 *           type: string
 *           description: Natural language time ("tomorrow 3pm", "in 2 hours", "next week")
 *           example: "tomorrow 3pm"
 *         activityType:
 *           type: string
 *           enum: [CALL, MEETING, EMAIL, TASK]
 *           default: CALL
 *         priority:
 *           type: string
 *           enum: [HIGH, NORMAL, LOW]
 *           default: NORMAL
 *         description:
 *           type: string
 *           example: "Discuss home loan requirements and documentation"
 *         relatedTo:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [lead, opportunity, account, contact]
 *               example: "lead"
 *             id:
 *               type: string
 *               example: "lead_123"
 */

/**
 * @swagger
 * tags:
 *   - name: WhatsApp AI Agent
 *     description: Unified API endpoints for WhatsApp automation and AI agent access
 */

/**
 * @swagger
 * /api/unified/search:
 *   post:
 *     summary: Smart search across all CRM entities
 *     description: Search for leads, opportunities, accounts, or contacts using phone, email, or name. Automatically handles encrypted data.
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *           examples:
 *             searchByPhone:
 *               summary: Search by phone number
 *               value:
 *                 query: "9876543210"
 *                 entityTypes: ["lead"]
 *                 limit: 10
 *             searchHotLeads:
 *               summary: Find hot leads in specific city
 *               value:
 *                 query: "Pune"
 *                 entityTypes: ["lead"]
 *                 filters:
 *                   rating: "HOT"
 *                   ownerId: "mine"
 *                 limit: 5
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       401:
 *         description: Invalid or missing API key
 */
router.post("/search", apiKeyAuth, controller.smartSearch.bind(controller));

/**
 * @swagger
 * /api/unified/dashboard:
 *   get:
 *     summary: Get dashboard metrics and analytics
 *     description: Returns comprehensive dashboard data including leads, opportunities, activities metrics for specified time range
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: week
 *         description: Time range for metrics
 *         example: week
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by specific user (for managers)
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *             example:
 *               success: true
 *               message: "Dashboard data retrieved"
 *               data:
 *                 timeRange: "week"
 *                 leads:
 *                   total: 47
 *                   new: 12
 *                   qualified: 8
 *                   hot: 15
 *                 opportunities:
 *                   total: 21
 *                   active: 18
 *                   won: 2
 *                   lost: 1
 *                   pipelineValue: 32500000
 *                 activities:
 *                   upcoming: 23
 *                   overdue: 5
 *                   completed: 45
 *                 summary:
 *                   conversionRate: "17.02"
 *                   winRate: "66.67"
 *       401:
 *         description: Invalid or missing API key
 */
router.get("/dashboard", apiKeyAuth, controller.getDashboard.bind(controller));

/**
 * @swagger
 * /api/unified/activities/schedule:
 *   post:
 *     summary: Schedule an activity with natural language time
 *     description: Create a new activity (call, meeting, email, task) using natural language time expressions like "tomorrow 3pm", "in 2 hours", "next week"
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleActivityRequest'
 *           examples:
 *             callTomorrow:
 *               summary: Schedule call for tomorrow afternoon
 *               value:
 *                 subject: "Call Rajesh about home loan"
 *                 when: "tomorrow 3pm"
 *                 activityType: "CALL"
 *                 priority: "NORMAL"
 *             meetingNextWeek:
 *               summary: Schedule meeting next week
 *               value:
 *                 subject: "Property valuation meeting"
 *                 when: "next week"
 *                 activityType: "MEETING"
 *                 priority: "HIGH"
 *                 relatedTo:
 *                   type: "opportunity"
 *                   id: "opp_456"
 *     responses:
 *       201:
 *         description: Activity scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activity scheduled"
 *                 data:
 *                   type: object
 *       401:
 *         description: Invalid or missing API key
 */
router.post("/activities/schedule", apiKeyAuth, controller.scheduleActivity.bind(controller));

/**
 * @swagger
 * /api/unified/activities/upcoming:
 *   get:
 *     summary: Get upcoming activities
 *     description: Retrieve open activities due in the next X days
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead
 *         example: 7
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *         example: 20
 *     responses:
 *       200:
 *         description: List of upcoming activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Invalid or missing API key
 */
router.get("/activities/upcoming", apiKeyAuth, controller.getUpcomingActivities.bind(controller));

/**
 * @swagger
 * /api/unified/activities/overdue:
 *   get:
 *     summary: Get overdue activities
 *     description: Retrieve open activities that are past their due date
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *         example: 20
 *     responses:
 *       200:
 *         description: List of overdue activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Invalid or missing API key
 */
router.get("/activities/overdue", apiKeyAuth, controller.getOverdueActivities.bind(controller));

/**
 * @swagger
 * /api/unified/leads:
 *   post:
 *     summary: Create a new lead
 *     description: Create a lead from WhatsApp or other sources
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 example: "rajesh@example.com"
 *               loanType:
 *                 type: string
 *                 example: "LAP"
 *               loanAmount:
 *                 type: string
 *                 example: "50 lakh"
 *               city:
 *                 type: string
 *                 example: "Pune"
 *               zone:
 *                 type: string
 *               village:
 *                 type: string
 *               taluka:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       401:
 *         description: Invalid or missing API key
 */
router.post("/leads", apiKeyAuth, controller.createLead.bind(controller));

/**
 * @swagger
 * /api/unified/leads/{leadId}:
 *   put:
 *     summary: Update an existing lead
 *     description: Update lead details like rating, status, loan info
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: string
 *                 enum: [HOT, WARM, COLD]
 *               status:
 *                 type: string
 *               loanType:
 *                 type: string
 *               loanAmount:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       404:
 *         description: Lead not found
 */
router.put("/leads/:leadId", apiKeyAuth, controller.updateLead.bind(controller));

/**
 * @swagger
 * /api/unified/leads/{leadId}/qualify:
 *   post:
 *     summary: Qualify a lead into an opportunity
 *     description: Convert lead to opportunity when qualified
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estimatedRevenue:
 *                 type: string
 *               estimatedCloseDate:
 *                 type: string
 *                 format: date
 *               stage:
 *                 type: string
 *                 example: "DOCUMENT_COLLECTION"
 *     responses:
 *       201:
 *         description: Lead qualified to opportunity
 *       404:
 *         description: Lead not found
 */
router.post("/leads/:leadId/qualify", apiKeyAuth, controller.qualifyLead.bind(controller));

/**
 * @swagger
 * /api/unified/opportunities/{opportunityId}:
 *   put:
 *     summary: Update an opportunity
 *     description: Update opportunity stage, status, or other details
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: opportunityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [DOCUMENT_COLLECTION, PDD, LOGIN, SANCTION, DISBURSED]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, WON, LOST]
 *               priority:
 *                 type: string
 *               estimatedRevenue:
 *                 type: string
 *               wonReason:
 *                 type: string
 *               lostReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Opportunity updated successfully
 *       404:
 *         description: Opportunity not found
 */
router.put("/opportunities/:opportunityId", apiKeyAuth, controller.updateOpportunity.bind(controller));

/**
 * @swagger
 * /api/unified/team/performance:
 *   get:
 *     summary: Get team performance metrics (managers only)
 *     description: View aggregate metrics for all team members
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter]
 *           default: week
 *     responses:
 *       200:
 *         description: Team performance data
 *       403:
 *         description: Access denied. Managers only
 */
router.get("/team/performance", apiKeyAuth, controller.getTeamPerformance.bind(controller));

/**
 * @swagger
 * /api/unified/bulk-assign:
 *   post:
 *     summary: Bulk assign leads or opportunities (managers only)
 *     description: Reassign multiple items to a new owner
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityIds
 *               - newOwnerId
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [lead, opportunity]
 *               entityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["lead_123", "lead_456"]
 *               newOwnerId:
 *                 type: string
 *                 example: "user_789"
 *     responses:
 *       200:
 *         description: Bulk assignment successful
 *       403:
 *         description: Access denied. Managers only
 */
router.post("/bulk-assign", apiKeyAuth, controller.bulkAssign.bind(controller));

/**
 * @swagger
 * /api/unified/notifications:
 *   post:
 *     summary: Send notifications to users
 *     description: Send alerts or messages to team members
 *     tags:
 *       - WhatsApp AI Agent
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientIds
 *               - message
 *             properties:
 *               recipientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user_123", "user_456"]
 *               message:
 *                 type: string
 *                 example: "New hot lead assigned to you"
 *               priority:
 *                 type: string
 *                 enum: [HIGH, NORMAL, LOW]
 *                 default: NORMAL
 *     responses:
 *       200:
 *         description: Notifications sent successfully
 */
router.post("/notifications", apiKeyAuth, controller.sendNotification.bind(controller));

export default router;
