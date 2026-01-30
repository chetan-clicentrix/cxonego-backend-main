import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";
import leadAssignmentService from "../services/leadAssignment.service";

class LeadAssignmentController {
  /**
   * Get all lead assignments for the user's organization
   */
  async getAllLeadAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = req.query.search as string;

      const result = await leadAssignmentService.getAllLeadAssignments(
        req.user,
        page,
        limit,
        search
      );

      // Force fresh response
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get a specific lead assignment
   */
  async getLeadAssignment(request: AuthenticatedRequest, response: Response) {
    try {
      const leadType = request.params.leadType;
      
      const leadAssignment = await leadAssignmentService.getLeadAssignment(leadType);
      
      if (!leadAssignment) {
        return makeResponse(
          response,
          404,
          false,
          "Lead assignment not found",
          null
        );
      }

      return makeResponse(
        response,
        200,
        true,
        "Lead assignment retrieved successfully",
        leadAssignment
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }

  /**
   * Create a new lead assignment
   */
  async createLeadAssignment(request: AuthenticatedRequest, response: Response) {
    try {
      const leadAssignment = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await leadAssignmentService.createLeadAssignment(
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
        "Lead assignment created successfully",
        leadAssignment
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }

  /**
   * Update an existing lead assignment
   */
  async updateLeadAssignment(request: AuthenticatedRequest, response: Response) {
    try {
      const leadType = request.params.leadType;
      
      const leadAssignment = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          return await leadAssignmentService.updateLeadAssignment(
            leadType,
            request.body,
            request.user,
            transactionEntityManager
          );
        }
      );

      return makeResponse(
        response,
        200,
        true,
        "Lead assignment updated successfully",
        leadAssignment
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }

  /**
   * Delete a lead assignment
   */
  async deleteLeadAssignment(request: AuthenticatedRequest, response: Response) {
    try {
      const leadType = request.params.leadType;
      
      await AppDataSource.transaction(async (transactionEntityManager) => {
        await leadAssignmentService.deleteLeadAssignment(
          leadType,
          request.user,
          transactionEntityManager
        );
      });

      return makeResponse(
        response,
        200,
        true,
        "Lead assignment deleted successfully",
        null
      );
    } catch (error) {
      return errorHandler(response, error);
    }
  }
}

export default new LeadAssignmentController(); 