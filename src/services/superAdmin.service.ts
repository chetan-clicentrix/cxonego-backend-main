import { Request } from "express";
import { AppDataSource } from "../data-source";
import { SuperAdmin } from "../entity/SuperAdmin";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { SuperAdminSchemaType } from "../schemas/superAdmin.schemas";
import { EntityManager } from "typeorm";
import * as admin from "firebase-admin";
import axios from "axios";
import { User } from "../entity/User";
// import { Audit } from "../entity/Audit";
// import { auditType } from "../common/utils";
// import { v4 } from "uuid";
class SuperAdminService {
  async login(payload: SuperAdminSchemaType) {
    const superAdminRepository = AppDataSource.getRepository(SuperAdmin);
    const result = await superAdminRepository.findOne({
      where: {
        email: payload.email,
      },
    });

    if (!result) {
      throw new ResourceNotFoundError("Invalid Email Provided..");
    }

    if (
      result?.password !== payload.password ||
      result?.phone !== payload.phone
    ) {
      throw new ValidationFailedError("Invalid credentials");
    }

    return true;
  }

  async createSuperAdmin(payload: SuperAdminSchemaType) {
    const superAdminRepository = AppDataSource.getRepository(SuperAdmin);
    const superAdmin = new SuperAdmin();
    superAdmin.email = payload.email;
    superAdmin.phone = payload.phone;
    superAdmin.password = payload.password;
    return superAdminRepository.save(superAdmin);
  }

  async updateSuperAdmin(
    payload: SuperAdminSchemaType,
    id: string,
    transactionEntityManager: EntityManager
  ) {
    const superAdminRepository =
      transactionEntityManager.getRepository(SuperAdmin);
    const adminInstance = superAdminRepository.findOneBy({ id: id });
    if (!adminInstance) throw new ResourceNotFoundError("Admin not found");

    const result = await superAdminRepository.update({ id: id }, payload);
    return result;
  }

  async getSuperAdmin(id: string) {
    const superAdminRepository = AppDataSource.getRepository(SuperAdmin);
    const adminInstance = await superAdminRepository.findOneBy({ id: id });
    // if (!adminInstance) throw new ResourceNotFoundError("Admin not found");
    return adminInstance;
  }

  async deleteSuperAdmin(id: string, transactionEntityManager: EntityManager) {
    const superAdminRepository =
      transactionEntityManager.getRepository(SuperAdmin);
    const adminInstance = superAdminRepository.findOneBy({ id: id });
    if (!adminInstance) throw new ResourceNotFoundError("Admin not found");
    const result = await superAdminRepository.softDelete({ id: id });
    return result;
  }

