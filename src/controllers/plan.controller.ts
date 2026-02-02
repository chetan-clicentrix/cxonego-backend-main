import { Response } from "express";
import PlanServices from "../services/plan.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
const planService = new PlanServices();

class PlanController {
  async addPlan(request: AuthenticatedRequest, response: Response) {
    try {
      const result = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const plan = await planService.addPlan(
            request.body,
            transactionEntityManager
          );
          return plan;
        }
      );
      if (!result) {
        return makeResponse(response, 400, true, "Failed to create plan", null);
      }
      return makeResponse(
        response,
        201,
        true,
        "Plan created successfully",
        result
      );
    } catch (error) {
      let errorMessage = error.message;
      errorHandler(response, errorMessage);
    }
  }

  async getAllPlans(request: AuthenticatedRequest, response: Response) {
    try {
      const data = await planService.getAllPlans(
        request
      );
      if (data.plans?.length == 0) {
        return makeResponse(
          response,
          200,
          true,
          "No Plans found.",
          data
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Plan details fetched successfully",
        data
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getPlanById(request: AuthenticatedRequest, response: Response) {
    try {
      const planId = request.params.planId;
      const plan = await planService.getPlanById(planId);

      return makeResponse(
        response,
        200,
        true,
        "Plan fetched successfully",
        plan
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async updatePlan(request: AuthenticatedRequest, response: Response) {
    try {
      const planId = request.params.planId;
      const plan = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const plan = await planService.updatePlan(
            planId,
            request.body,
            transactionEntityManager
          );
          return plan;
        }
      );
      return makeResponse(
        response,
        200,
        true,
        "Plan updated successfully",
        plan
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async deletePlan(request: AuthenticatedRequest, response: Response) {
    try {
      const planId = request.params.planId;
      await planService.deletePlan(planId);

      return makeResponse(
        response,
        200,
        true,
        "Plan deleted successfully",
        null
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async bulkDeletePlans(request: AuthenticatedRequest, response: Response) {
    try {
      const payload = request.body.planIds;
      const plans = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const plans = await planService.bulkDeletePlans(
            transactionEntityManager,
            payload
          );
          return plans;
        }
      );
      return makeResponse(
        response,
        200,
        true,
        "Plans deleted successfully",
        plans
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}

export default PlanController;
