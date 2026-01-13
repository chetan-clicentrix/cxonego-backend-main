import { Router } from "express";

import authRouter from "./auth.routes";
import emailPOC from "./email-poc.routes";
import leadRouter from "./lead.routes";
import accountRouter from "./account.routes";
import userRouter from "./user.routes";
import contactRouter from "./contact.routes";
import roleRouter from "./role.routes";
import servicesRouter from "./services.routes";
import oppurtunityRouter from "./oppurtunity.routes";
import moodRouter from "./mood.routes";
import activityRouter from "./activity.routes";
import dashboardRouter from "./dashboard.routes";
import auditRouter from "./audit.routes";
import calenderRouter from "./calender.routes";
import organizationRouter from "./organization.routes";
import referRouter from "./refer.routes";
import noteRouter from "./note.routes";
import healthRouter from "./health.routes";
import planRouter from "./plan.routes";
import subscriptionRouter from "./subscription.routes";
import caseRouter from "./case.routes";
import technicianRouter from "./technician.routes";
import assignmentRouter from "./ticketAssignment.routes";
import customPlanRequestRouter from "./customPlanRequest.routes";
import superAdminRouter from "./superAdmin.routes";
import cronRouter from "./cron.routes";
import leadAssignmentRouter from "./leadAssignment.routes";
import documentRouter from "./document.routes";
import sharepointRouter from "./sharepoint.routes";
import leadRoutingConfigRouter from "./leadRoutingConfig.routes";
import bankRouter from "./bank.routes";
import bankDocConfigRouter from "./bankDocumentConfig.routes";
import skillRouter from "./skill.routes";

const router = Router({ mergeParams: true });
router.use("/leadRoutingConfig", leadRoutingConfigRouter);
router.use("/leadAssignment", leadAssignmentRouter)
router.use("/auth", authRouter)
router.use("/lead", leadRouter);
router.use("/contact", contactRouter);
router.use("/account", accountRouter);
router.use("/users/auth", authRouter);
router.use("/email-poc", emailPOC);
router.use("/users/role", roleRouter);
router.use("/users", userRouter);
router.use("/services", servicesRouter);
router.use("/opportunity", oppurtunityRouter);
router.use("/moodimage", moodRouter);
router.use("/activity", activityRouter);
router.use("/dashboard", dashboardRouter);
router.use("/audit", auditRouter);
router.use("/calender", calenderRouter);
router.use("/organization", organizationRouter);
router.use("/refer", referRouter);
router.use("/note", noteRouter);
router.use("/health", healthRouter);
router.use("/plan", planRouter);
router.use("/subscription", subscriptionRouter);
router.use("/customPlanRequest", customPlanRequestRouter);
router.use("/superAdmin", superAdminRouter);
router.use("/cron", cronRouter)
router.use("/document", documentRouter)
router.use("/sharepoint", sharepointRouter)
router.use("/skills", skillRouter);
router.use("/bank", bankRouter);
router.use("/bank-config", bankDocConfigRouter);

// Case Management Module
router.use("/cases", caseRouter);
router.use("/technicians", technicianRouter);
router.use("/assignments", assignmentRouter);

export default router;
