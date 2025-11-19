import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
class EmailManager {
  SES_CLIENT: SESClient;
  constructor() {
    this.SES_CLIENT = new SESClient({
      credentials: {
        accessKeyId: String(process.env.AWS_ACCESS_KEY),
        secretAccessKey: String(process.env.AWS_SECRET_KEY),
      },
      region: String(process.env.AWS_REGION),
    });
  }
  /**
   * *Initializes the class by setting up the AWS SES configuration and client.
   * @param {string} receiver - receivers email
   * @param {string} subject - subject of the email
   * @returns {Promise<void>}
   */
  async sendEmail(
    receiver: string[],
    subject: string,
    Body: string
  ): Promise<void> {
    try {
      const params = {
        Source: String(process.env.AWS_SES_SENDER),
        Destination: {
          ToAddresses: receiver,
        },
        ReplyToAddresses: [],
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: Body,
            },
            
            // Text: {
            //   Charset: "UTF-8",
            //   Data: Body,
            // },
          },
          Subject: {
            Charset: "UTF-8",
            Data: `${subject}`,
          },
        },
      };
      await this.SES_CLIENT.send(new SendEmailCommand(params));
    } catch (err) {
      console.log("failed to send email", err);
    }
  }
  async sendEmailWithCC(
    receiver: string[],
    CC: string[],
    subject: string,
    Body: string
  ): Promise<void> {
    try {
      const params = {
        Source: String(process.env.AWS_SES_SENDER),
        Destination: {
          ToAddresses: receiver,
          CcAddresses: CC,
        },
        ReplyToAddresses: [],
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: Body,
            },
            // Text: {
            //   Charset: "UTF-8",
            //   Data: Body,
            // },
          },
          Subject: {
            Charset: "UTF-8",
            Data: `${subject}`,
          },
        },
      };
      await this.SES_CLIENT.send(new SendEmailCommand(params));
    } catch (err) {
       console.log("failed to send email", err);
    }
  }
}

export default EmailManager;