  async verifyCaptcha(request: Request) {
    try {
      console.log("====== CAPTCHA VERIFICATION ATTEMPT ======");

      // CAPTCHA bypass for development/testing
      if (process.env.DISABLE_CAPTCHA === 'true') {
        console.log("⚠️  CAPTCHA DISABLED - Bypassing verification");
        return true;
      }

      const secretKey = process.env.CAPTCHA_SECRET_KEY;
      if (!secretKey) {
        console.error("CAPTCHA_SECRET_KEY environment variable is not set");
        throw new ResourceNotFoundError("Captcha secret key not found");
      }
      console.log("Secret key available (first 5 chars):", secretKey.substring(0, 5) + "...");

      const token = request.body.token;
      if (!token) {
        console.error("Captcha token not provided in request body");
        throw new ResourceNotFoundError("Captcha token not found");
      }
      console.log("Token received (first 10 chars):", token.substring(0, 10) + "...");
      console.log("Request headers:", JSON.stringify(request.headers));
      console.log("Client IP:", request.ip);
      console.log("Request origin:", request.headers.origin || "No origin header");

      // Use URLSearchParams instead of including parameters directly in the URL
      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token);
      params.append('remoteip', request.ip || ""); // Add remote IP for better verification

      console.log("Making request to Google reCAPTCHA API...");
      console.log("Request URL: https://www.google.com/recaptcha/api/siteverify");
      console.log("Request params:", params.toString().replace(secretKey, "SECRET_KEY_HIDDEN"));

      try {
        const { data } = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        console.log("Full reCAPTCHA API response:", JSON.stringify(data));

        if (!data.success) {
          console.error("Captcha verification failed. Error codes:", data['error-codes']);
          console.error("Possible reasons:");

          // Explain common error codes
          if (data['error-codes'] && data['error-codes'].includes('invalid-input-secret')) {
            console.error("- Your secret key is invalid or incorrect");
          }
          if (data['error-codes'] && data['error-codes'].includes('invalid-input-response')) {
            console.error("- The captcha token is invalid or malformed");
          }
          if (data['error-codes'] && data['error-codes'].includes('timeout-or-duplicate')) {
            console.error("- The captcha token has expired or was already used");
          }
          if (data['error-codes'] && data['error-codes'].includes('hostname-mismatch')) {
            console.error("- DOMAIN PROBLEM: Your EC2 IP is not registered in reCAPTCHA admin console");
            console.error("- Go to https://www.google.com/recaptcha/admin/ and add your domain: 13.235.48.242");
          }
        } else {
          console.log("Captcha verification successful!");
        }

        return data?.success;
      } catch (axiosError) {
        console.error("Network error contacting Google reCAPTCHA API:");
        console.error("Error details:", axiosError.message);
        if (axiosError.response) {
          console.error("Response status:", axiosError.response.status);
          console.error("Response data:", axiosError.response.data);
        }
        throw axiosError;
      }
    } catch (error) {
      console.error("====== CAPTCHA VERIFICATION ERROR ======");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("=========================================");
      throw error;
    }
  }

  //called by super admin: disable this user in enitity and in his admin's invited array if he's not an admin himself..
  async disableUser(userId: string, isBlocked: boolean) {
    if (userId === "" || !userId || isBlocked === undefined) {
      throw new ResourceNotFoundError("User ID or isBlocked field not found");
    }
    const userRepository = AppDataSource.getRepository(User);
    const userInstance = await userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role")
      .leftJoinAndSelect("user.organisation", "organisation")
      .where("user.userId = :userId", { userId: userId })
      .getOne();

    if (!userInstance) throw new ResourceNotFoundError("User not found");
    userInstance.isBlocked = isBlocked;
    const isAdmin = userInstance.roles.some(
      (role) => role.roleName === "ADMIN"
    );
    if (!isAdmin) {
      const organisationId = userInstance.organisation.organisationId;
      const adminUser = await userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.roles", "role")
        .leftJoinAndSelect("user.organisation", "organisation")
        .where("role.roleName = :roleName", { roleName: "ADMIN" })
        .andWhere("organisation.organisationId = :organisationId", {
          organisationId: organisationId,
        })
        .getOne();

      if (!adminUser) throw new ResourceNotFoundError("Admin not found");
      const targetUserIndex = adminUser.invitedUsers.findIndex(
        (user) => user?.id === userId
      );
      if (targetUserIndex === -1)
        throw new ResourceNotFoundError(
          "User not found in admin's invited list"
        );
      adminUser.invitedUsers[targetUserIndex].isBlocked = isBlocked;
      await userRepository.save(adminUser);

      // const auditId = v4();
      // await this.updateAuditLogHandler(
      //   userId,
      //   adminUser,
      //   auditId,
      //   "Super Admin",
      //   isBlocked
      // );
    }
    await userRepository.save(userInstance);
    const user = await admin.auth().updateUser(userId, {
      disabled: isBlocked,
    });
    return user;
  }

  async deleteUserFromInvitedList(adminId: string, userEmail: string) {
    const userRepository = AppDataSource.getRepository(User);
    const admin = await userRepository.findOne({ where: { userId: adminId } });
    if (!admin) {
      throw new ResourceNotFoundError("Invalid Admin ID provided.");
    }
    const targetUser = admin.invitedUsers.find(
      (cur) => cur.email === userEmail
    );
    if (!targetUser) {
      throw new ResourceNotFoundError(
        "Provided user doesn't exist in this Organisation"
      );
    }
    if (targetUser.onboardingStatus != "PENDING") {
      throw new ResourceNotFoundError("Onboarded user can't be deleted.");
    }
    admin.invitedUsers = admin.invitedUsers.filter(
      (cur) => cur.email != userEmail
    );
    await userRepository.save(admin);
  }

  // updateAuditLogHandler = async (
  //   userId: string,
  //   admin: User,
  //   auditId: string,
  //   modifiedBy: string,
  //   isBlocked: boolean
  // ) => {
  //   const auditRepository = AppDataSource.getRepository(Audit);
  //   const description = `User with ID: ${userId}, ${
  //     isBlocked ? "blocked" : "unblocked"
  //   }.`;
  //   const payload = {
  //     auditId: auditId,
  //     modifiedBy: modifiedBy,
  //     description: description,
  //     auditType: auditType.UPDATED,
  //     owner: admin,
  //   };
  //   const auditInstance = new Audit(payload as Audit);
  //   await auditRepository.insert(auditInstance);
  //   return;
  // };
}

export default SuperAdminService;
