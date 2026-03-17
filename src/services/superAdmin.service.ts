import { Request } from "express";
import { AppDataSource } from "../data-source";
import { SuperAdmin } from "../entity/SuperAdmin";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { SuperAdminSchemaType } from "../schemas/superAdmin.schemas";
import { EntityManager } from "typeorm";
import * as admin from "firebase-admin";
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
      if (adminUser.invitedUsers) {
        const targetUserIndex = adminUser.invitedUsers.findIndex(
          (user) => user?.id === userId
        );
        if (targetUserIndex !== -1) {
          adminUser.invitedUsers[targetUserIndex].isBlocked = isBlocked;
          await userRepository.save(adminUser);
        }
      }

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
    if (!admin.invitedUsers) {
      return;
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
