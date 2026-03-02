import { errorHandler } from "../common/errors";
import { Request, Response } from "express";
import OppurtunityServices from "../services/oppurtunity.service";
import { makeResponse, decrypt } from "../common/utils";
import { Oppurtunity } from "../entity/Oppurtunity";
import { AuthenticatedRequest } from "../interfaces/types";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { AppDataSource } from "../data-source";
const oppurtunityServices = new OppurtunityServices();
export class OppurtunityController {
  async getAllOppurtunities(request: AuthenticatedRequest, response: Response) {
    try {
      const oppurtunities = await oppurtunityServices.getAllOppurtunities(
        request.user
      );
      return makeResponse(
        response,
        200,
        true,
        "All oppurtunities",
        oppurtunities
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getAllOppurtunity(request: AuthenticatedRequest, response: Response) {
    try {
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      let view: string = request.query.view as string;

      const oppurtunity = await oppurtunityServices.getAllOppurtunity(
        userId,
        role,
        search,
        page,
        limit,
        purchaseTimeFrame,
        forecastCategory,
        probability,
        stage,
        status,
        priority,
        purchaseProcess,
        createdAt,
        updatedAt,
        dateRange,
        company,
        contact,
        organizationId,
        view
      );

      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async createOppurtunity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const payload = request.body as Oppurtunity;
      const opportunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const opportunity = await oppurtunityServices.createOppurtunity(
            payload,
            request.user,
            transactionEntityManager
          );
          return opportunity;
        }
      );

      if (!opportunity) {
        return makeResponse(
          response,
          400,
          false,
          "Fail to create opportunity",
          null
        );
      }

      // Run post-create tasks (activity plan auto-assignment) AFTER the transaction
      // commits to avoid MySQL lock wait timeout caused by nested DB connections.
      oppurtunityServices.postCreateOpportunityTasks(opportunity, request.user)
        .catch(err => console.error('[OPPORTUNITY_CONTROLLER] Post-create task error:', err));

      return makeResponse(
        response,
        201,
        true,
        "Opportunity created successfully",
        opportunity
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
  async updateOppurtunity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const oppurtunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const oppurtunity = await oppurtunityServices.updateOppurtunity(
            request.params.opportunityId,
            request.body,
            request.user,
            transactionEntityManager
          );
          return oppurtunity;
        }
      );

      if (!oppurtunity) {
        return makeResponse(
          response,
          400,
          false,
          "Oppurtunity not updated",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Oppurtunity updated successfully",
        oppurtunity
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
  async deleteOppurtunity(request: AuthenticatedRequest, response: Response) {
    try {
      const oppurtunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const oppurtunity = await oppurtunityServices.deleteOppurtunity(
            request.params.opportunityId,
            request.user,
            transactionEntityManager
          );
          return oppurtunity;
        }
      );

      // if(oppurtunity?.affected===0){
      //     return makeResponse(response, 200, false, "Oppurtunity Not deleted", null);
      // }

      return makeResponse(
        response,
        201,
        true,
        "Oppurtunity deleted successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getOppurtunityById(request: Request, response: Response) {
    try {
      const oppurtunityId: string = request.params.opportunityId as string;
      const oppurtunity = await oppurtunityServices.getOppurtunityById(
        oppurtunityId
      );
      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Oppurtunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Oppurtunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async bulkDeleteOpportunity(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const auth_time = request.user.auth_time;
      const email = request.user.email;
      const opportunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const opportunity = await oppurtunityServices.bulkDeleteOpportunity(
            request.body.opportunityIds,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return opportunity;
        }
      );

      if (opportunity?.deleted?.length == 0) {
        return makeResponse(
          response,
          400,
          false,
          "Opportunity not deleted",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Opportunity deleted successfully",
        opportunity
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getAllOppurtunityByAccountId(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const accountID: string = request.params.accountID;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;
      let view: string = request.query.view as string;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;

      const oppurtunity =
        await oppurtunityServices.getAllOppurtunityByAccountId(
          userId,
          role,
          search,
          page,
          limit,
          purchaseTimeFrame,
          forecastCategory,
          probability,
          stage,
          status,
          priority,
          purchaseProcess,
          createdAt,
          updatedAt,
          dateRange,
          company,
          contact,
          accountID,
          organizationId,
          view
        );

      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAllOppurtunityByContactId(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const contactID: string = request.params.contactID;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;
      let view: string = request.query.view as string;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;

      const oppurtunity =
        await oppurtunityServices.getAllOppurtunityByContactId(
          userId,
          role,
          search,
          page,
          limit,
          purchaseTimeFrame,
          forecastCategory,
          probability,
          stage,
          status,
          priority,
          purchaseProcess,
          createdAt,
          updatedAt,
          dateRange,
          company,
          contact,
          contactID,
          organizationId,
          view
        );

      if (oppurtunity?.data?.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async exportOpportunitiesToExcel(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const search: string | undefined = request.query.search as string | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body.dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const purchaseTimeFrame: string[] = request.body.purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body.forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body.purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;
      let view: string = request.query.view as string;
      const excludedColumns: string[] = request.body.excludedColumns as string[];

      const buffer = await oppurtunityServices.exportOpportunitiesToExcel(
        userId,
        role,
        search,
        purchaseTimeFrame,
        forecastCategory,
        probability,
        stage,
        status,
        priority,
        purchaseProcess,
        createdAt,
        updatedAt,
        dateRange,
        company,
        contact,
        organizationId,
        view,
        excludedColumns
      );

      response.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      response.setHeader(
        "Content-Disposition",
        "attachment; filename=opportunities.xlsx"
      );
      return response.send(buffer);
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}
