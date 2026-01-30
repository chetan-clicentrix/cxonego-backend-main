import { Request, Response } from "express";
import SubscriptionService from "../services/subscription.service";
import { AppDataSource } from "../data-source";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";

const subscriptionService = new SubscriptionService();
class SubscriptionController {
  async createSuscription(request: AuthenticatedRequest, response: Response) {
    try {
      const subscription = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await subscriptionService.createSubscription(
            request.user,
            request.body,
            transactionEntityManager
          );
        }
      );
      if (!subscription) {
        return makeResponse(
          response,
          404,
          false,
          "Subscription not created",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Subscription created successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  }

  verifySubscription = async (request: AuthenticatedRequest, response: Response) => {
    try {
      const subscription = await subscriptionService.verifySubscription(
        request.body,
        request.user
      );
      // if (!subscription) {
      //     return makeResponse(response, 404, false, "Subscription not found", null);
      // }
      return makeResponse(
        response,
        200,
        true,
        "Subscription verified successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  createSubscriptionByAdmin = async (request: AuthenticatedRequest, response: Response) => {
    try {
      const subscription = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await subscriptionService.createSubscriptionByAdmin(
            request.body,
            request.user,
            transactionEntityManager
          );
        }
      );

      return makeResponse(
        response,
        201,
        true,
        "Subscription created successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  getAllSubscriptions = async (request: Request, response: Response) => {
    try {
      const data = await subscriptionService.getAllSubscriptions(
        request
      );
      if (data.subscriptions.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "No Subscriptions found.",
          data
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        data
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  getSubscriptionById = async (request: Request, response: Response) => {
    try {
      const subscription = await subscriptionService.getSubscriptionById(
        request.params.subscriptionId
      );
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };
  getSubscriptionsWithPlanType = async (
    request: Request,
    response: Response
  ) => {
    try {
      const subscription_status = request.query.subscription_status as string;

      const planType = request.query.planType as string;
      const subscription =
        await subscriptionService.getSubscriptionsWithPlanType(
          planType,
          subscription_status
        );
      if (subscription.length == 0) {
        return makeResponse(
          response,
          200,
          true,
          `No ${subscription_status.split(" ")[1]} Subscriptions found on ${
            request.query.planType
          } plan.`,
          subscription
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  getUserSubscriptions = async (request: Request, response: Response) => {
    try {
      const subscriptions = await subscriptionService.getUserSubscriptions(
        request.params.userId
      );
      if (subscriptions.length == 0) {
        return makeResponse(
          response,
          200,
          true,
          "No Subscriptions found.",
          subscriptions
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        subscriptions
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  getUserActiveSubscription = async (request: Request, response: Response) => {
    try {
      const subscription = await subscriptionService.getUserActiveSubscription(
        request.params.userId
      );
      if (!subscription) {
        return makeResponse(
          response,
          200,
          true,
          "No active subscription found.",
          subscription
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  cancelSubscription = async (request: AuthenticatedRequest, response: Response) => {
    try {
      const subscription = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await subscriptionService.cancelSubscription(
            transactionEntityManager,
            request.params.subscriptionId,
            request.user
          );
        }
      );
      return makeResponse(
        response,
        200,
        true,
        "Subscription cancelled successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  deleteSubscription = async (request: AuthenticatedRequest, response: Response) => {
    try {
      const subscription = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await subscriptionService.deleteSubscription(
            transactionEntityManager,
            request.params.subscriptionId,
            request.user
          );
        }
      );
      if (!subscription) {
        return makeResponse(
          response,
          404,
          false,
          "Subscription not found",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Subscription deleted successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  bulkDeleteSubscriptions = async (
    request: AuthenticatedRequest,
    response: Response
  ) => {
    try {
      const subscription = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await subscriptionService.bulkDeleteSubscriptions(
            transactionEntityManager,
            request.body.subscriptionIds,
            request.user
          );
        }
      );
      return makeResponse(
        response,
        200,
        true,
        "Subscriptions deleted successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  getStatisticsDataForSuperAdmin = async (
    _request: Request,
    response: Response
  ) => {
    try {
      const res = await subscriptionService.getStatisticsDataForSuperAdmin();
      return makeResponse(
        response,
        200,
        true,
        "Subscription fetched successfully",
        res
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };

  updatePaymentStatus = async (request: Request, response: Response) => {
    try {
      const subscription = await subscriptionService.updatePaymentStatus(
        request
      );
      return makeResponse(
        response,
        200,
        true,
        "Subscription updated successfully",
        subscription
      );
    } catch (error) {
      errorHandler(response, error);
    }
  };
}

export default SubscriptionController;
