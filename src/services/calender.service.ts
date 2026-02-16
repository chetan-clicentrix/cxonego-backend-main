import { AppDataSource } from "../data-source";
import { UpdateResult, EntityManager, Repository } from "typeorm";
import { Role } from "../entity/Role";
import { v4 } from "uuid";
import { Calender } from "../entity/Calender";
import { User } from "../entity/User";
import { Activity } from "../entity/Activity";
import ActivityServices from "../services/activity.service";
import { CalenderUser } from "../entity/CalenderUser";
import { ResourceNotFoundError } from "../common/errors";
import { userInfo } from "../interfaces/types";
import { activityType, encryption, roleNames, decrypt } from "../common/utils";
import { RangeDateType } from "../schemas/comman.schemas";
import {
  calenderDecryption,
  calenderUserDecryption,
  orgnizationDecryption,
  userDecryption,
} from "./decryption.service";
import { EmailNotificationService } from "./emailNotification.service";
import { EmailType } from "../entity/SentEmailLog";
import * as moment from "moment";
import * as moment1 from "moment-timezone";
const activityServices = new ActivityServices();

class CalenderServices {
  async getAllAppointments(userInfo: userInfo) {
    const calenderRepo = AppDataSource.getRepository(Calender);

    const calenderData = await calenderRepo
      .createQueryBuilder("calender")
      .leftJoinAndSelect("calender.orgnizerId", "orgnizer")
      .leftJoinAndSelect("calender.calparticipaters", "CalenderUser")
      .leftJoinAndSelect("CalenderUser.participent", "user")
      .leftJoinAndSelect("calender.organization", "organization")
      // .where("orgnizer.userId = :userId", { userId: userInfo.userId })
      .where("organization.organisationId = :organizationId", {
        organizationId: userInfo.organizationId,
      })
      .select([
        "calender",
        "orgnizer.userId",
        "orgnizer.firstName",
        "orgnizer.lastName",
        "CalenderUser",
      ])
      .orderBy("calender.updatedAt", "DESC")
      .getMany();

    for (let calender of calenderData) {
      calender = await calenderDecryption(calender);
      calender.orgnizerId = await userDecryption(calender.orgnizerId);
      calender.calparticipaters = await calenderUserDecryption(
        calender.calparticipaters
      );
    }
    return calenderData;
  }
  async createCalender(
    payload: Calender,
    userId: string,
    participentEmailId: string[],
    transactionEntityManager: EntityManager
  ) {
    try {
      payload.appointmentId = v4();
      const userRepo = AppDataSource.getRepository(User);
      const userData = await userRepo.findOne({ where: { userId: userId } });

      if (userData) {
        payload.orgnizerId = userData;
        payload.organization = userData?.organisation;
      }

      if (payload.title) payload.title = encryption(payload.title);
      if (payload.agenda) payload.agenda = encryption(payload.agenda);
      if (payload.Notes) payload.Notes = encryption(payload.Notes);

      //save data in calender table
      let calenderInstance = new Calender(payload);
      const calenderObj = await calenderInstance.save();
      //    console.log("calender object is : ",calenderObj);
      const activityPayload = {
        subject: calenderObj.title,
        description: calenderObj.agenda,
        startDate: calenderObj.startDateTime,
        dueDate: calenderObj.endDateTime,
        activityType: calenderObj.type,
        owner: userData,
        appoinment: calenderObj,
        organization: userData?.organisation,
      };
      //save data in activity table
      const activity = new Activity({
        ...activityPayload,
        activityId: await activityServices.getActivityId(new Date()),
      } as Activity);
      await activity.save();

      const calenderUserRepository: Repository<CalenderUser> =
        transactionEntityManager.getRepository(CalenderUser);

      let firstName = "";
      let lastName = "";
      for (let i = 0; i < participentEmailId.length; i++) {
        const userData = await userRepo.findOne({
          where: { email: participentEmailId[i] },
        });

        if (userData) {
          firstName = encryption(userData?.firstName);
          lastName = encryption(userData?.lastName);
        }
        const caluserData = {
          calender: calenderObj,
          participent: userData, //save email as it is insted of ownerId
          email: encryption(participentEmailId[i]),
          firstName: firstName,
          lastName: lastName,
          //using emial access user data and increase 2 col firstName,lastName and save it
        } as CalenderUser;
        //save data in calenderUser table
        await calenderUserRepository.save(caluserData);
        // console.log("calenderObj.startDateTime is ", calenderObj.startDateTime);

        //---------- IST conversion start----------
        // const date = moment(calenderObj.startDateTime);
        // console.log("date is : ",date);
        // const formattedDate = date.format('YYYY-MM-DD');
        // const formattedTime = date.format('HH:mm A');

        // Assuming calenderObj.startDateTime is in UTC
        const date = moment1.tz(calenderObj.startDateTime, "UTC");

        // Convert to IST
        const dateInIST = date.clone().tz("Asia/Kolkata");

        // console.log("date in IST is : ", dateInIST);

        // Format the date and time in IST
        const formattedDate = dateInIST.format("YYYY-MM-DD");
        const formattedTime = dateInIST.format("HH:mm A");

        // console.log("Formatted Date is: ", formattedDate);
        // console.log("Formatted Time is: ", formattedTime);
        //------------IST conversion start-------------

        // Convert to GMT
        const dateGMT = moment.utc(calenderObj.startDateTime);
        // console.log("dateGMT is : ", dateGMT);

        // Format the date in 'YYYY-MM-DD' format
        const formattedDateGMT = dateGMT.format("YYYY-MM-DD");

        // Format the time in 'HH:mm A' format to include AM/PM notation
        const formattedTimeGMT = dateGMT.format("HH:mm A");

        const startDateTime = moment(calenderObj.startDateTime);
        const endDateTime = moment(calenderObj.endDateTime);
        const durationMs = endDateTime.diff(startDateTime);
        const duration = moment.duration(durationMs);

        // Format the duration as HH:mm:ss
        const formattedDuration = `${Math.floor(duration.asHours())
          .toString()
          .padStart(2, "0")}:${duration
            .minutes()
            .toString()
            .padStart(2, "0")}:${duration.seconds().toString().padStart(2, "0")}`;

        // console.log("Meeting Duration:", formattedDuration);

        const mailTemplate = `<html>
            <body>        
            Dear ${participentEmailId[i]},<br><br>
            This email is to confirm our upcoming online meeting, scheduled using CXoneGo calendar. Below are the details for the meeting:
            <br><br>
            Meeting Details:<br><br>
            Title: ${decrypt(calenderObj.title)}<br><br>
            Agenda: ${decrypt(calenderObj.agenda)}<br><br>
            Notes: ${decrypt(calenderObj.Notes)}<br><br>
            IST Date: ${formattedDate}<br><br>
            IST Time: ${formattedTime} (Please note the time)<br><br>
            GMT-Date: ${formattedDateGMT}<br><br>
            GMT-Time: ${formattedTimeGMT}<br><br>
            Duration: ${formattedDuration}<br><br>
            Regards,<br>
            CXOneGo Team.<br> 
            </body>
            </html>`;

        const emailService = new EmailNotificationService();
        try {
          const result = await emailService.sendEmail({
            to: participentEmailId[i],
            subject: `Scheduled Meeting - ${decrypt(calenderObj.title)}`,
            bodyHtml: mailTemplate,
            emailType: EmailType.CUSTOM,
            sentById: userId,
            organizationId: userData?.organisation?.organisationId
          });
          console.log(`✓ Meeting invitation queued for ${participentEmailId[i]}: ${result.jobId}`);
        } catch (error: any) {
          console.error(`Failed to queue meeting invitation for ${participentEmailId[i]}:`, error.message);
        }
      }

      calenderObj.title = decrypt(calenderObj.title);
      calenderObj.agenda = decrypt(calenderObj.agenda);
      calenderObj.Notes = decrypt(calenderObj.Notes);

      if (calenderObj.orgnizerId) {
        calenderObj.orgnizerId = await userDecryption(calenderObj.orgnizerId);
        calenderObj.orgnizerId.organisation = await orgnizationDecryption(
          calenderObj.orgnizerId.organisation
        );
      }

      return calenderObj;
    } catch (error) {
      console.log("Error is", error);
      return;
    }
  }

