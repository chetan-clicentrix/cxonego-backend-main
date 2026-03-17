import * as moment from "moment";
import * as moment1 from "moment-timezone";
import * as not from "../services/pushNotification.service";
import ActivityServices from "../services/activity.service";
import CronService from "../services/cron.service";
import { decrypt } from "./utils";
import IndiaMartService from "../services/indiaMart.service";
import * as cron from 'node-cron';

const activityReminder = new ActivityServices();

// Define a type for the task structure
interface Task {
  fcmWebtoken: string | null;
  fcmAndroidToken: string | null; // Assuming token can be null based on the original data
  subject: string;
  datetime: Date;
  description: string;
  ownerUser: {
    username: string;
    email: string;
    orgId: string;
    role: string;
    subject: string;
    description: string;
    datetime: string;
  };
}
// Define the tasks array with the Task type
const tasks: Task[] = [];

//check activity every 30 minutes
// cron.schedule("*/30 * * * *", async () => {
//   await checkActivityCronJob();
//   // await sendActivityNotifications();
// });


export async function checkActivityCronJob() {
  try {
    const currentDateTime = new Date();
    currentDateTime.setSeconds(0, 0);
    const halfHourAfter = new Date(currentDateTime.getTime() + 30 * 60 * 1000);
    halfHourAfter.setSeconds(0, 0);

    const activityReminderData = await activityReminder.getActivityReminderData(
      currentDateTime,
      halfHourAfter
    );
    console.log(
      "in checkActivityCronJob, activities found : ",
      activityReminderData?.length
    );
    // console.log(activityReminderData[0]?.activity.owner);

    if (activityReminderData) {
      const cronService = new CronService();
      for (const reminder of activityReminderData) {
        const fcmWebtoken = reminder?.activity.owner.fcmWebToken;
        const fcmAndroidToken = reminder?.activity.owner.fcmAndroidToken;

        const subject = decrypt(reminder?.activitySubject);
        const datetime = reminder?.notificationDateTime;
        const description = reminder?.description
          ? decrypt(reminder?.description)
          : "";
        const activityDueDate = formatDateToIST(reminder?.activity.dueDate);
        const ownerUser = {
          username: `${decrypt(reminder.activity.owner.firstName)} ${decrypt(
            reminder.activity.owner.lastName
          )}`,
          email: decrypt(reminder.activity.owner.email),
          orgId: reminder.activity.owner.organisation.organisationId,
          role: reminder.activity.owner.roles[0].roleName,
          subject,
          description,
          datetime: activityDueDate,
        };
        // Check if the task already exists in the array if exist then it return true
        const taskExists = tasks?.some(
          (task) =>
            task.fcmWebtoken === fcmWebtoken &&
            task.fcmAndroidToken === fcmAndroidToken &&
            task.subject === subject &&
            task.datetime.getTime() === datetime.getTime() &&
            task.description === description &&
            task.ownerUser === ownerUser
        );
        if (!taskExists) {
          tasks.push({
            fcmWebtoken,
            fcmAndroidToken,
            subject,
            datetime,
            description,
            ownerUser,
          });
        }

        for (const task of tasks) {
          try {
            const {
              fcmWebtoken,
              fcmAndroidToken,
              subject,
              datetime,
              description,
              ownerUser,
            } = task;

            // Validate and parse the datetime
            const momentDateTime = moment.utc(datetime, moment.ISO_8601, true);

            if (!momentDateTime.isValid()) {
              // console.error(
              //   `Invalid date format for task: ${subject} (${datetime})`
              // );
              return;
            }

            const tokens: string[] = [];
            if (fcmWebtoken !== null) {
              tokens.push(fcmWebtoken);
            }

            if (fcmAndroidToken !== null) {
              tokens.push(fcmAndroidToken);
            }

            // const date = moment1(datetime).tz("Asia/Kolkata");
            // const formattedDate = moment(date)
            //   .tz("Asia/Kolkata")
            //   .format("YYYY-MM-DD HH:mm:ss");
            // const formattedDate = date.format("YYYY-MM-DD HH:mm A");

            // const cronExpression =
            //   timestampToCronExpressionLocal(formattedDate);

            // console.log("cronExpression is ", cronExpression);
            // cron.schedule(cronExpression, async () => {
            // console.log(`Scheduled task: ${subject} (${datetime})`);

            not.sendMulticastNotifications(
              tokens!,
              subject,
              activityDueDate,
              description
            );
            await cronService.sendActivityReminderEmail(ownerUser);
            tasks.shift(); // Remove the first task
            console.log(tasks);
            // });
          } catch (e) {
            console.log("in catch", e);
          }
        }
      }
    }
  } catch (err) {
    console.log("Inside cron err is : ", err);
  }
}

