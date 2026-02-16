import { Request, Response } from "express";
import { errorHandler } from "../common/errors";
import { AuditServices } from "../services/audit.service";
import { makeResponse } from "../common/utils";
import { request } from "http";
import { AuthenticatedRequest } from "../interfaces/types";
const auditServices = new AuditServices();
export class AuditController {
  async getAccountAudits(request: AuthenticatedRequest, response: Response) {
    try {
      // const userId: string = request.user.userId;
      const accountId: string = request.params.accountId;
      const audit = await auditServices.getAccountAudits(accountId);
      if (audit.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Accounts audit not found",
          []
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Accounts audit fetched successfully",
        audit
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getContactAudits(request: AuthenticatedRequest, response: Response) {
    const contactId: string = request.params.contactId;
    // const userId: string = request.user.userId;
    try {
      const audit = await auditServices.getContactAudits(contactId);
      if (audit.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Contact audit not found",
          []
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Contact audit fetched successfully",
        audit
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getLeadAudits(request: AuthenticatedRequest, response: Response) {
    try {
      // const userId: string = request.user.userId;
      const leadId: string = request.params.leadId;
      const audit = await auditServices.getLeadAudits(leadId);

      if (audit.length == 0) {
        return makeResponse(response, 200, false, "Lead audit not found", []);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead audit fetched successfully",
        audit
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getOpportunityAudits(request: AuthenticatedRequest, response: Response) {
    try {
      // const userId: string = request.user.userId;
      const opportunityId: string = request.params.opportunityId;
      const audit = await auditServices.getOpportunityAudits(
        // userId,
        opportunityId
      );
      if (audit.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity audit not found",
          []
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Opportunity audit fetched successfully",
        audit
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getSubscriptionAudits(request: Request, response: Response) {
    try {
      const subscriptionId = request.params.subscriptionId;
      const audit = await auditServices.getSubscriptionAudits(
        subscriptionId
      );
      if (audit.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Subscripitions audit not found",
          []
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscripitions Audit fetched successfully.",
        audit
      );
    } catch (error) {
      errorHandler(response, error);
    }
  }
}