  async updateCalender(
    payload: Calender,
    user: userInfo,
    participentEmailId: string[],
    appointmentId: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const userRepository = transactionEntityManager.getRepository(User);
      const orgnizerId = payload.orgnizerId.userId;
      const organizer = await userRepository.findOne({
        where: { userId: orgnizerId },
      });
      if (!organizer) {
        throw new ResourceNotFoundError(
          "User not found for owner update, provided user does not exist in your organization"
        );
      }
      const newPayload = {
        title: encryption(payload.title),
        agenda: encryption(payload.agenda),
        startDateTime: payload.startDateTime,
        endDateTime: payload.endDateTime,
        Notes: encryption(payload.Notes),
        modifiedBy: user.email,
        status: payload.status,
        orgnizerId: organizer,
      } as Calender;

      const calenderRepository =
        transactionEntityManager.getRepository(Calender);
      const calender = await calenderRepository.findOne({
        where: { appointmentId: appointmentId },
      });
      if (!calender) {
        throw new ResourceNotFoundError("Calender not found");
      }
      //Calender table update
      const calenderEntity = new Calender(newPayload);
      const update = await calenderRepository.update(
        appointmentId,
        calenderEntity
      );

      //Activity table update
      await transactionEntityManager
        .getRepository(Activity)
        .createQueryBuilder()
        .update(Activity)
        .set({
          subject: payload.title,
          description: payload.agenda,
          startDate: payload.startDateTime,
          dueDate: payload.endDateTime,
          modifiedBy: user.email,
          activityType: activityType.APPOINTMENT,
        })
        .where("appointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .execute();

      //CalenderUser table update
      const calenderUserRepository =
        transactionEntityManager.getRepository(CalenderUser);
      const userRepo = transactionEntityManager.getRepository(User);

      const calender_user_ids = await calenderUserRepository
        .createQueryBuilder("CalenderUser")
        .leftJoinAndSelect("CalenderUser.calender", "Calender")
        .leftJoinAndSelect("CalenderUser.participent", "User")
        .where("CalenderUser.calenderAppointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .getMany();

      //allready exist email array data in caluser table against appointment id
      const existingEmailsArray = calender_user_ids.map((calenderUser) =>
        decrypt(calenderUser?.email)
      );
      let deletedArray = await this.difference(
        existingEmailsArray,
        participentEmailId
      );
      let existingArray = await this.intersection(
        existingEmailsArray,
        participentEmailId
      );
      let newDataArray = await this.difference(
        participentEmailId,
        existingEmailsArray
      );

      //compair incoming and existing data for get deleted data

      for (let i = 0; i < deletedArray.length; i++) {
        //fire delete query on array of deleted data
        await calenderUserRepository
          .createQueryBuilder()
          .softDelete()
          .from(CalenderUser)
          .where("email = :email", { email: deletedArray[i] })
          .execute();
      }

      for (let i = 0; i < newDataArray.length; i++) {
        const userData = await userRepo.findOne({
          where: { email: encryption(newDataArray[i]) },
        });
        if (userData) {
          await calenderUserRepository
            .createQueryBuilder()
            .insert()
            .values({
              id: v4(),
              calender: calender,
              participent: userData,
              email: encryption(newDataArray[i]),
              firstName: userData.firstName,
              lastName: userData.lastName,
            })
            .execute();
        } else {
          //If data not found then insert a new entry
          await calenderUserRepository
            .createQueryBuilder()
            .insert()
            .values({
              id: v4(),
              calender: calender,
              // modifiedBy: user.email,
              email: encryption(newDataArray[i]),
            })
            .execute();
        }
      }

      return update;
    } catch (error) {
      console.log("Error is", error);
      return;
    }
  }

  async difference(array1: string[], array2: string[]) {
    return array1.filter((x) => !array2.includes(x));
  }

  async intersection(array1: string[], array2: string[]) {
    return array1.filter((x) => array2.includes(x));
  }

  async deleteCalender(
    appointmentId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    try {
      const calenderRepository =
        transactionEntityManager.getRepository(Calender);
      const calender = await calenderRepository.findOne({
        where: { appointmentId: appointmentId },
      });
      if (!calender) {
        throw new ResourceNotFoundError("Calender not found");
      }
      //Calender table delete data
      const result = await calenderRepository.softDelete(appointmentId);
      await calenderRepository.update(appointmentId, {
        modifiedBy: user.email,
      });

      //Activity table delete data
      await transactionEntityManager
        .getRepository(Activity)
        .createQueryBuilder()
        .softDelete()
        .from(Activity)
        .where("appointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .execute();

      await transactionEntityManager
        .getRepository(Activity)
        .createQueryBuilder()
        .update(Activity)
        .set({ modifiedBy: user.email })
        .where("appointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .execute();

      await calenderRepository.update(appointmentId, {
        modifiedBy: user.email,
      });
      //calender user table delete data
      await transactionEntityManager
        .getRepository(CalenderUser)
        .createQueryBuilder()
        .softDelete()
        .from(CalenderUser)
        .where("calenderAppointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .execute();

      await transactionEntityManager
        .getRepository(CalenderUser)
        .createQueryBuilder()
        .update(CalenderUser)
        .set({ modifiedBy: user.email })
        .where("calenderAppointmentId = :appointmentId", {
          appointmentId: appointmentId,
        })
        .execute();
      return result;
    } catch (error) {
      console.log("Error is", error);
      return;
    }
  }

  async getAppointments(
    ownerId: string,
    _role: Role[],
    _dateRange: RangeDateType,
    organizationId: string | null,
    transactionEntityManager: EntityManager
  ) {
    let calenderRepo = await transactionEntityManager
      .getRepository(Calender)
      .createQueryBuilder("Calender")
      .leftJoinAndSelect("Calender.orgnizerId", "orgnizer")
      .leftJoinAndSelect("Calender.calparticipaters", "CalenderUser")
      .leftJoinAndSelect("CalenderUser.participent", "user")
      .where("Calender.orgnizerId=:ownerId", { ownerId: ownerId })
      .andWhere("Calender.organizationId=:organizationId", {
        organizationId: organizationId,
      })
      .orderBy("Calender.updatedAt", "DESC");

    /* //sorting is adjust from front end thats why commented code
        if (dateRange) {
            if (dateRange.startDate && dateRange.endDate) {
                calenderRepo.andWhere(
                    "(Calender.startDateTime >= :startDate AND Calender.endDateTime <= :endDate)",
                    {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate,
                    }
                );
            }
        }*/

    let appointments = await calenderRepo.getMany();

    for (let appointment of appointments) {
      appointment = await calenderDecryption(appointment);
      appointment.calparticipaters = await calenderUserDecryption(
        appointment.calparticipaters
      );
    }

    if (appointments.length > 0) {
      const transformedAppointments = appointments.map((appointment) => {
        return {
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
          deletedAt: appointment.deletedAt,
          modifiedBy: appointment.modifiedBy,
          appointmentId: appointment.appointmentId,
          title: appointment.title,
          agenda: appointment.agenda,
          startDateTime: appointment.startDateTime,
          endDateTime: appointment.endDateTime,
          Notes: appointment.Notes,
          type: appointment.type,
          status: appointment.status,
          orgnizerId: {
            userId: appointment?.orgnizerId?.userId,
            email: appointment?.orgnizerId?.email,
            firstName: appointment?.orgnizerId?.firstName,
            lastName: appointment?.orgnizerId?.lastName,
          },
          /*participentEmailId: appointment.calparticipaters.map(participant => {
                        return {
                            userId: participant?.participent?.userId || null,
                            email: participant?.email,
                            firstName: participant?.firstName,
                            lastName: participant?.lastName
                        };
                    })*/
          participentEmailId: appointment?.calparticipaters?.map(
            (participant) => participant.email
          ),
        };
      });

      return transformedAppointments;
    } else {
      return [];
    }
  }

  async getAppointmentById(
    ownerId: string,
    role: Role[],
    appointmentId: string,
    transactionEntityManager: EntityManager
  ) {
    let calenderRepo;
    if (role.length === 1 && role[0].roleName === roleNames.SALESPERSON) {
      calenderRepo = await transactionEntityManager
        .getRepository(Calender)
        .createQueryBuilder("Calender")
        .leftJoinAndSelect("Calender.calparticipaters", "CalenderUser")
        .leftJoinAndSelect("Calender.orgnizerId", "org")
        .leftJoinAndSelect("CalenderUser.participent", "user")
        .where("Calender.orgnizerId=:ownerId", { ownerId: ownerId })
        .andWhere("Calender.appointmentId = :appointmentId", {
          appointmentId: appointmentId,
        });
    } else {
      calenderRepo = await transactionEntityManager
        .getRepository(Calender)
        .createQueryBuilder("Calender")
        .leftJoinAndSelect("Calender.calparticipaters", "CalenderUser")
        .leftJoinAndSelect("Calender.orgnizerId", "org")
        .leftJoinAndSelect("CalenderUser.participent", "user")
        .where("Calender.appointmentId = :appointmentId", {
          appointmentId: appointmentId,
        });
    }

    let appointment = await calenderRepo.getOne();
    // console.log("appointment is : ", appointment);

    if (appointment) {
      appointment = await calenderDecryption(appointment);
      // appointment.orgnizerId = await userDecryption(appointment.orgnizerId);
      appointment.calparticipaters = await calenderUserDecryption(
        appointment.calparticipaters
      );
    }

    const participentEmailIds: string[] = [];
    if (appointment) {
      appointment.calparticipaters.forEach((participant) => {
        if (participant.email) {
          participentEmailIds.push(participant.email);
        }
      });

      const transformedAppointment = {
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        deletedAt: appointment.deletedAt,
        modifiedBy: appointment.modifiedBy,
        appointmentId: appointment.appointmentId,
        title: appointment.title,
        agenda: appointment.agenda,
        startDateTime: appointment.startDateTime,
        endDateTime: appointment.endDateTime,
        Notes: appointment.Notes,
        type: appointment.type,
        status: appointment.status,
        orgnizerId: {
          userId: appointment?.orgnizerId?.userId,
          email: appointment?.orgnizerId?.email
            ? decrypt(appointment?.orgnizerId?.email)
            : "",
          firstName: appointment?.orgnizerId?.firstName
            ? decrypt(appointment?.orgnizerId?.firstName)
            : "",
          lastName: appointment?.orgnizerId?.lastName
            ? decrypt(appointment?.orgnizerId?.lastName)
            : "",
        },
        participentEmailId: participentEmailIds,
      };

      return transformedAppointment;
    } else {
      return {};
    }
  }

  async getAllUserDataByOrgId(
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
        .andWhere("user.userId != :userId", { userId })
        .getMany();

      for (let user of userData) {
        user = await userDecryption(user as User);
      }
    } else {
      throw new ResourceNotFoundError("Users data not found");
    }

    console.log("user data is : ", userData);
    return userData;
  }
}

export default CalenderServices;
