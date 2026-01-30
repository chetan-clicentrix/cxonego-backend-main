import { Request, Response } from "express";
import { makeResponse, decrypt } from "../common/utils";
import LeadService from "../services/lead.service";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";

const leadService = new LeadService();
class LeadController {
  /**
   * Asynchronously controller help creates a lead.
   *
   * @param {CustomRequest} request - the custom request object
   * @param {Response} response - the response object
   * @return {Promise<number | Response<any, Record<string, any>>>} the created lead or a response with an error
   */

  async getAllLeads(request: AuthenticatedRequest, response: Response) {
    try {
      const leads = await leadService.getAllLeads(request.user);
      return makeResponse(response, 200, true, "All leads", leads);
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async createLead(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const lead = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const lead = await leadService.createLead(
            request.body,
            request.user,
            transactionEntityManager
          );
          return lead;
        }
      );

      if (!lead) {
        return makeResponse(response, 400, true, "Lead does not created", null);
      }

      return makeResponse(
        response,
        201,
        true,
        "Lead created successfully",
        lead
      );
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }
  /**
   * Asynchronously controller help get all the leads from database.
   *
   * @param {CustomRequest} request - the custom request object
   * @param {Response} response - the response object
   * @return {Promise<number | Response<any, Record<string, any>>>} the created lead or a response with an error
   */
  async getLeads(request: AuthenticatedRequest, response: Response) {
    try {
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const search: string = request.query.search as string;
      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city as string;
      const rating: string[] = request.body.rating as string[];
      const status: string[] = request.body.status as string[];
      const leadSource: string[] = request.body.leadSource as string[];
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const contact: string = request.body.contact as string;
      const company: string = request.body.company as string;
      let view: string = request.query.view as string;

      const lead = await leadService.getleads(
        userId,
        role,
        search,
        country,
        state,
        city,
        rating,
        status,
        leadSource,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        contact,
        company,
        organizationId,
        view
      );

      if (!lead) {
        return makeResponse(response, 200, false, "Lead not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead fetched successfully",
        lead
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  /**
   * Asynchronously controller help update the leads from database.
   *
   * @param {CustomRequest} request - the custom request object
   * @param {Response} response - the response object
   * @return {Promise<number | Response<any, Record<string, any>>>} the created lead or a response with an error
   */
  async updateLead(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const lead = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const lead = await leadService.updateLead(
            request.params.leadId,
            request.body,
            request.user,
            transactionEntityManager
          );
          return lead;
        }
      );

      if (lead?.affected == 0 || lead == undefined) {
        return makeResponse(response, 400, false, "Lead not updated", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead updated successfully",
        lead
      );
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }
  async getLead(request: Request, response: Response) {
    try {
      if (!request.params.leadId) {
        return makeResponse(response, 400, false, "Lead id is required", null);
      }
      const lead = await leadService.getLead(request.params.leadId);
      if (!lead) {
        return makeResponse(response, 200, false, "Lead not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead fetched successfully",
        lead
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  /**
   * Asynchronously controller help get delete leads from database.
   *
   * @param {CustomRequest} request - the custom request object
   * @param {Response} response - the response object
   * @return {Promise<number | Response<any, Record<string, any>>>} the created lead or a response with an error
   */
  async deleteLead(request: AuthenticatedRequest, response: Response) {
    try {
      const lead = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const lead = await leadService.deleteLead(
            request.params.leadId,
            request.user,
            transactionEntityManager
          );
          return lead;
        }
      );

      if (!lead) {
        return makeResponse(response, 400, false, "Lead not found", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Lead deleted successfully",
        lead
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  /**
   * Asynchronously controller help create leads using csv in database.
   *
   * @param {CustomRequest} request - the custom request object
   * @param {Response} response - the response object
   * @return {Promise<number>} the created lead or a response with an error
   */
  async uploadLeadUsingExcel(request: AuthenticatedRequest, response: Response) {
    try {
      const file = request.file;
      if (!file) {
        return makeResponse(response, 400, false, "File is required", null);
      }

      const fileExtension = file?.originalname?.substring(
        file?.originalname?.lastIndexOf(".")
      );

      if (!fileExtension.includes(".xlsx")) {
        return makeResponse(
          response,
          400,
          false,
          "File must be in .xlsx format",
          null
        );
      }

      const leads = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const lead = await leadService.uploadLeadUsingExcel(
            file,
            request.user,
            file.originalname,
            transactionEntityManager
          );
          return lead;
        }
      );

      if (!leads) {
        return makeResponse(response, 400, false, "Fail to upload leads", null);
      }

      return makeResponse(response, 200, true, "Leads Summery Report", leads);
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async bulkDeleteLead(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const email = request.user.email;
      const auth_time = request.user.auth_time;
      const lead = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const lead = await leadService.bulkDeleteLead(
            request.body.leadIds,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return lead;
        }
      );

      if (lead?.deleted?.length == 0) {
        return makeResponse(response, 400, false, "Lead not deleted", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead deleted successfully",
        lead
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getLeadsByContactId(request: AuthenticatedRequest, response: Response) {
    try {
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const contactId: string = request.params.contactId as string;
      const search: string = request.query.search as string;
      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city as string;
      const rating: string[] = request.body.rating as string[];
      const status: string[] = request.body.status as string[];
      const leadSource: string[] = request.body.leadSource as string[];
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const contact: string = request.body.contact as string;
      const company: string = request.body.company as string;
      let view: string = request.query.view as string;

      const lead = await leadService.getLeadsByContactId(
        userId,
        role,
        search,
        country,
        state,
        city,
        rating,
        status,
        leadSource,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        contact,
        company,
        contactId,
        organizationId,
        view
      );

      if (!lead) {
        return makeResponse(response, 200, false, "Lead not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead fetched successfully",
        lead
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getLeadsByAccountId(request: AuthenticatedRequest, response: Response) {
    try {
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const accountId: string = request.params.accountId as string;
      const search: string = request.query.search as string;
      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city as string;
      const rating: string[] = request.body.rating as string[];
      const status: string[] = request.body.status as string[];
      const leadSource: string[] = request.body.leadSource as string[];
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const contact: string = request.body.contact as string;
      const company: string = request.body.company as string;
      let view: string = request.query.view as string;

      const lead = await leadService.getLeadsByAccountId(
        userId,
        role,
        search,
        country,
        state,
        city,
        rating,
        status,
        leadSource,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        contact,
        company,
        accountId,
        organizationId,
        view
      );

      if (!lead) {
        return makeResponse(response, 200, false, "Lead not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead fetched successfully",
        lead
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async assignLeadsByTitle(request: AuthenticatedRequest, response: Response) {
    try {
      const leadTitle: string = request.params.leadTitle;
      const { userId } = request.body;

      if (!leadTitle) {
        return makeResponse(response, 400, false, "Lead title is required", null);
      }

      if (!userId) {
        return makeResponse(response, 400, false, "User ID is required", null);
      }

      const result = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const updatedLeads = await leadService.assignLeadsByTitle(
            leadTitle,
            userId,
            request.user,
            transactionEntityManager
          );
          return updatedLeads;
        }
      );

      if (result?.affected === 0) {
        return makeResponse(
          response, 
          200, 
          true, 
          "No leads found with the specified title", 
          { affected: 0 }
        );
      }

      return makeResponse(
        response,
        200,
        true,
        "Leads assigned successfully",
        result
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }
}
export default LeadController;
