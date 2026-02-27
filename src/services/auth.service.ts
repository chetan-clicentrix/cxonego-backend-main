import * as admin from "firebase-admin";
import verifier from "./firbaseAuth.service";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { sendNotificationtoCustomer } from "./firebaseNotification.service";
// import { Organisation } from "../entity/Organisation";
import { roleNames } from "../common/utils";
import { ResourceNotFoundError } from "../common/errors";
import { userInfo } from "../interfaces/types";
// import { Audit } from "../entity/Audit";
// import { v4 } from "uuid";

class AuthService {
  async updateUserPassword(password: string, userId: string) {
    try {
      const user = await verifier.updateUser(userId, { password: password });
      return user;
    } catch (error) {
      return;
    }
  }

  forgotPassword(email: string): Promise<boolean | string> {
    return new Promise(async (resolve, _reject) => {
      const otp = Math.floor(Math.random() * 900000 + 100000);
      const message = `Your otp is ${otp}`;
      const user: User = (await AppDataSource.getRepository(User).findOne({
        where: {
          email: email,
        },
      })) as User;
      const result = await this.sendNotification(user.userId, message);
      if (!result) {
        resolve(false);
      }
      resolve(user.userId);
    });
  }

  verifyOTP(userId: string, otp: string) {
    return new Promise((resolve, reject) => {
      AppDataSource.getRepository(User)
        .findOne({
          where: {
            userId: userId,
            otp: otp,
          },
        })
        .then((result) => {
          if (result) {
            const otpValidityMinutes = 5;
            const updatededAt = new Date(result.updatedAt);
            const validTimestamp = new Date(
              result.updatedAt.getTime() + otpValidityMinutes * 60 * 1000
            );
            if (updatededAt < validTimestamp) {
              AppDataSource.getRepository(User).update(userId, { otp: "" });
              resolve(true);
            } else {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        })
        .catch(reject);
    });
  }

  async checkPermissions(userId: string) {
    const user = await AppDataSource.getRepository(User).findOne({
      where: {
        userId: userId,
      },
    });
  }

  async sendNotification(userId: string, message: string) {
    try {
      const pushToken: User = (await AppDataSource.getRepository(User).findOne({
        where: {
          userId: userId,
        },
      })) as User;

      const result: number = await sendNotificationtoCustomer(
        "otp for cxonego",
        message,
        pushToken.fcmAndroidToken
      );
      //console.log( result`[Symbol(Response internals)]`.status);
      if (result > 299) {
      }
      if (result > 299) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async disableFirebaseUser(
    userId: string,
    isBlocked: boolean,
    userInfo: userInfo
  ) {
    try {
      if (userId === "") {
        throw new ResourceNotFoundError("User ID not found");
      }
      const isAdmin = userInfo.role.some(
        (role) => role.roleName === roleNames.ADMIN
      );
      if (!isAdmin) {
        throw new ResourceNotFoundError("Only admin can disable user.");
      }

      const userRepository = AppDataSource.getRepository(User);
      const currentUser = await userRepository.findOne({
        where: {
          userId: userId,
        },
      });
      if (!currentUser) {
        throw new ResourceNotFoundError("User not found");
      }

      currentUser.isBlocked = isBlocked;
      const adminUser = await userRepository.findOne({
        where: {
          userId: userInfo.userId,
        },
      });

      if (!adminUser) {
        throw new ResourceNotFoundError("Invalid token provided.");
      }

      if (adminUser.invitedUsers) {
        const targetUserIndex = adminUser.invitedUsers.findIndex(
          (user) => user?.id === userId
        );
        if (targetUserIndex != -1) {
          adminUser.invitedUsers[targetUserIndex].isBlocked = isBlocked;
        }
        await userRepository.save(adminUser);
      }
      await userRepository.save(currentUser);
      const user = await admin.auth().updateUser(userId, {
        disabled: isBlocked,
      });

      // const auditId = v4();
      // await this.updateAuditLogHandler(
      //   userId,
      //   adminUser,
      //   auditId,
      //   adminUser.email,
      //   isBlocked
      // );
      return user;
    } catch (error) {
      return;
    }
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

export default AuthService;
