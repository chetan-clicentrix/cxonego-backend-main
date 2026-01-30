import { Response } from "express";
import ReferServices from "../services/refer.service";
import { decrypt, makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
const referServices = new ReferServices();

class ReferController {
  async getAllReferalls(request: AuthenticatedRequest, response: Response) {
    try {
      const referalls = await referServices.getAllReferalls(request.user);
      return makeResponse(
        response,
        200,
        true,
        "Referalls fetched successfully",
        referalls
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }
  async createRefer(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const refer = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const refer = await referServices.createRefer(
            request.body,
            request.user,
            transactionEntityManager
          );
          return refer;
        }
      );
      if (!refer) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to create Refer",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Refer created successfully",
        refer
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

  async updateRefer(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const referId = request.params.referId;

      const refer = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const refer = await referServices.updateRefer(
            request.body,
            request.user,
            referId,
            transactionEntityManager
          );
          return refer;
        }
      );
      if (!refer) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to update refer",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Refer updated successfully",
        refer
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

  async deleteRefer(request: AuthenticatedRequest, response: Response) {
    try {
      const referId = request.params.referId;

      const refer = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const refer = await referServices.deleteRefer(
            referId,
            request.user,
            transactionEntityManager
          );
          return refer;
        }
      );
      if (!refer) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to delete refer",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Refer deleted successfully",
        refer
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getRefer(request: AuthenticatedRequest, response: Response) {
    try {
      const referId = request.params.referId;
      const refer = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const refer = await referServices.getRefer(
            referId,
            transactionEntityManager
          );
          return refer;
        }
      );

      if (refer == null) {
        return makeResponse(
          response,
          200,
          true,
          "Refer details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Refer details fetch successfully",
        refer
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAllRefer(request: AuthenticatedRequest, response: Response) {
    try {
      let page = Number(request.query.page);
      let limit = Number(request.query.limit);
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }

      const search: string = request.query.search as string;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      const status: string[] = request.body.status as string[];
      const referBy: string = request.body.referBy as string;
      const company: string = request.body.company as string;
      let view: string = request.query.view as string;
      const refers = await referServices.getAllRefer(
        request.user,
        search,
        page,
        limit,
        createdAt,
        updatedAt,
        status,
        referBy,
        company,
        view
      );

      if (refers?.data.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Refer details not found",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Refer details fetched successfully",
        refers
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async bulkDeleteRefer(request: AuthenticatedRequest, response: Response) {
    try {
      const referIds = request.body.referIds;
      const refer = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const refer = await referServices.bulkDeleteRefer(
            referIds,
            request.user,
            transactionEntityManager
          );
          return refer;
        }
      );
      if (!refer) {
        return makeResponse(
          response,
          400,
          true,
          "Failed to delete refer",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Refer deleted successfully",
        refer
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}
export default ReferController;