// export async function sendActivityNotifications() {
//   console.log('running cron job..');

//   const currentDateTime = new Date();
//   currentDateTime.setSeconds(0, 0);
//   const halfHourAfter = new Date(currentDateTime.getTime() + 30 * 60 * 1000);
//   halfHourAfter.setSeconds(0, 0);
//   const activityReminderData = await activityReminder.getActivityReminderData(
//     currentDateTime,
//     halfHourAfter
//   );

// if (!activityReminderData || activityReminderData.length === 0) {
//   console.log('no activities found');
//   return;
// }
// console.log('activities found', activityReminderData.length);

//   for (const reminder of activityReminderData) {
//     // console.log("reminder >>>>> is : ", reminder);

//     const fcmWebtoken = reminder?.activity.owner.fcmWebToken;
//     const fcmAndroidToken = reminder?.activity.owner.fcmAndroidToken;
//     const subject = decrypt(reminder?.activitySubject);
//     const datetime = moment(reminder?.notificationDateTime)
//       .tz("Asia/Kolkata")
//       .format("YYYY-MM-DD HH:mm:ss");
//     const description = reminder?.description
//       ? decrypt(reminder?.description)
//       : "";
//     const tokens: string[] = [];
//     if (fcmWebtoken !== null) {
//       tokens.push(fcmWebtoken);
//     }
//     console.log("fcmWebtoken >>>>> is : ", fcmWebtoken);

//     if (fcmAndroidToken !== null) {
//       tokens.push(fcmAndroidToken);
//     }

//     // const cronExpression = timestampToCronExpressionLocal(datetime);
//     // console.log("cronExpression is ", cronExpression);

//     //sending for test.
//     await not.sendMulticastNotifications(
//       tokens!,
//       subject,
//       datetime,
//       description
//     );

//     // const notificationDateTime = reminder.notificationDateTime;
//     // if (areTwoDatesEqual(notificationDateTime, currentDateTime)) {
//     //   console.log(`Sent for task: ${subject} (${datetime})`);
//     //   await not.sendMulticastNotifications(
//     //     tokens!,
//     //     subject,
//     //     datetime,
//     //     description
//     //   );
//     // } else {
//     //   console.log(`Scheduled task: ${subject} (${datetime})`);
//     //   cron.schedule(cronExpression, async () => {
//     //     await not.sendMulticastNotifications(
//     //       tokens!,
//     //       subject,
//     //       datetime,
//     //       description
//     //     );
//     //   });
//     // }
//   }
// }
// function areTwoDatesEqual(date1: Date, date2: Date) {
//   // Parse the dates if they are in string format
//   const d1 = new Date(date1);
//   const d2 = new Date(date2);

function formatDateToIST(date: Date) {
  // Format the time in IST
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    // second: "2-digit",
  });
  const formattedTime = timeFormatter.format(date);

  // Format the date in IST
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
  const formattedDate = dateFormatter.format(date);

  console.log(`Formatted Time (IST): ${formattedTime}`);
  console.log(`Formatted Date (IST): ${formattedDate}`);

  return `${formattedTime} IST, ${formattedDate}`;
}

// India Mart lead fetching - test at a reasonable interval
cron.schedule('*/60 * * * *', async () => {
  try {
    console.log('Fetching leads from India Mart...');
    const indiaMartService = new IndiaMartService();

    const savedCount = await indiaMartService.processAndSaveLeads();
    console.log(`Successfully imported ${savedCount} leads from India Mart`);
  } catch (error) {
    console.error('Error importing leads from India Mart:', error);
  }
});
