import { Response } from "express";
import OrganizationServices from "../services/organization.service";
import { makeResponse, decrypt } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
import { Role } from "../entity/Role";
const organizationServices = new OrganizationServices();

class OrganizationController {
  async createOrganization(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const organization = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const organization = await organizationServices.createOrganization(
            request.body,
            transactionEntityManager
          );
          return organization;
        }
      );

      if (!organization) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to create organization",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Organization created successfully",
        organization
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

  async getOrganizationById(request: AuthenticatedRequest, response: Response) {
    try {
      const organizationId = request.params.organizationId;
      const organization = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const organization = await organizationServices.getOrganizationById(
            organizationId,
            transactionEntityManager
          );
          return organization;
        }
      );

      if (organization == null) {
        return makeResponse(
          response,
          200,
          true,
          "Organization details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Organization details fetch successfully",
        organization
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAllOrganization(request: AuthenticatedRequest, response: Response) {
    try {
      const data = await organizationServices.getAllOrganization(
        request
      );

      if (data.organizations.length == 0) {
        return makeResponse(
          response,
          200,
          true,
          "Organization details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Organization details fetch successfully",
        data
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updateOrganization(request: AuthenticatedRequest, response: Response) {
    try {
      const organizationId = request.params.organizationId;
      console.log("organizationId : ", organizationId);
      const organization = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const organization = await organizationServices.updateOrganization(
            request.body,
            organizationId,
            request.user,
            transactionEntityManager
          );
          return organization;
        }
      );

      if (organization?.affected == 0 || organization == undefined) {
        return makeResponse(
          response,
          400,
          false,
          "Organization not updated",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Organization updated successfully",
        organization
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updateOrganizationPartially(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const organizationId = request.params.organizationId;
      const organization = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const organization =
            await organizationServices.updateOrganizationPartially(
              request.body,
              organizationId,
              // request.user,
              transactionEntityManager
            );
          return organization;
        }
      );

      if (organization?.affected == 0 || organization == undefined) {
        return makeResponse(
          response,
          400,
          false,
          "Organization not updated",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Organization updated successfully",
        organization
      );
    } catch (error) {
      errorHandler(response, error);
    }
  }

  async deleteOrganization(request: AuthenticatedRequest, response: Response) {
    try {
      const organization = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const organization = await organizationServices.deleteOrganization(
            request.params.organizationId,
            request.user,
            transactionEntityManager
          );
          return organization;
        }
      );

      if (!organization) {
        return makeResponse(
          response,
          200,
          false,
          "Organization not found",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Organization deleted successfully",
        organization
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}
export default OrganizationController;
