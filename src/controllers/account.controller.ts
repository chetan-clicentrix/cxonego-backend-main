import { Request, Response } from "express";
import AccountServices from "../services/account.service";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse, decrypt } from "../common/utils";
import { accountSchemaType } from "../schemas/company.schema";
import { errorHandler } from "../common/errors";
import { Account } from "../entity/Account";
import { AppDataSource } from "../data-source";
import { string } from "zod";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { User } from "../entity/User";

const accountServices = new AccountServices();
class AccountController {
  async getAllAccounts(request: AuthenticatedRequest, response: Response) {
    try {
      const userInfo = request.user;
      const accounts = await accountServices.getAllAccounts(userInfo);
      return makeResponse(response, 200, true, "All accounts", accounts);
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getAccounts(request: AuthenticatedRequest, response: Response) {
    try {
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let page: number = Number(request.query.page);
      let limit = Number(request.query.limit);
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let view: string = request.query.view as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const role: Role[] = request.user.role;
      const ownerId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;

      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }

      const country: string[] = request.body.country as string[];
      const state: string = request.body.state;
      const city: string = request.body.city;
      const status: string[] = request.body.status as string[];
      const industry: string[] = request.body.industry as string[];
      const businessType: string[] = request.body.businessType as string[];
      const account = await accountServices.getAccounts(
        ownerId,
        role,
        search,
        page,
        limit,
        country,
        state,
        city,
        status,
        industry,
        businessType,
        createdAt,
        updatedAt,
        dateRange,
        organizationId,
        view
      );

      if (account?.data.length == 0) {
        return makeResponse(response, 200, true, "Accounts not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Accounts found successfully",
        account
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getAccount(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId as string;
      if (!accountId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide account id",
          null
        );
      const account = await accountServices.getAccount(accountId);
      if (!account) {
        return makeResponse(response, 200, false, "Account not found", null);
      }
      return makeResponse(
        response,
        201,
        true,
        "Account fetched successfully",
        account
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async createAccount(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const { userId, auth_time, organizationId } = request.user;

      const account = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const payload: Account = request.body as Account;
          const account = await accountServices.createAccount(
            payload,
            userId,
            auth_time,
            organizationId,
            transactionEntityManager
          );
          return account;
        }
      );

      if (!account) {
        return makeResponse(
          response,
          400,
          true,
          "Account does not created",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "Account created successfully",
        account
      );
    } catch (error) {
      console.log("error ::: ", error);
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
      console.log("errorMessage ::: ", errorMessage);
      errorHandler(response, errorMessage);
    }
  }

  async updateAccount(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const accountId: string = request.params.accountId as string;
      if (!accountId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide account id",
          null
        );

      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "Please provide account data",
          null
        );

      const payload: Account = request.body as Account;

      const account = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const updatedAccount = await accountServices.updateAccount(
            accountId,
            payload,
            request.user,
            transactionEntityManager
          );
          return updatedAccount;
        }
      );

      if (account?.affected == 0 || account == undefined) {
        return makeResponse(response, 400, false, "Account not updated", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Account updated successfully",
        account
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

  async deleteAccount(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId as string;
      if (!accountId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide account id",
          null
        );

      const account = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const account = await accountServices.deleteAccount(
            accountId,
            request.user,
            transactionEntityManager
          );
          return account;
        }
      );

      if (!account) {
        return makeResponse(response, 404, false, "Account Not Found", null);
      }

      return makeResponse(
        response,
        200,
        true,
        "Account Deleted Successfully",
        account
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async partiallyUpdateAccount(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId as string;
      if (!accountId)
        return makeResponse(
          response,
          404,
          false,
          "please provide account id",
          null
        );
      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "please provide account data",
          null
        );
      const payload: Account = request.body as Account;
      const account = await accountServices.partiallyUpdateAccount(
        accountId,
        payload
      );
      if (!account) {
        return makeResponse(response, 400, false, "Account not updated", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Account updated successfully",
        account
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  async leadsByAccountId(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId as string;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let page: number = Number(request.query.page);
      let limit = Number(request.query.limit);
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }
      if (!accountId) {
        return makeResponse(
          response,
          404,
          false,
          "please provide account id",
          null
        );
      }
      const lead = await accountServices.leadByAccountId(
        accountId,
        search,
        page,
        limit
      );
      if (!lead) {
        return makeResponse(response, 200, false, "Lead not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Lead fetched Successfully",
        lead
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async contactByAccountId(request: AuthenticatedRequest, response: Response) {
    try {
      const accountId: string = request.params.accountId as string;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let page: number = Number(request.query.page);
      let limit = Number(request.query.limit);
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 7;
      }
      if (!accountId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide account id",
          null
        );
      const contact = await accountServices.contactByAccountId(
        accountId,
        search,
        page,
        limit
      );
      if (!contact) {
        return makeResponse(response, 200, false, "Contact not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Contact fetched Successfully",
        contact
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async UploadAccountExcel(request: AuthenticatedRequest, response: Response) {
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

      const bulkAccounts = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const contact = await accountServices.uploadAccountUsingExcel(
            file,
            request.user,
            file.originalname,
            transactionEntityManager
          );
          return contact;
        }
      );

      if (!bulkAccounts) {
        return makeResponse(
          response,
          400,
          false,
          "Accounts not uploaded",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Accounts Summery Report",
        bulkAccounts
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async bulkDeleteAccount(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const auth_time = request.user.auth_time;
      const email = request.user.email;
      const account = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const account = await accountServices.bulkDeleteAccount(
            request.body.accountIds,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return account;
        }
      );
      if (account?.deleted?.length == 0) {
        return makeResponse(response, 400, false, "Account not deleted", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Account deleted successfully",
        account
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getAccountsByOrgnizationId(request: AuthenticatedRequest, response: Response) {
    try {
      const organizationId: string | null = request.user.organizationId;
      const account = await accountServices.getAccountsByOrgnizationId(
        organizationId
      );
      if (account?.length == 0) {
        return makeResponse(response, 200, true, "Accounts not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "Accounts found successfully",
        account
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}

export default AccountController;
