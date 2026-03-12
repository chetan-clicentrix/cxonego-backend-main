import { AppDataSource } from "../data-source";
// import verifier from "./firbaseAuth.service"; //firbase verifier
import { User } from "../entity/User";
import { Role } from "../entity/Role";
import { roleNames, subscriptionStatus } from "../common/utils";
import { EntityManager, In, UpdateResult } from "typeorm";
import { EmailNotificationService } from "./emailNotification.service";
import { EmailType } from "../entity/SentEmailLog";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { encryption } from "../common/utils";
import { InviteUserType } from "../schemas/comman.schemas";
import { Organisation } from "../entity/Organisation";
import {
  orgnizationDecryption,
  planDecryption,
  subscriptionDecryption,
  userDecryption,
} from "./decryption.service";
import { Request } from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { decrypt } from "../common/utils";
import {
  IsIinvitationRevokedSchemaType,
  UpdateUserProfileSchemaType,
  UpdateUserRoleSchemaType,
  CreateUserDirectlySchemaType,
} from "../schemas/user.schemas";
import { CustomRequest, userInfo } from "../interfaces/types";
import { Subscription } from "../entity/Subscription";
import * as admin from "firebase-admin";

class UserServices {
  async updateProfile(
    payload: User,
    userId: string,
    organizationId: string,
    userole: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      let amIAdmin: boolean = false;
      const userRepository = transactionEntityManager.getRepository(User);
      const roleRepository = transactionEntityManager.getRepository(Role);
      const orgRepository =
        transactionEntityManager.getRepository(Organisation);
      let user = await userRepository.findOne({ where: { userId: userId } });

      if (!user) {
        throw new ResourceNotFoundError("User not found");
      }

      //get the count if orgid is present or not in user table
      const count = await userRepository
        .createQueryBuilder("user")
        .where("user.organisationOrganisationId = :id", { id: organizationId })
        .getCount();

      const orgObject = await orgRepository
        .createQueryBuilder("Organisation")
        // .leftJoinAndSelect("Organisation.subscriptions", "subscription")
        .where("Organisation.organisationId = :orgId", {
          orgId: organizationId,
        })
        .getOne();

      const userObj = new User();
      userObj.userId = userId;
      if (payload.firstName) userObj.firstName = encryption(payload?.firstName);
      if (payload.lastName) userObj.lastName = encryption(payload?.lastName);
      if (payload.countryCode)
        userObj.countryCode = encryption(payload?.countryCode);
      if (payload.phone) userObj.phone = encryption(payload?.phone);
      if (payload.country) userObj.country = encryption(payload?.country);
      if (payload.state) userObj.state = encryption(payload?.state);
      if (payload.city) userObj.city = encryption(payload?.city);
      if (payload.theme) userObj.theme = encryption(payload?.theme);
      if (payload.currency) userObj.currency = encryption(payload?.currency);
      if (payload.industry) userObj.industry = encryption(payload?.industry);
      if (payload.jobtitle) userObj.jobtitle = encryption(payload?.jobtitle);
      if (payload.primaryIntension)
        userObj.primaryIntension = encryption(payload?.primaryIntension);
      if (payload.fcmWebToken) userObj.fcmWebToken = payload?.fcmWebToken;
      if (payload.fcmAndroidToken)
        userObj.fcmAndroidToken = payload?.fcmAndroidToken;
      if (payload.otp) userObj.otp = encryption(payload?.otp);
      if (payload.isActive) userObj.isActive = payload?.isActive;
      if (payload.emailVerified) userObj.emailVerified = payload?.emailVerified;
      if (payload.privacy_consent_given)
        userObj.privacy_consent_given = payload?.privacy_consent_given;
      if (payload.privacy_consent_signed_date)
        userObj.privacy_consent_signed_date =
          payload?.privacy_consent_signed_date;

      if (count == 0 && orgObject) {
        const role = await roleRepository.findOne({
          where: { roleName: roleNames.ADMIN },
        });
        if (!role) {
          throw new ResourceNotFoundError("Role not found");
        }
        //make user as admin
        userObj.roles = [role];
        amIAdmin = true;
        userObj.organisation = orgObject;
      } else {
        //other wise whatever role come from invitation then it assign
        if (userole) {
          const role = await roleRepository.findOne({
            where: { roleName: userole },
          });

          if (!role) {
            throw new ResourceNotFoundError("Role not found");
          }
          userObj.roles = [role];
          if (orgObject) userObj.organisation = orgObject;
        }
      }

      //I'm admin, add me in my invited users.
      if (amIAdmin) {
        userObj.invitedUsers = [
          {
            id: userId,
            name: payload.firstName + " " + payload.lastName,
            email: payload.email,
            onboardingStatus: "ONBOARDED",
            role: userObj.roles[0].roleName,
            isBlocked: false,
          },
        ];
      }
      //I'm not admin so give me the subscription of my org.
      // if (!amIAdmin && orgObject?.subscriptions) {
      //   userObj.subscriptions = orgObject?.subscriptions;
      // }
      const update = await userRepository.save(userObj);
      //inform my admin that i am onboarded.
      if (!amIAdmin) {
        const adminUser = await userRepository
          .createQueryBuilder("User")
          .leftJoinAndSelect("User.organisation", "Organisation")
          .leftJoinAndSelect("User.roles", "Role")
          .where("Organisation.organisationId = :id", {
            id: organizationId,
          })
          .andWhere("Role.roleName = :roleName", {
            roleName: roleNames.ADMIN,
          })
          .select(["User"])
          .getOne();

        if (adminUser) {
          adminUser?.invitedUsers?.forEach((invite) => {
            if (invite.email.toLowerCase() === payload.email.toLowerCase()) {
              invite.name = payload.firstName + " " + payload.lastName;
              invite.onboardingStatus = "ONBOARDED";
              invite.id = userId;
            }
          });

          await AppDataSource.getRepository(User).save(adminUser);
        }
      }

      return update;
    } catch (error) {
      console.log(error);
      throw new Error("Fail to update user");
    }
  }

  async updateSertUser(payload: User, userole: string) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const roleRepository = AppDataSource.getRepository(Role);

      let userIsExists = await userRepository.findOne({
        where: { userId: payload.userId },
      });

      if (!userIsExists) {
        userIsExists = await userRepository.findOne({
          where: { email: encryption(payload.email) },
        });
      }

      if (!userIsExists) {
        userIsExists = await userRepository.findOne({
          where: { email: encryption(payload.email.toLowerCase()) },
        });
      }

      if (userIsExists) {
        // If user exists but userId is different (e.g. legacy user or different auth provider), check if we need to update the ID
        if (userIsExists.userId !== payload.userId) {
          const oldUserId = userIsExists.userId;
          // Updating primary key requires QueryBuilder or explicit update
          await userRepository
            .createQueryBuilder()
            .update(User)
            .set({ userId: payload.userId })
            .where("userId = :id", { id: oldUserId })
            .execute();

          userIsExists.userId = payload.userId;
        }
        userIsExists = await userDecryption(userIsExists);
        return userIsExists;
      }

      const user = new User();
      user.userId = payload?.userId;
      if (payload?.email) user.email = encryption(payload?.email);
      user.emailVerified = payload?.emailVerified;
      user.isActive = true;
      if (payload?.fcmWebToken) user.fcmWebToken = payload?.fcmWebToken;
      if (payload?.fcmAndroidToken)
        user.fcmAndroidToken = payload?.fcmAndroidToken;

      if (payload.firstName) user.firstName = encryption(payload?.firstName);
      if (payload.lastName) user.lastName = encryption(payload?.lastName);
      if (payload.countryCode)
        user.countryCode = encryption(payload?.countryCode);
      if (payload.phone) user.phone = encryption(payload?.phone);
      if (payload.country) user.country = encryption(payload?.country);
      if (payload.state) user.state = encryption(payload?.state);
      if (payload.city) user.city = encryption(payload?.city);
      if (payload.theme) user.theme = encryption(payload?.theme);
      if (payload.currency) user.currency = encryption(payload?.currency);
      if (payload.industry) user.industry = encryption(payload?.industry);
      if (payload.jobtitle) user.jobtitle = encryption(payload?.jobtitle);
      if (payload.primaryIntension)
        user.primaryIntension = encryption(payload?.primaryIntension);
      if (payload.otp) user.otp = encryption(payload?.otp);
      if (payload.privacy_consent_given)
        user.privacy_consent_given = payload?.privacy_consent_given;
      if (payload.privacy_consent_signed_date)
        user.privacy_consent_signed_date = payload?.privacy_consent_signed_date;

      //other wise whatever role come from invitation then it assign
      if (userole) {
        const role = await roleRepository.findOne({
          where: { roleName: userole },
        });

        if (!role) {
          throw new ResourceNotFoundError("Role not found");
        }
        user.roles = [role];
      }

      let res = await userRepository.save(user);
      res = await userDecryption(res);
      return res;
    } catch (error) {
      console.log("ERR>>>>", error);
      throw new Error("fail to create user");
    }
  }

  async getUserById(userId: string) {
    try {
      let user = await AppDataSource.getRepository(User)
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.organisation", "organisation")
        .leftJoinAndSelect("user.roles", "role")
        .leftJoinAndSelect("organisation.subscriptions", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .where("user.userId = :userId", { userId })
        .select(["user", "role", "organisation", "subscription", "plan"])
        .getOne();

      if (!user) {
        throw new ResourceNotFoundError("User not found");
      }

      if (user?.organisation?.subscriptions.length > 1) {
        let currentActiveSubscription: Subscription | null = null;
        for (const subscription of user.organisation.subscriptions) {
          if (
            subscription.subscription_status ===
            subscriptionStatus.SUBSCRIPTION_ACTIVE &&
            subscription.endDateTime
          ) {
            const endDateTime = new Date(subscription.endDateTime);
            const today = new Date();
            if (endDateTime < today) continue;
            if (!currentActiveSubscription)
              currentActiveSubscription = subscription;
            else if (currentActiveSubscription) {
              const endDateTime = new Date(subscription.endDateTime);
              const currentActiveSubscriptionEndDateTime = new Date(
                currentActiveSubscription.endDateTime!
              );
              if (currentActiveSubscriptionEndDateTime > endDateTime) {
                currentActiveSubscription = subscription;
              }
            }
          }
        }
        user.organisation.subscriptions = currentActiveSubscription
          ? [currentActiveSubscription]
          : [];
      }

      user = await userDecryption(user);
      if (user.organisation) {
        user.organisation = await orgnizationDecryption(user.organisation);
        if (user.organisation.subscriptions.length > 0) {
          user.organisation.subscriptions[0] = await subscriptionDecryption(
            user.organisation.subscriptions[0]
          );
          user.organisation.subscriptions[0].plan = await planDecryption(
            user.organisation.subscriptions[0].plan
          );
        }
      }
      return user;
    } catch (error) {
      return;
    }
  }
  async getUsers(request: Request) {
    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;
    const searchText = (request.query.searchText as string) || "";
    const isBlocked: string | boolean =
      (request.query.isBlocked as string) || "";

    let query = AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.organisation", "organisation")
      .leftJoinAndSelect("organisation.subscriptions", "subscription")
      .leftJoinAndSelect("subscription.plan", "plan")
      .leftJoinAndSelect("user.roles", "role")
      .where("user.organisation is not null");
    if (isBlocked === "true") {
      query.where("user.isBlocked = :isBlocked", { isBlocked: true });
    } else if (isBlocked === "false") {
      query.where("user.isBlocked = :isBlocked", { isBlocked: false });
    }
    query
      .select(["user", "role", "organisation", "subscription", "plan.planType"])
      .orderBy("user.updatedAt", "DESC");
    const [users, total] = await query.getManyAndCount();

    for (let user of users) {
      user = await userDecryption(user);
      user.organisation = await orgnizationDecryption(user.organisation);
      if (user.organisation.subscriptions.length > 0) {
        const activeSubscription = user.organisation.subscriptions.find(
          (sub) =>
            sub.subscription_status === subscriptionStatus.SUBSCRIPTION_ACTIVE
        );
        if (activeSubscription) {
          user.organisation.subscriptions = [activeSubscription];
          user.organisation.subscriptions[0] = await subscriptionDecryption(
            user.organisation.subscriptions[0]
          );
          user.organisation.subscriptions[0].plan = await planDecryption(
            user.organisation.subscriptions[0].plan
          );
        } else {
          user.organisation.subscriptions.length = 0;
        }
      }
    }
    const filteredUsers = filterUsersByQuery(users, searchText).slice(
      skip,
      skip + limit
    );
    return { users: filteredUsers, total };
  }
  async isUserExists(userId: string) {
    try {
      const user = await AppDataSource.getRepository(User).findOneBy({
        userId: userId,
      });
      if (user) {
        return user;
      }
      return false;
    } catch (error) {
      throw new Error("somthing went wrong");
    }
  }
  async addUserRole(
    roleName: Array<string>,
    userId: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const userRepo = transactionEntityManager.getRepository(User);
      const userInstance = await userRepo.findOne({
        where: {
          userId: userId,
        },
      });
      if (!userInstance) {
        throw new Error("user not found");
      }
      const roleRepo = transactionEntityManager.getRepository(Role);
      const roleInstance = await roleRepo.find({
        where: {
          roleName: In(roleName),
        },
      });
      if (!roleInstance) {
        throw new Error("role not found");
      }
      userInstance.roles.push(...roleInstance);
      await userRepo.save(userInstance);
      return userInstance;
    } catch (error) {
      throw new Error(error);
    }
  }
  async deleteUserRole(
    roleName: string,
    userId: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const userRepo = transactionEntityManager.getRepository(User);
      const userInstance = await userRepo.findOne({
        where: {
          userId: userId,
        },
      });
      if (!userInstance) {
        throw new Error("user not found");
      }
      userInstance.roles = Object.values(userInstance.roles).filter((role) => {
        return role.roleName !== roleName;
      });
      const user = await userRepo.save(userInstance);
      return user;
    } catch (error) {
      throw new Error(error);
    }
  }
  async createRole(role: Role, transactionEntityManager: EntityManager) {
    try {
      const roleRepo = transactionEntityManager.getRepository(Role);
      const roleInstance = await roleRepo.findOne({
        where: {
          roleName: role.roleName,
        },
      });
      if (!roleInstance) {
        throw new Error("role already exists");
      }
      const roleEntity = new Role();
      roleEntity.roleName = role.roleName;
      roleEntity.description = role.description;
      return await roleRepo.save(roleEntity);
    } catch (error) {
      return;
    }
  }

  async getRoles() {
    try {
      const role = await AppDataSource.getRepository(Role).find();
      return role;
    } catch (error) {
      return;
    }
  }
  async updateRole(role: Role, roleId: number) {
    try {
      const roleRepo = await AppDataSource.getRepository(Role);
      const roleInstance = await roleRepo.findOne({
        where: {
          roleId: roleId,
        },
      });
      if (!roleInstance) {
        throw new Error("role not found");
      }
      roleInstance.roleName = role.roleName;
      roleInstance.description = role.description;
      return await roleRepo.save(roleInstance);
    } catch (error) {
      throw new Error(error);
    }
  }

  async deleteRole(roleId: number) {
    try {
      const roleRepo = await AppDataSource.getRepository(Role);
      const role = await roleRepo.findOne({
        where: {
          roleId: roleId,
        },
      });
      if (!role) {
        throw new Error("role not found");
      }

      return await roleRepo.delete(roleId);
    } catch (error) {
      throw new Error(error);
    }
  }
  async inviteUser(invites: InviteUserType[], hostUserId: string) {
    if (!hostUserId) {
      throw new ResourceNotFoundError("Admin ID not found, please try again.");
    }
    const userRepository = AppDataSource.getRepository(User);
    const adminUserInstance = await userRepository
      .createQueryBuilder("User")
      .leftJoinAndSelect("User.subscriptions", "Subscription")
      .leftJoinAndSelect("Subscription.plan", "Plan")
      .where("User.userId = :hostUserId", { hostUserId })
      .getOne();

    if (!adminUserInstance) {
      throw new ResourceNotFoundError(
        "Invalid Admin ID provided, please try again."
      );
    }

    //find the active subscription plan
    const activeSubscription = adminUserInstance?.subscriptions.find(
      (sub) =>
        sub.subscription_status === subscriptionStatus.SUBSCRIPTION_ACTIVE
    );

    if (!activeSubscription) {
      throw new ResourceNotFoundError(
        "No Active Subscription Plan found on your account, please purchase a plan to continue our services."
      );
    }

    const activePlan = await planDecryption(activeSubscription.plan);
    const maxNoOfUsers = parseInt(activePlan?.noOfUsers, 10);

    const alreadyInvitedUsers = adminUserInstance.invitedUsers
      ? adminUserInstance.invitedUsers.length
      : 0;

    if (alreadyInvitedUsers >= maxNoOfUsers) {
      throw new ResourceNotFoundError(
        "Maximum number of users limit reached, please upgrade your plan to add more users in your organisation."
      );
    }

    const adminFirstName = decrypt(adminUserInstance?.firstName) || "";
    const adminLastName = decrypt(adminUserInstance?.lastName) || "";
    const adminName = `${adminFirstName} ${adminLastName}`;

    if (invites.length == 0) {
      throw new ResourceNotFoundError("Invite array can not be empty.");
    }
    let newInvites = 0;
    //start email flow.
    const subject =
      "Join Us on CXOneGo – Revolutionize Your Customer Relationship Management!";

    // Initialize email service
    const emailService = new EmailNotificationService();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (invites.length > 0) {
      for (let invite of invites) {

        const inviteLink = `${frontendUrl}/sign-up?email=${encodeURIComponent(
          invite.email
        )}&company=${encodeURIComponent(invite.company)}&role=${encodeURIComponent(
          invite.role
        )}&organizationId=${invite.organizationId}`;


        const htmlTemplate = `
        <head>
        <title>CXOneGo Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <p style="margin: 0; padding: 0;">
            <strong>Dear ${invite?.email.split("@")[0]},</strong>
          </p>
          <p style="margin: 20px 0;">
            I hope this message finds you well!
          </p>
          <p style="margin: 20px 0;">
            ${adminName} has invited you to join as <strong>${invite?.role
          }</strong> in organization <strong>${invite?.company
          } on CXOneGo. Please click on the button below to accept the invitation.
                
                <br> <br> 
                <a href="${inviteLink}"><Button>Accept</Button></a>
        <br>
        Once you click on Accept Link, you will be prompted to register yourself, first go through registration steps then you will be able to login with your credentials.
                <br> <br> 

                Best regards,<br>
                CXOneGo Team. <br>    
                </h3>
                <p>
                </body>
                </html>             
                `;

        // Send invitation email using Microsoft Email Service
        try {
          const emailResult = await emailService.sendEmail({
            to: invite.email,
            subject: subject,
            bodyHtml: htmlTemplate,
            emailType: EmailType.CUSTOM,
            sentById: hostUserId,
            organizationId: invite.organizationId
          });
          console.log(`✓ Email queued successfully: Job ID ${emailResult.jobId}`);
        } catch (emailError: any) {
          console.error(`Failed to queue invitation email for ${invite.email}:`, emailError.message);
          // Continue with user invitation even if email fails
        }


        const duplicateEntry =
          adminUserInstance.invitedUsers === null
            ? false
            : adminUserInstance.invitedUsers.some(
              (user) =>
                user.email === invite?.email && user.role === invite?.role
            );

        if (!duplicateEntry) {
          const newInvite = {
            id: null,
            name: "N/A",
            email: invite?.email,
            role: invite?.role,
            onboardingStatus: "PENDING",
            isBlocked: false,
          };
          if (adminUserInstance.invitedUsers) {
            adminUserInstance.invitedUsers.push(newInvite);
          } else {
            adminUserInstance.invitedUsers = [newInvite];
          }
          await userRepository.save(adminUserInstance);
        }
        newInvites += 1;
        if (newInvites + alreadyInvitedUsers >= maxNoOfUsers) break;
      }
    }
    return {
      message: `${newInvites} new user(s) have been invited successfully, you have ${maxNoOfUsers - alreadyInvitedUsers - newInvites
        } invites left.`,
    };
  }

  async createUserDirectly(
    payload: CreateUserDirectlySchemaType,
    adminUserId: string
  ) {
    try {
      // 1. Verify admin permissions
      const userRepository = AppDataSource.getRepository(User);
      const adminUser = await userRepository.findOne({
        where: { userId: adminUserId },
        relations: ["roles", "organisation"],
      });

      if (!adminUser) {
        throw new ResourceNotFoundError("Admin user not found");
      }

      if (adminUser.roles[0].roleName !== roleNames.ADMIN) {
        throw new ValidationFailedError("Only admins can create users directly");
      }

      // 2. Verify organization exists
      const orgRepository = AppDataSource.getRepository(Organisation);
      const organization = await orgRepository.findOne({
        where: { organisationId: payload.organizationId },
      });

      if (!organization) {
        throw new ResourceNotFoundError("Organization not found");
      }

      // 3. Create user in Firebase
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().createUser({
          email: payload.email,
          password: payload.password,
          emailVerified: true, // Auto-verify email for admin-created users
        });
      } catch (firebaseError: any) {
        if (firebaseError.code === "auth/email-already-exists") {
          throw new ValidationFailedError("Email already exists");
        }
        throw new Error(`Firebase error: ${firebaseError.message}`);
      }

      // 4. Get role from database
      const roleRepository = AppDataSource.getRepository(Role);
      const role = await roleRepository.findOne({
        where: { roleName: payload.role },
      });

      if (!role) {
        // Rollback: delete Firebase user if role not found
        await admin.auth().deleteUser(firebaseUser.uid);
        throw new ResourceNotFoundError("Role not found");
      }

      // 5. Create user in database
      const newUser = new User();
      newUser.userId = firebaseUser.uid;
      newUser.email = encryption(payload.email);
      newUser.emailVerified = true;
      newUser.isActive = true;
      newUser.privacy_consent_given = "Yes";
      newUser.privacy_consent_signed_date = new Date();
      newUser.organisation = organization;
      newUser.roles = [role];

      if (payload.firstName) newUser.firstName = encryption(payload.firstName);
      if (payload.lastName) newUser.lastName = encryption(payload.lastName);
      if (payload.phone) newUser.phone = encryption(payload.phone);
      if (payload.jobtitle) newUser.jobtitle = encryption(payload.jobtitle);
      if (payload.countryCode) newUser.countryCode = encryption(payload.countryCode);

      try {
        await userRepository.save(newUser);
      } catch (dbError: any) {
        // Rollback: delete Firebase user if database save fails
        await admin.auth().deleteUser(firebaseUser.uid);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // 6. Update admin's invitedUsers array
      adminUser.invitedUsers = adminUser.invitedUsers || [];
      adminUser.invitedUsers.push({
        id: firebaseUser.uid,
        name:
          payload.firstName && payload.lastName
            ? `${payload.firstName} ${payload.lastName}`
            : "N/A",
        email: payload.email,
        role: payload.role,
        onboardingStatus: "ONBOARDED", // Directly onboarded
        isBlocked: false,
      });

      await userRepository.save(adminUser);

      return {
        userId: firebaseUser.uid,
        email: payload.email,
        role: payload.role,
        message: "User created successfully and can now log in",
      };
    } catch (error) {
      console.error("Error in createUserDirectly:", error);
      throw error;
    }
  }
  async partiallyUpadateUser(
    userId: string,
    payload: User
  ): Promise<UpdateResult> {
    try {
      const contact: UpdateResult = await AppDataSource.getRepository(
        "User"
      ).update(userId, { ...payload });
      return contact;
    } catch (error) {
      return error;
    }
  }

  async getAllUserDataOrgnizationWise(
    userId: string,
    transactionEntityManager: EntityManager
  ) {
    let organizationId;
    let user = await transactionEntityManager
      .getRepository(User)
      .createQueryBuilder("user")
      .select()
      .leftJoinAndSelect("user.organisation", "Organisation")
      .where("user.userId = :id", { id: userId })
      .getOne();

    let userData;
    if (user) {
      organizationId = user?.organisation?.organisationId;

      userData = await transactionEntityManager
        .getRepository(User)
        .createQueryBuilder("user")
        .select([
          "user.userId",
          "user.email",
          "user.firstName",
          "user.lastName",
        ])
        .where("user.organisationOrganisationId = :orgid", {
          orgid: organizationId,
        })
        .getMany();

      for (let user of userData) {
        user = await userDecryption(user as User);
      }
    } else {
      throw new ResourceNotFoundError("Users data not found");
    }

    return userData;
  }

  //below api is not use
  async addUserDetails(payload: User) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const roleRepository = AppDataSource.getRepository(Role);
      const orgRepository = AppDataSource.getRepository(Organisation);
      const user = new User();

      //check orgid is present in user table or not
      const orgId = "e8384e97-d03b-4515-836b-66b7f3ec5631";

      const count = await userRepository
        .createQueryBuilder("user")
        .where("user.organisationOrganisationId = :id", { id: orgId })
        .getCount();
      console.log("count : >>>>>>>>>>", count);

      const orgObject = await orgRepository
        .createQueryBuilder("Organisation")
        .where("Organisation.organisationId = :orgId", { orgId: orgId })
        .getOne();

      if (count == 0 && orgObject) {
        const role = await roleRepository.findOne({
          where: { roleName: roleNames.ADMIN },
        });
        if (!role) {
          throw new ResourceNotFoundError("Role not found");
        }
        //make user as admin
        user.userId = payload.userId;
        user.email = payload.email;
        user.emailVerified = true;
        user.roles = [role]; // Assign default SALESPERSON role to user
        user.organisation = orgObject;
      } else {
        //other wise whatever role come from invitation then it assign
      }

      return await userRepository.save(user);
    } catch (error) {
      console.log(error);
      throw new Error("fail to create user");
    }
  }

  async getUsersSubscriptions(request: Request) {
    const userRepository = AppDataSource.getRepository(User);

    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 10;
    const searchText = (request.query.searchText as string) || "";
    const skip = (page - 1) * limit;
    const planType = (request.query.planType as string) || "";
    const payment_status = (request.query.payment_status as string) || "";
    const subscription_status =
      (request.query.subscription_status as string) || "";

    const query = userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.subscriptions", "subscription")
      .leftJoinAndSelect("user.organisation", "organisation")
      .leftJoinAndSelect("subscription.plan", "plan");

    if (planType != "") {
      query.where("plan.planType = :planType", { planType });
    }
    if (payment_status != "") {
      query.andWhere("subscription.payment_status = :payment_status", {
        payment_status,
      });
    }
    if (subscription_status != "") {
      query.andWhere(
        "subscription.subscription_status = :subscription_status",
        {
          subscription_status,
        }
      );
    }
    query
      .select([
        "user.createdAt",
        "user.updatedAt",
        "user.userId",
        "user.email",
        "user.phone",
        "user.firstName",
        "user.lastName",
        "organisation.name",
        "organisation.organisationId",
        "subscription",
        "plan.planId",
        "plan.planType",
      ])
      .orderBy("subscription.updatedAt", "DESC");

    const [users, total] = await query.getManyAndCount();
    for (let user of users) {
      user = await userDecryption(user);
      for (let subscription of user.subscriptions) {
        subscription = await subscriptionDecryption(subscription);
      }
      user.organisation = await orgnizationDecryption(user.organisation);
    }

    const filteredUsers = filterUsersByQuery(users, searchText);
    return {
      users: filteredUsers.slice(skip, skip + limit),
      searchResults: filteredUsers?.length,
      queryResults: total,
    };
  }

  updateUserRole = async (request: AuthenticatedRequest) => {
    const { userId, role }: UpdateUserRoleSchemaType = request.body;

    const userInfo = request.user;
    if (!userInfo) {
      throw new ValidationFailedError("User information not found");
    }
    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    const adminUser = await userRepository.findOne({
      where: { userId: userInfo.userId },
      relations: ["roles"],
    });
    if (adminUser) {
      if (adminUser.roles[0].roleName !== roleNames.ADMIN) {
        throw new ValidationFailedError("Only Admin can update user role");
      }
      const targetUserIndex = adminUser.invitedUsers.findIndex((user) => {
        if (user.id === userId) {
          return user;
        }
      });

      if (targetUserIndex !== -1) {
        adminUser.invitedUsers[targetUserIndex].role = role;
      }

      const userInstance = await userRepository.findOneBy({ userId });
      if (!userInstance) {
        throw new ResourceNotFoundError("User not found");
      }

      const roleInstance = await roleRepository.findOneBy({ roleName: role });
      if (!roleInstance) {
        throw new ResourceNotFoundError("Role not found");
      }

      userInstance.roles = [roleInstance];
      await userRepository.save(userInstance);
      await userRepository.save(adminUser);
      return;
    }
  };

  updateUserProfile = async (
    request: Request,
    transactionEntityManager: EntityManager
  ) => {
    const userId = request.params.userId;
    const body: UpdateUserProfileSchemaType = request.body;
    const userRepository = transactionEntityManager.getRepository(User);
    const user = await userRepository.findOneBy({ userId });
    if (!user) {
      throw new ResourceNotFoundError("User not found");
    }

    user.firstName = encryption(body.firstName);
    user.lastName = encryption(body.lastName);
    user.phone = encryption(body.phone);
    user.countryCode = encryption(body.countryCode);
    user.currency = encryption(body.currency);

    await userRepository.save(user);
    return;
  };

  deleteUser = async (userId: string, userInfo: userInfo) => {
    const userRepository = AppDataSource.getRepository(User);
    const targetUser = await userRepository.findOneBy({
      userId: userId,
    });

    if (!targetUser) {
      throw new ResourceNotFoundError("Invalid UserID provided.");
    }

    await userRepository.save(targetUser);
    const adminUser = await userRepository.findOneBy({
      userId: userInfo.userId,
    });

    if (adminUser) {
      adminUser.invitedUsers = adminUser.invitedUsers.filter(
        (user) => user.id != userId
      );
      await userRepository.save(adminUser);
    }

    return;
  };

  isUserOnboarded = async (userEmail: string) => {
    if (!userEmail || userEmail == undefined) {
      throw new ResourceNotFoundError("Email not provided.");
    }
    const userRepository = AppDataSource.getRepository(User);

    const encryptedEmail = encryption(userEmail);

    let existingUser = await userRepository.findOne({
      where: { email: encryptedEmail },
      relations: ["organisation", "roles"],
    });

    if (existingUser) {
      existingUser = await userDecryption(existingUser);
      if (existingUser.organisation) {
        existingUser.organisation = await orgnizationDecryption(
          existingUser.organisation
        );
      }
      return existingUser;
    }
    const allUsers = await userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.organisation", "organisation")
      .leftJoinAndSelect("user.roles", "role")
      .andWhere("role.roleName = :roleName", {
        roleName: roleNames.ADMIN,
      })
      .getMany();

    let targetUser;
    for (const user of allUsers) {
      if (user.invitedUsers) {
        for (const cur of user.invitedUsers) {
          if (cur.email.toLowerCase() === userEmail.toLowerCase()) {
            // If user is already onboarded (created directly), do not return invitation details
            // This prevents the frontend from forcing the onboarding flow
            if (cur.onboardingStatus === "ONBOARDED") {
              break;
            }

            targetUser = userDecryption(user);
            user.organisation = await orgnizationDecryption(user.organisation);
            break;
          }
        }
      }
    }
    return targetUser;
  };

  isInvitationRevoked = async (payload: IsIinvitationRevokedSchemaType) => {
    const { organizationId, userEmail } = payload
    const orgRepository = AppDataSource.getRepository(Organisation);
    const organization = await orgRepository.createQueryBuilder("organization")
      .leftJoinAndSelect("organization.users", "user")
      .leftJoinAndSelect("user.roles", "role")
      .where("organization.organisationId = :organizationId", { organizationId })
      .getOne()

    if (!organization) {
      throw new ResourceNotFoundError("Provided Organization does not exist.")
    }
    const admin = organization.users.find(cur => cur.roles[0].roleName === roleNames.ADMIN)

    if (admin === undefined) throw new ResourceNotFoundError("Any proper Admin not found in this organization.")

    const isInvitationValid = admin.invitedUsers.some(cur => cur.email === userEmail);
    return isInvitationValid;
  }
}

function filterUsersByQuery(users: User[], query: string): User[] {
  if (query === undefined || query === "") return users;
  const lowerCaseQuery = query.toLowerCase();

  return users.filter((user) => {
    const { organisation } = user;

    return (
      user?.firstName?.toLowerCase().includes(lowerCaseQuery) ||
      user?.lastName?.toLowerCase().includes(lowerCaseQuery) ||
      user?.email?.toLowerCase().includes(lowerCaseQuery) ||
      user?.userId?.toLowerCase().includes(lowerCaseQuery) ||
      organisation?.organisationId?.toLowerCase().includes(lowerCaseQuery) ||
      organisation?.name?.toLowerCase().includes(lowerCaseQuery)
    );
  });
}

export default UserServices;
