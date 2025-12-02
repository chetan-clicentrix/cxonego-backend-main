import { Request, Response } from "express";
import CaseService from "../services/case.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { Case } from "../entity/Case";
import { CustomRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";

const _caseService = new CaseService();

class CaseController {
    async getAllCases(request: CustomRequest, response: Response) {
        try {
            const cases = await _caseService.getAllCases(request.user);
            return makeResponse(response, 200, true, "All cases", cases);
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getCases(request: CustomRequest, response: Response) {
        try {
            let page = Number(request.query.page);
            let limit = Number(request.query.limit);
            if (!page) page = 1;
            if (!limit) limit = 10;

            const search: string | undefined = request.query.search as string;
            const status: string[] = request.body.status as string[];
            const priority: string[] = request.body.priority as string[];
            const category: string[] = request.body.category as string[];
            const customerId: string = request.body.customerId;
            const technicianId: string = request.body.technicianId;
            const role: Role[] = request.user.role;
            const userId: string = request.user.userId;
            const organizationId: string | null = request.user.organizationId;
            let createdAt: string = request.query.createdAt as string;
            let updatedAt: string = request.query.updatedAt as string;
            let dateRange: DateRangeParamsType = request.body
                .dateRange as DateRangeParamsType;
            let view: string = request.query.view as string;

            const cases = await _caseService.getCases(
                userId,
                role,
                search,
                status,
                priority,
                category,
                customerId,
                technicianId,
                page,
                limit,
                createdAt,
                updatedAt,
                dateRange,
                organizationId,
                view
            );

            if (!cases) {
                return makeResponse(response, 200, false, "Cases not found", null);
            }
            return makeResponse(
                response,
                200,
                true,
                "Cases fetched successfully",
                cases
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getCase(request: Request, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            if (!caseId) {
                return makeResponse(response, 400, false, "Case ID is required", null);
            }
            const caseItem = await _caseService.getCase(caseId);
            if (!caseItem) {
                return makeResponse(response, 404, false, "Case not found", null);
            }
            return makeResponse(response, 200, true, "Case found", caseItem);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async createCase(request: CustomRequest, response: Response) {
        try {
            const caseItem = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const caseObj = await _caseService.createCase(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return caseObj;
                }
            );

            if (!caseItem) {
                return makeResponse(response, 400, false, "Failed to create case", null);
            }

            return makeResponse(
                response,
                201,
                true,
                "Case created successfully",
                caseItem
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async updateCase(request: CustomRequest, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            const payload: Case = request.body;

            if (!caseId) {
                return makeResponse(response, 400, false, "Case ID is required", null);
            }
            if (!payload) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Case details are required",
                    null
                );
            }

            const caseItem = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const updated = await _caseService.updateCase(
                        payload,
                        caseId,
                        request.user,
                        transactionEntityManager
                    );
                    return updated;
                }
            );

            if (!caseItem) {
                return makeResponse(response, 400, false, "Case not updated", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Case updated successfully",
                caseItem
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async deleteCase(request: CustomRequest, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            const caseItem = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const deleted = await _caseService.deleteCase(
                        caseId,
                        request.user,
                        transactionEntityManager
                    );
                    return deleted;
                }
            );

            if (!caseItem) {
                return makeResponse(response, 404, false, "Case not found", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Case deleted successfully",
                caseItem
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async bulkDeleteCase(request: CustomRequest, response: Response) {
        try {
            const userId = request.user.userId;
            const payload = request.body.caseIds;

            if (!payload) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Please provide case IDs",
                    null
                );
            }

            const result = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const deleted = await _caseService.bulkDeleteCase(
                        payload,
                        userId,
                        transactionEntityManager
                    );
                    return deleted;
                }
            );

            if (result?.deleted?.length == 0) {
                return makeResponse(response, 400, false, "Cases not deleted", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Cases deleted successfully",
                result
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async partiallyUpdateCase(request: CustomRequest, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            if (!caseId) {
                return makeResponse(response, 400, false, "Case ID is required", null);
            }
            if (!request.body) {
                return makeResponse(response, 400, false, "Case data is required", null);
            }

            const caseItem = await _caseService.partiallyUpdateCase(
                caseId,
                request.body
            );

            if (!caseItem) {
                return makeResponse(response, 404, false, "Failed to update case", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Case updated successfully",
                caseItem
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async assignTechnician(request: CustomRequest, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            const { technicianId, assignmentNotes } = request.body;

            if (!caseId || !technicianId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Case ID and Technician ID are required",
                    null
                );
            }

            const assignment = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const assigned = await _caseService.assignTechnician(
                        caseId,
                        technicianId,
                        request.user,
                        assignmentNotes,
                        transactionEntityManager
                    );
                    return assigned;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Technician assigned successfully",
                assignment
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async updateCaseStatus(request: CustomRequest, response: Response) {
        try {
            const caseId: string = request.params.caseId;
            const { status, reason, notes } = request.body;

            if (!caseId || !status) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Case ID and status are required",
                    null
                );
            }

            const statusHistory = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const updated = await _caseService.updateStatus(
                        caseId,
                        status,
                        reason,
                        notes,
                        request.user,
                        transactionEntityManager
                    );
                    return updated;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Case status updated successfully",
                statusHistory
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getCasesByCustomer(request: CustomRequest, response: Response) {
        try {
            const customerId: string = request.params.customerId;
            let page = Number(request.query.page) || 1;
            let limit = Number(request.query.limit) || 10;
            const organizationId: string | null = request.user.organizationId;

            const cases = await _caseService.getCasesByCustomer(
                customerId,
                page,
                limit,
                organizationId!
            );

            return makeResponse(
                response,
                200,
                true,
                "Cases fetched successfully",
                cases
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getCasesByTechnician(request: CustomRequest, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;
            let page = Number(request.query.page) || 1;
            let limit = Number(request.query.limit) || 10;
            const organizationId: string | null = request.user.organizationId;

            const cases = await _caseService.getCasesByTechnician(
                technicianId,
                page,
                limit,
                organizationId!
            );

            return makeResponse(
                response,
                200,
                true,
                "Cases fetched successfully",
                cases
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getCaseHistory(request: Request, response: Response) {
        try {
            const caseId: string = request.params.caseId;

            if (!caseId) {
                return makeResponse(response, 400, false, "Case ID is required", null);
            }

            const history = await _caseService.getStatusHistory(caseId);

            return makeResponse(
                response,
                200,
                true,
                "Case history fetched successfully",
                history
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }
}

export default CaseController;
