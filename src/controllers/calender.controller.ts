import { Response } from "express";
import CalenderServices from "../services/calender.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
import { DateRangeParamsType, RangeDateType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
const calenderServices = new CalenderServices();

class CalenderController {
  async getAllAppointments(request: AuthenticatedRequest, response: Response) {
    try {
      const appointments = await calenderServices.getAllAppointments(
        request.user
      );
      return makeResponse(
        response,
        200,
        true,
        "All appointments",
        appointments
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async createCalender(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const participentEmailId = request.body.participentEmailId;
      const calender = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const calender = await calenderServices.createCalender(
            request.body,
            userId,
            participentEmailId,
            transactionEntityManager
          );
          return calender;
        }
      );
      if (!calender) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to create calender",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Calender created successfully",
        calender
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updateCalender(request: AuthenticatedRequest, response: Response) {
    try {
      const appointmentId = request.params.appointmentId;
      const participentEmailId = request.body.participentEmailId;

      const calender = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const calender = await calenderServices.updateCalender(
            request.body,
            request.user,
            participentEmailId,
            appointmentId,
            transactionEntityManager
          );
          return calender;
        }
      );
      if (!calender) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to update calender",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Calender updated successfully",
        calender
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async deleteCalender(request: AuthenticatedRequest, response: Response) {
    try {
      const appointmentId = request.params.appointmentId;

      const calender = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const calender = await calenderServices.deleteCalender(
            appointmentId,
            request.user,
            transactionEntityManager
          );
          return calender;
        }
      );
      if (!calender) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to delete calender",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Calender deleted successfully",
        calender
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAppointments(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      let dateRange: RangeDateType = request.body.dateRange as RangeDateType;
      const calender = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const calender = await calenderServices.getAppointments(
            userId,
            role,
            dateRange,
            organizationId,
            transactionEntityManager
          );
          return calender;
        }
      );

      if (calender.length == 0) {
        return makeResponse(
          response,
          200,
          true,
          "Calender details not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Calender details fetch successfully",
        calender
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAppointmentById(request: AuthenticatedRequest, response: Response) {
    try {
      const appointmentId = request.params.appointmentId;
      const userId = request.user.userId;
      const role: Role[] = request.user.role;
      const calender = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const calender = await calenderServices.getAppointmentById(
            userId,
            role,
            appointmentId,
            transactionEntityManager
          );
          return calender;
        }
      );

      if (!calender) {
        return makeResponse(
          response,
          200,
          true,
          "Calender details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Calender details fetch successfully",
        calender
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAllUserDataByOrgId(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;

      const userdata = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const userdata = await calenderServices.getAllUserDataByOrgId(
            userId,
            transactionEntityManager
          );
          return userdata;
        }
      );

      if (userdata == null) {
        return makeResponse(
          response,
          200,
          true,
          "userdata details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "userdata details fetch successfully",
        userdata
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}
export default CalenderController;
