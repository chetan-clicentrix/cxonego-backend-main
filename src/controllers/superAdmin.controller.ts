import { Request, Response } from "express";
import SuperAdminService from "../services/superAdmin.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";

const superAdminService = new SuperAdminService();

class SuperAdminController {
  async login(request: Request, response: Response) {
    try {
      const result = await superAdminService.login(request.body);
      if (result == true) {
        return makeResponse(response, 200, true, "Login Successful", result);
      }
      return makeResponse(response, 200, false, "Login Failed", result);
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async createSuperAdmin(request: Request, response: Response) {
    try {
      const result = await superAdminService.createSuperAdmin(request.body);
      return makeResponse(response, 200, true, "Super Admin Created", result);
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async updateSuperAdmin(request: Request, response: Response) {
    try {
      const result = await AppDataSource.transaction(
        async (transactionalEntityManager) => {
          return await superAdminService.updateSuperAdmin(
            request.body,
            request.params.id,
            transactionalEntityManager
          );
        }
      );
      return makeResponse(response, 200, true, "Super Admin Updated", result);
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async deleteSuperAdmin(request: Request, response: Response) {
    try {
      const result = await AppDataSource.transaction(
        async (transactionalEntityManager) => {
          return await superAdminService.deleteSuperAdmin(
            request.params.id,
            transactionalEntityManager
          );
        }
      );
      return makeResponse(response, 200, true, "Super Admin Deleted", result);
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async disableUser(request: Request, response: Response) {
    try {
      const result = await superAdminService.disableUser(
        request.body.userId,
        request.body.isBlocked
      );
      return makeResponse(response, 200, true, "User Updated", result);
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async deleteUserFromInvitedList(request: Request, response: Response) {
    try {
      const { adminId, userEmail } = request.body;
      await superAdminService.deleteUserFromInvitedList(adminId, userEmail);
      return makeResponse(response, 200, true, "User Deleted", "");
    } catch (error) {
      errorHandler(response, error);
    }
  }
}

export default SuperAdminController;
