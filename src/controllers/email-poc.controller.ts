import { RequestHandler, Request, Response } from "express";
import { EmailNotificationService } from "../services/emailNotification.service";
import { EmailType } from "../entity/SentEmailLog";
import { makeResponse } from "../common/utils";
import { ValidationFailedError, errorHandler } from "../common/errors";

class EmailManagerController {
  sendMail: RequestHandler = async (request: Request, response: Response) => {
    try {
      const { receivers, subject, HTMLBody } = request.body;
      if (!receivers || !subject || !HTMLBody) {
        throw new ValidationFailedError(
          `receiver,subject,HTMLBody are required`
        );
      }

      const emailService = new EmailNotificationService();
      const result = await emailService.sendEmail({
        to: receivers, // Assuming 'receivers' from request body maps to 'to'
        subject: subject,
        bodyHtml: HTMLBody, // Assuming 'HTMLBody' from request body maps to 'bodyHtml'
        emailType: EmailType.CUSTOM, // Assuming a default type or it should come from request
        sentById: 'system' // Assuming a default sender ID
      });

      return makeResponse(response, 200, true, "Email queued successfully", { jobId: result.jobId });
    } catch (error: any) {
      console.error('Failed to queue email:', error.message); // Added console.error for debugging
      return makeResponse(
        response, 500, false, "Failed to queue email", error.message); // Changed status to 500 for server error
    }
  };
}

export default EmailManagerController;
