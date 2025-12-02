import { Request, Response } from "express";
import TicketAssignmentService from "../services/ticketAssignment.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { TicketAssignment } from "../entity/TicketAssignment";
import { CustomRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";

const _assignmentService = new TicketAssignmentService();

class TicketAssignmentController {
    async getAssignments(request: CustomRequest, response: Response) {
        try {
            let page = Number(request.query.page);
            let limit = Number(request.query.limit);
            if (!page) page = 1;
            if (!limit) limit = 10;

            const status: string[] = request.body.status as string[];
            const technicianId: string = request.body.technicianId;
            const caseId: string = request.body.caseId;
            const organizationId: string | null = request.user.organizationId;

            const assignments = await _assignmentService.getAssignments(
                status,
                technicianId,
                caseId,
                page,
                limit,
                organizationId
            );

            if (!assignments) {
                return makeResponse(
                    response,
                    200,
                    false,
                    "Assignments not found",
                    null
                );
            }
            return makeResponse(
                response,
                200,
                true,
                "Assignments fetched successfully",
                assignments
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getAssignment(request: Request, response: Response) {
        try {
            const assignmentId: string = request.params.assignmentId;
            if (!assignmentId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Assignment ID is required",
                    null
                );
            }
            const assignment = await _assignmentService.getAssignment(assignmentId);
            if (!assignment) {
                return makeResponse(
                    response,
                    404,
                    false,
                    "Assignment not found",
                    null
                );
            }
            return makeResponse(
                response,
                200,
                true,
                "Assignment found",
                assignment
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async createAssignment(request: CustomRequest, response: Response) {
        try {
            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const assignmentObj = await _assignmentService.createAssignment(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return assignmentObj;
                }
            );

            if (!assignment) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Failed to create assignment",
                    null
                );
            }

            return makeResponse(
                response,
                201,
                true,
                "Assignment created successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async acceptAssignment(request: CustomRequest, response: Response) {
        try {
            const assignmentId: string = request.params.assignmentId;

            if (!assignmentId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Assignment ID is required",
                    null
                );
            }

            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const accepted = await _assignmentService.acceptAssignment(
                        assignmentId,
                        transactionEntityManager
                    );
                    return accepted;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Assignment accepted successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async rejectAssignment(request: CustomRequest, response: Response) {
        try {
            const assignmentId: string = request.params.assignmentId;
            const { rejectionReason } = request.body;

            if (!assignmentId || !rejectionReason) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Assignment ID and rejection reason are required",
                    null
                );
            }

            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const rejected = await _assignmentService.rejectAssignment(
                        assignmentId,
                        rejectionReason,
                        transactionEntityManager
                    );
                    return rejected;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Assignment rejected successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async completeAssignment(request: CustomRequest, response: Response) {
        try {
            const assignmentId: string = request.params.assignmentId;
            const { notes } = request.body;

            if (!assignmentId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Assignment ID is required",
                    null
                );
            }

            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const completed = await _assignmentService.completeAssignment(
                        assignmentId,
                        notes,
                        transactionEntityManager
                    );
                    return completed;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Assignment completed successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getAssignmentsByCase(request: Request, response: Response) {
        try {
            const caseId: string = request.params.caseId;

            if (!caseId) {
                return makeResponse(response, 400, false, "Case ID is required", null);
            }

            const assignments = await _assignmentService.getAssignmentsByCase(
                caseId
            );

            return makeResponse(
                response,
                200,
                true,
                "Assignments fetched successfully",
                assignments
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getAssignmentsByTechnician(request: CustomRequest, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;
            let page = Number(request.query.page) || 1;
            let limit = Number(request.query.limit) || 10;
            const status: string[] = request.body.status as string[];

            if (!technicianId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician ID is required",
                    null
                );
            }

            const assignments =
                await _assignmentService.getAssignmentsByTechnician(
                    technicianId,
                    status,
                    page,
                    limit
                );

            return makeResponse(
                response,
                200,
                true,
                "Assignments fetched successfully",
                assignments
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getPendingAssignments(request: Request, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;

            if (!technicianId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician ID is required",
                    null
                );
            }

            const assignments = await _assignmentService.getPendingAssignments(
                technicianId
            );

            return makeResponse(
                response,
                200,
                true,
                "Pending assignments fetched successfully",
                assignments
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async startAssignment(request: CustomRequest, response: Response) {
        try {
            const assignmentId: string = request.params.assignmentId;

            if (!assignmentId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Assignment ID is required",
                    null
                );
            }

            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const started = await _assignmentService.startAssignment(
                        assignmentId,
                        transactionEntityManager
                    );
                    return started;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Assignment started successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }
}

export default TicketAssignmentController;
