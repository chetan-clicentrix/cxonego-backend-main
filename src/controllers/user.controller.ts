import { Request, Response } from "express";
import UserServices from "../services/user.service";
import { AuthenticatedRequest } from "../interfaces/types";
import { profileSchemaType, UserSchema } from "../schemas/user.schemas";
import { errorHandler } from "../common/errors";
import { makeResponse, decrypt } from "../common/utils";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { Role } from "../entity/Role";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import { InviteUsersType, InviteUserType } from "../schemas/comman.schemas";

const userservices = new UserServices();
class UserController {
  //The Math.random() function in JavaScript returns a floating-point,
  //pseudo-random number in the range from 0 (inclusive) to 1 (exclusive).

  async updateProfile(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const userProfile: User = request.body;
      const userProfileId: string = request.params.userId;
      const organizationId: string = request.body.organizationId;
      const role: string = request.body.role;
      userProfile.userId = userProfileId;

      if (!userProfile) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide user information",
          null
        );
      }
      const user = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const user = await userservices.updateProfile(
            userProfile,
            userProfileId,
            organizationId,
            role,
            transactionEntityManager
          );
          return user;
        }
      );

      if (!user) {
        return makeResponse(
          response,
          404,
          false,
          "Failed to update User",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "User updated successfully",
        user
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
  async getUserById(request: AuthenticatedRequest, response: Response) {
    try {
      const userId: string = request.params.userId;
      if (!userId) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide user id",
          null
        );
      }
      const user = await userservices.getUserById(userId);
      if (!user) {
        return makeResponse(response, 200, false, "User not found", null);
      }
      return makeResponse(
        response,
        200,
        true,
        "User fetched successfully",
        user
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  async getUsers(request: Request, response: Response) {
    try {
      const { users, total } = await userservices.getUsers(request);
      if (users?.length == 0) {
        return makeResponse(response, 200, true, "Users not found", null);
      }
      return makeResponse(response, 200, true, "Users fetched successfully", {
        users,
        total,
      });
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  async updateSertUser(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const userProfile: User = request.body;
      const role: string = request.body.role;

      if (!userProfile) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide user information",
          null
        );
      }

      const user = await userservices.updateSertUser(userProfile, role);

      if (!user) {
        return makeResponse(
          response,
          404,
          false,
          "Failed to create user",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "User upsert successfully",
        user
      );
    } catch (error) {
      console.log("Error is : >> ", error);
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

  async addUserRole(request: AuthenticatedRequest, response: Response) {
    try {
      const roleName: Array<string> = request.body.role;
      const userId: string = request.body.userId;
      if (roleName.length < 0) {
        return makeResponse(response, 404, false, "Please provide role", null);
      }
      const user = AppDataSource.transaction(
        async (transactionEntityManager) => {
          const user = await userservices.addUserRole(
            roleName,
            userId,
            transactionEntityManager
          );
          return user;
        }
      );
      if (!user) {
        return makeResponse(
          response,
          404,
          false,
          "Fail to add role delete role from user",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "User updated with new role",
        user
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  async deleteUserRole(request: AuthenticatedRequest, response: Response) {
    try {
      const roleName: string = request.body.role;
      const userId: string = request.body.userId;
      if (!roleName) {
        return makeResponse(response, 404, false, "Please provide role", null);
      }
      const user = AppDataSource.transaction(
        async (transactionEntityManager) => {
          const user = await userservices.deleteUserRole(
            roleName,
            userId,
            transactionEntityManager
          );
          return user;
        }
      );
      if (!user) {
        return makeResponse(
          response,
          404,
          false,
          "Fail to add role to the user",
          null
        );
      }
      return makeResponse(response, 200, true, "Removed role from user", user);
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }
  async inviteUser(request: AuthenticatedRequest, response: Response) {
    try {
      const invites: InviteUserType[] = request.body
        .invites as InviteUserType[];
      const hostUserId: string = request.body.hostUserId;

      const user = await userservices.inviteUser(invites, hostUserId);

      if (!user) {
        return makeResponse(
          response,
          404,
          false,
          "Fail to send the mail",
          null
        );
      }
      return makeResponse(response, 200, true, "User invited", user);
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async createUserDirectly(request: AuthenticatedRequest, response: Response) {
    try {
      const payload = request.body;
      const adminUserId = request.user?.userId;

      if (!adminUserId) {
        return makeResponse(
          response,
          401,
          false,
          "Unauthorized: Admin user ID not found",
          null
        );
      }

      const result = await userservices.createUserDirectly(payload, adminUserId);

      return makeResponse(
        response,
        201,
        true,
        "User created successfully",
        result
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async partiallyUpadateUser(request: AuthenticatedRequest, response: Response) {
    try {
      const userId: string = request.params.userId as string;

      if (!userId)
        return makeResponse(
          response,
          404,
          false,
          "Please provide user Id",
          null
        );
      if (!request.body)
        return makeResponse(
          response,
          404,
          false,
          "Please provide user data",
          null
        );

      const payload: User = request.body as User;
      payload.userId = userId;

      const user = await userservices.partiallyUpadateUser(userId, payload);

      if (user?.affected == 0) {
        return makeResponse(
          response,
          404,
          false,
          "Failed to update user",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "User updated successfully",
        user
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getAllUserDataOrgnizationWise(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const userId = request.params.userId;
      const userdata = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const userdata = await userservices.getAllUserDataOrgnizationWise(
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
          "User details not found",
          null
        );
      }

      return makeResponse(
        response,
        201,
        true,
        "User details fetch successfully",
        userdata
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async addUserDetails(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const userProfile: User = request.body;
      if (!userProfile) {
        return makeResponse(
          response,
          404,
          false,
          "Please provide user information",
          null
        );
      }
      const user = await userservices.addUserDetails(userProfile);
      if (!user) {
        return makeResponse(response, 404, false, "Failed to add user", null);
      }
      return makeResponse(response, 200, true, "User added successfully", user);
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

  async getUsersSubscriptions(request: AuthenticatedRequest, response: Response) {
    try {
      const result = await userservices.getUsersSubscriptions(request);
      return makeResponse(
        response,
        200,
        true,
        "User subscriptions fetched successfully",
        result
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updateUserRole(request: AuthenticatedRequest, response: Response) {
    try {
      const result = await userservices.updateUserRole(request);
      return makeResponse(
        response,
        200,
        true,
        "User role updated successfully",
        result
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updateUserProfile(request: AuthenticatedRequest, response: Response) {
    try {
      const result = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const result = await userservices.updateUserProfile(
            request,
            transactionEntityManager
          );
          return result;
        }
      );
      return makeResponse(
        response,
        200,
        true,
        "User profile updated successfully",
        result
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async isUserOnboarded(req: Request, res: Response) {
    try {
      const result = await userservices.isUserOnboarded(
        req.body.userEmail as string
      );
      if (result) {
        return makeResponse(
          res,
          200,
          true,
          "User profile received successfully",
          result
        );
      } else {
        return makeResponse(res, 200, true, "No related User found", result);
      }
    } catch (error) {
      errorHandler(res, error.message);
    }
  }

  async isInvitationRevoked(req: Request, res: Response) {
    try {
      const result = await userservices.isInvitationRevoked(req.body);
      if (result) return makeResponse(res, 200, true, "Invitation Valid", result);
      return makeResponse(res, 200, true, "Invitation Revoked", result);
    } catch (error) {
      errorHandler(res, error);
    }
  }
}

export default UserController;
