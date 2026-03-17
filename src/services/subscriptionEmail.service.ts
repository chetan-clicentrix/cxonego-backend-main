import { EmailNotificationService } from "./emailNotification.service";
import { EmailType } from "../entity/SentEmailLog";

class SubscriptionEmailService {
  orderSuccess = async (
    userName: string,
    email: string,
    planName: string,
    order_id: string,
    razorpay_payment_id: string,
    subscriptionStatus: string,
    payment_status: string
  ) => {
    const subject = "Subscription purchased successfully - CxOneGo";

    const html = `
    <head>
    <title>Subscription Order Confirmation - CxOneGo</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #0073e6; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Thank you for subscribing to ${planName}</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your subscription order has been successfully completed.</p>
        <p><strong>Order Details:</strong></p>
        <p><strong>Order ID:</strong> ${order_id}</p>
        <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Subscription Status:</strong> ${subscriptionStatus}</p>
        <p><strong>Payment Status:</strong> ${payment_status}</p>
        <p>We are excited to have you on board. If you have any questions, feel free to reach out to our support team.
        </p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
  
  `;

    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionFailure = async (
    userName: string,
    email: string,
    planName: string,
    order_id: string,
    failureReason: string
  ) => {
    const subject = "Payment Failed for Your Subscription order - CxOneGo";
    const html = `
    <head>
    <title>CxOnego</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #d9534f; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Payment Issue</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>We encountered an issue processing the payment for your subscription to <strong>${planName}</strong>.</p>
        <p><strong>Subscription Details</strong></p>
        <p><strong>Subscription ID:</strong> ${order_id}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Issue:</strong> ${failureReason}</p>
        <p>Please update your payment information or try again.</p>
        <p>If you need any help, our support team is here to assist you.</p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
  
  `;
    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionExpiryReminder = async (
    userName: string,
    email: string,
    planName: string,
    expiryDate: string
  ) => {
    const subject = "Your Subscription is About to Expire - CxOneGo";
    const html = `
    <head>
    <title>CxOnego</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #f0ad4e; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Subscription Expiry Reminder</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Just a friendly reminder that your subscription to <strong>${planName}</strong> will expire on <strong>${expiryDate}</strong>.</p>
        <p>To ensure uninterrupted access, please renew your subscription before the expiry date. Click <a href="https://cxonego.clicentrix.com/profile/subscription" style="color: #0073e6;">here</a> to renew.</p>
        <p>If you have any questions or need assistance, don't hesitate to contact us.</p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
  
  `;

    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionCancellation = async (
    userName: string,
    email: string,
    planName: string,
    subscriptionId: string,
    cancellationDate: string
  ) => {
    const subject = "Subscription Cancellation Confirmation - CxOneGo";
    const html = `
    <head>
    <title>CxOnego</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #d9534f; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Subscription Cancellation</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>As per your request, we have successfully processed the cancellation of your subscription to <strong>${planName}</strong>.</p>
        <p><strong>Cancellation Details:</strong></p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Cancellation Date:</strong> ${cancellationDate}</p>
        <p>We’re sorry to see you go. If you have any feedback or need assistance in the future, please let us know.</p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
  
    `;
    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionExpiration = async (
    userName: string,
    email: string,
    planName: string,
    expirationDate: string
  ) => {
    const subject = "Subscription Expiration Notification - CxOneGo";
    const html = `
    <head>
    <title>CxOneGo</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #d9534f; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Subscription Expiration</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>We would like to inform you that your subscription to <strong>${planName}</strong> has expired on <strong>${expirationDate}</strong>.</p>
        <p>We hope you enjoyed the benefits of your plan. If you would like to renew or upgrade your subscription, please visit our website or contact our support team.</p>
        <p>If you have already purchased any Upcoming plan, it'll be activated automatically.
        <p>Thank you for being a valued customer. We look forward to serving you again in the future.</p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
    `;
    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionActivation = async (
    userName: string,
    email: string,
    prevPlanName: string,
    prevStartDate: string,
    prevEndDate: string,
  ) => {
    const subject = "Subscription Activation Confirmation - CxOneGo";
    const html = `
    <head>
    <title>CxOnego</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #5cb85c; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Subscription Activated</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>We hope this message finds you well, your ongoing subscription on ${prevPlanName} has expired and if you have an advanced subscription, it'll be activated instantly!</p>
        <p><strong>Previous Plan Details:</strong></p>
        <p><strong>Plan:</strong> ${prevPlanName}</p>
        <p><strong>Start Date:</strong> ${prevStartDate}</p>
        <p><strong>Expiry Date:</strong> ${prevEndDate}</p>

        <p>If you need any assistance or have questions, don’t hesitate to reach out to our support team.</p>
        <p>Thank you for being a valued customer!</p>
        <p>Best regards,</p>
        <p><strong>CX-One-Go Team</strong></p>
      </div>
    </div>
  </body>
  
`;
    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: email,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  //   admin emails

  subscriptionReceived = async (
    adminName: string,
    userName: string,
    email: string,
    adminEmail: string,
    order_id: string,
    razorpay_payment_id: string,
    planName: string
  ) => {
    const subject = "New Subscription Received - CxOnego";
    const html = `
    <head>
  <title>New Subscription Created</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #5cb85c; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Subscription Received</h1>
      </div> 
      <div style="padding: 20px;"> 
  <p style="margin: 0; padding: 0;">
      <strong>Dear ${adminName},</strong>
    </p>
    <p style="margin: 20px 0;">
      A new subscription has been successfully created for a user.
    </p>
    <p style="margin: 20px 0; font-weight: bold;">
      <strong>Subscription Details:</strong>
    </p>
    <ul style="margin: 20px 0; padding-left: 20px;">
      <li><strong>Subscription ID:</strong> ${order_id}</li>
      <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
      <li><strong>User Name:</strong> ${userName}</li>
      <li><strong>User Email:</strong> ${email}</li>
      <li><strong>Plan:</strong> ${planName}</li>
    </ul>
    <p style="margin: 20px 0;">
      You can view the details and manage the subscription from the admin dashboard.
    </p>
    <p style="margin: 20px 0;">
      Best regards,<br>
      CX-One-Go Team
    </p>
  </div>
  </div>
</body>
`;

    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  cancellationRequested = async (
    adminName: string,
    userName: string,
    adminEmail: string,
    order_id: string,
    planName: string,
    cancellationDate: string
  ) => {
    const subject = "Subscription Cancellation Requested - CxOnego";
    const html = `
    <head>
  <title>Cancellation Request Received</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #d9534f; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
  <h1>Subscription Cancellation</h1>
</div>
<div style="padding: 20px;">
    <p style="margin: 0; padding: 0;">
      <strong>Hi ${adminName},</strong>
    </p>
    <p style="margin: 20px 0;">
      A request has been received to cancel a subscription.
    </p>
    <p style="margin: 20px 0; font-weight: bold;">
      <strong>Cancellation Request Details:</strong>
    </p>
    <ul style="margin: 20px 0; padding-left: 20px;">
      <li><strong>Subscription ID:</strong> ${order_id}</li>
      <li><strong>User:</strong> ${userName}</li>
      <li><strong>Plan:</strong> ${planName}</li>
      <li><strong>Cancellation Date:</strong> ${cancellationDate}</li>
    </ul>
    <p style="margin: 20px 0;">
      Please review the cancellation request and take the necessary actions from the admin dashboard.
    </p>
    <p style="margin: 20px 0;">
      Best,<br>
      CX-One-Go Team
    </p>
  </div>
  </div>
</body>
`;

    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  subscriptionReport = async (
    adminName: string,
    adminEmail: string,
    startDate: string,
    endDate: string,
    totalSubscriptions: number,
    totalUsers: number,
    totalOrganizations: number
  ) => {
    const subject = "Monthly Subscription Report - CxOnego";
    const html = `
    <head>
  <title>New User Subscriptions Report</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #0073e6; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Monthly Subscription Report</h1>
      </div>
      <div style="padding: 20px;">
      <p style="margin: 0; padding: 0;">
      <strong>Dear ${adminName},</strong>
    </p>
    <p style="margin: 20px 0;">
      Here is the report of new user subscriptions for the specified period.
    </p>
    <p style="margin: 20px 0; font-weight: bold;">
      <strong>Report Summary:</strong>
    </p>
    <ul style="margin: 20px 0; padding-left: 20px;">
      <li><strong>Start Date:</strong> ${startDate}</li>
      <li><strong>End Date:</strong> ${endDate}</li>
      <li><strong>New Subscriptions Purchased:</strong> ${totalSubscriptions}</li>
      <li><strong>New Organisations Onboarded:</strong> ${totalOrganizations}</li>
      <li><strong>New Users Onboarded:</strong> ${totalUsers}</li>
    </ul>
    <p style="margin: 20px 0;">
      For detailed information, please refer to the admin dashboard.
    </p>
    <p style="margin: 20px 0;">
      Thank you,<br>
      CX-One-Go Team
    </p>
    </div>
  </div>
</body>
`;

    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };

  newCustomPlanRequest = async (
    userName: string,
    userEmail: string,
    adminEmail: string,
    adminName: string,
    message: string
  ) => {
    const subject = "New Custom Plan Request - CxOnego";
    const html = ` 
    <head>
  <title>New Custom Plan Request</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #0073e6; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>New Custom Plan Requested</h1>
      </div>
      <div style="padding: 20px;">
      <p style="margin: 0; padding: 0;">
      <strong>Dear ${adminName},</strong>
    </p>
    <p style="margin: 20px 0;">
    We have received a custom plan request from a user. Please review the details below:
    </p>
    <ul style="margin: 20px 0; padding-left: 20px;">
    <li><b>User Name:</b> ${userName}</li>
    <li><b>Email:</b> ${userEmail}</li>
    <li><b>Additional Requirements:</b> ${message}</li>
    </ul>
    <p style="margin: 20px 0;">
    You can view and manage this request in the admin dashboard.
    </p>
    <p style="margin: 20px 0;">
      Thank you,<br>
      CX-One-Go Team
    </p>
    </div>
  </div>
</body> `;
    const emailService = new EmailNotificationService();
    try {
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: subject,
        bodyHtml: html,
        emailType: EmailType.CUSTOM
      });
      console.log(`✓ Subscription email queued: ${result.jobId}`);
    } catch (error: any) {
      console.error(`Failed to queue subscription email:`, error.message);
    }
  };
}

export default SubscriptionEmailService;

/**
 * <head>
    <title>Custom Plan Request Received</title>
  </head>
  <body>
    <p>Dear ${adminName},</p>
    <br>
    <p></p>
    <br>
    <b>Custom Plan Request Details:</b>
    <ul>
     
    </ul>
    <br>
   
    <br>
    <p>Best regards,</p>
    <p>CX-One-Go Team</p>
  </body>
 */
