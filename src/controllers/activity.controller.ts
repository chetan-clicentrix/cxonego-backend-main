import { Request, Response } from "express";
import ActivityServices from "../services/activity.service";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse, decrypt } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { Activity } from "../entity/Activity";

const activityServices = new ActivityServices();
class ActivityController {
  async getAllActivity(request: AuthenticatedRequest, response: Response) {
    try {
      const activities = await activityServices.getAllActivity(request.user);
      return makeResponse(response, 200, true, "All Activities", activities);
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async createActivity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    if (!request.body)
      return makeResponse(
        response,
        404,
        false,
        "Please provide activity data",
        null
      );
    try {
      const activity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const activity = await activityServices.createActivity(
            request.body,
            request.user,
            transactionEntityManager
          );
          return activity;
        }
      );

      if (!activity) {
        return makeResponse(response, 404, false, "Activity Not Created", null);
      }
      return makeResponse(
        response,
        201,
        true,
        "Activity created successfully",
        activity
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

  async getActivityByactivityId(request: AuthenticatedRequest, response: Response) {
    try {
      const activityId: string = request.params.activityId;
      if (!activityId) {
        return makeResponse(
          response,
          400,
          false,
          "Activity id is required",
          null
        );
      }
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;

      const activity = await activityServices.getActivityByactivityId(
        userId,
        role,
        activityId
      );

      if (!activity) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity found successfully",
        activity
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getActivityByaccountId(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId;
      if (!accountId) {
        return makeResponse(
          response,
          400,
          false,
          "Account id is required",
          null
        );
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const activityType: string[] = request.body.activityType as string[];
      const activityStatus: string[] = request.body.activityStatus as string[];
      const activityPriority: string[] = request.body
        .activityPriority as string[];
      let startDate: string = request.query.startDate as string;
      let dueDate: string = request.query.dueDate as string;
      let actualStartDate: string = request.query.actualStartDate as string;
      let actualEndDate: string = request.query.actualEndDate as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;

      const activities = await activityServices.getActivityByaccountId(
        userId,
        role,
        search as string,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        activityType,
        activityStatus,
        activityPriority,
        startDate,
        dueDate,
        actualStartDate,
        actualEndDate,
        accountId,
        organizationId
      );

      if (!activities) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity found successfully",
        activities
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getActivityBycontactId(request: AuthenticatedRequest, response: Response) {
    try {
      const contactId: string = request.params.contactId;
      if (!contactId) {
        return makeResponse(
          response,
          400,
          false,
          "Contact id is required",
          null
        );
      }
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const activityType: string[] = request.body.activityType as string[];
      const activityStatus: string[] = request.body.activityStatus as string[];
      const activityPriority: string[] = request.body
        .activityPriority as string[];
      let startDate: string = request.query.startDate as string;
      let dueDate: string = request.query.dueDate as string;
      let actualStartDate: string = request.query.actualStartDate as string;
      let actualEndDate: string = request.query.actualEndDate as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;

      const activities = await activityServices.getActivityBycontactId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        activityType,
        activityStatus,
        activityPriority,
        startDate,
        dueDate,
        actualStartDate,
        actualEndDate,
        contactId,
        organizationId
      );

      if (!activities) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity found successfully",
        activities
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getActivityByleadId(request: AuthenticatedRequest, response: Response) {
    try {
      const leadId: string = request.params.leadId;
      if (!leadId) {
        return makeResponse(response, 400, false, "Lead id is required", null);
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const activityType: string[] = request.body.activityType as string[];
      const activityStatus: string[] = request.body.activityStatus as string[];
      const activityPriority: string[] = request.body
        .activityPriority as string[];
      let startDate: string = request.query.startDate as string;
      let dueDate: string = request.query.dueDate as string;
      let actualStartDate: string = request.query.actualStartDate as string;
      let actualEndDate: string = request.query.actualEndDate as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;

      const activities = await activityServices.getActivityByleadId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        activityType,
        activityStatus,
        activityPriority,
        startDate,
        dueDate,
        actualStartDate,
        actualEndDate,
        leadId,
        organizationId
      );

      if (!activities) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity found successfully",
        activities
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getActivityByOpportunityId(request: AuthenticatedRequest, response: Response) {
    try {
      const opportunityId: string = request.params.opportunityId;
      if (!opportunityId) {
        return makeResponse(
          response,
          400,
          false,
          "opportunityId is required",
          null
        );
      }

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const activityType: string[] = request.body.activityType as string[];
      const activityStatus: string[] = request.body.activityStatus as string[];
      const activityPriority: string[] = request.body
        .activityPriority as string[];
      let startDate: string = request.query.startDate as string;
      let dueDate: string = request.query.dueDate as string;
      let actualStartDate: string = request.query.actualStartDate as string;
      let actualEndDate: string = request.query.actualEndDate as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;

      const activities = await activityServices.getActivityByOpportunityId(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        activityType,
        activityStatus,
        activityPriority,
        startDate,
        dueDate,
        actualStartDate,
        actualEndDate,
        opportunityId,
        organizationId
      );

      if (!activities) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity found successfully",
        activities
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getActivities(request: AuthenticatedRequest, response: Response) {
    try {
      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;

      const activityType: string[] = request.body.activityType as string[];
      const activityStatus: string[] = request.body.activityStatus as string[];
      const activityPriority: string[] = request.body
        .activityPriority as string[];
      let startDate: string = request.query.startDate as string;
      let dueDate: string = request.query.dueDate as string;
      let actualStartDate: string = request.query.actualStartDate as string;
      let actualEndDate: string = request.query.actualEndDate as string;

      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let view: string = request.query.view as string;

      const activities = await activityServices.getAllActivities(
        userId,
        role,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        dateRange,
        activityType,
        activityStatus,
        activityPriority,
        startDate,
        dueDate,
        actualStartDate,
        actualEndDate,
        organizationId,
        view
      );

      if (activities?.data?.length == 0) {
        return makeResponse(response, 200, false, "Activities not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activities found successfully",
        activities
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async updateActivity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const activityId: string = request.params.activityId as string;
      if (!activityId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide activity id",
          null
        );
      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "Please provide activity data",
          null
        );

      const payload: Activity = request.body as Activity;
      const activity = await activityServices.updateActivity(
        activityId,
        payload,
        request.user
      );

      if (activity?.affected == 0 || activity == undefined) {
        return makeResponse(response, 400, false, "Activity not updated", null);
      }

      return makeResponse(
        response,
        201,
        true,
        "Activity updated successfully",
        activity
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

  async deleteActivity(request: AuthenticatedRequest, response: Response) {
    try {
      const activity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const activity = await activityServices.deleteActivity(
            request.params.activityId,
            request.user,
            transactionEntityManager
          );
          return activity;
        }
      );
      if (!activity) {
        return makeResponse(response, 200, false, "Activity not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity deleted successfully",
        activity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async bulkDeleteActivity(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const email = request.user.email;
      const auth_time = request.user.auth_time;
      const activity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const activity = await activityServices.bulkDeleteActivity(
            request.body.activityIds,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return activity;
        }
      );

      if (activity?.deleted?.length == 0) {
        return makeResponse(response, 400, false, "Activity not deleted", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Activity deleted successfully",
        activity
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
}

export default ActivityController;
