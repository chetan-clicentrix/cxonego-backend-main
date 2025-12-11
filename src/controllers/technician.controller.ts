import { Request, Response } from "express";
import TechnicianService from "../services/technician.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { Technician } from "../entity/Technician";
import { CustomRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";

const _technicianService = new TechnicianService();

class TechnicianController {
    async getAllTechnicians(request: CustomRequest, response: Response) {
        try {
            const technicians = await _technicianService.getAllTechnicians(
                request.user
            );
            return makeResponse(response, 200, true, "All technicians", technicians);
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getTechnicians(request: CustomRequest, response: Response) {
        try {
            let page = Number(request.query.page);
            let limit = Number(request.query.limit);
            if (!page) page = 1;
            if (!limit) limit = 10;

            const search: string | undefined = request.query.search as string;
            const status: string[] = request.body.status as string[];
            const availability: string[] = request.body.availability as string[];
            const specialization: string[] = request.body
                .specialization as string[];
            const organizationId: string | null = request.user.organizationId;

            const technicians = await _technicianService.getTechnicians(
                search,
                status,
                availability,
                specialization,
                page,
                limit,
                organizationId
            );

            if (!technicians) {
                return makeResponse(
                    response,
                    200,
                    false,
                    "Technicians not found",
                    null
                );
            }
            return makeResponse(
                response,
                200,
                true,
                "Technicians fetched successfully",
                technicians
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getTechnician(request: Request, response: Response) {
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
            const technician = await _technicianService.getTechnician(technicianId);
            if (!technician) {
                return makeResponse(response, 404, false, "Technician not found", null);
            }
            return makeResponse(response, 200, true, "Technician found", technician);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async createTechnician(request: CustomRequest, response: Response) {
        try {
            const technician = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const technicianObj = await _technicianService.createTechnician(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return technicianObj;
                }
            );

            if (!technician) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Failed to create technician",
                    null
                );
            }

            return makeResponse(
                response,
                201,
                true,
                "Technician created successfully",
                technician
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async updateTechnician(request: CustomRequest, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;
            const payload: Technician = request.body;

            if (!technicianId) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician ID is required",
                    null
                );
            }
            if (!payload) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician details are required",
                    null
                );
            }

            const technician = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const updated = await _technicianService.updateTechnician(
                        payload,
                        technicianId,
                        request.user,
                        transactionEntityManager
                    );
                    return updated;
                }
            );

            if (!technician) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician not updated",
                    null
                );
            }

            return makeResponse(
                response,
                200,
                true,
                "Technician updated successfully",
                technician
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async deleteTechnician(request: CustomRequest, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;
            const technician = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const deleted = await _technicianService.deleteTechnician(
                        technicianId,
                        request.user,
                        transactionEntityManager
                    );
                    return deleted;
                }
            );

            if (!technician) {
                return makeResponse(response, 404, false, "Technician not found", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Technician deleted successfully",
                technician
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async partiallyUpdateTechnician(request: CustomRequest, response: Response) {
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
            if (!request.body) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician data is required",
                    null
                );
            }

            const technician = await _technicianService.partiallyUpdateTechnician(
                technicianId,
                request.body
            );

            if (!technician) {
                return makeResponse(
                    response,
                    404,
                    false,
                    "Failed to update technician",
                    null
                );
            }

            return makeResponse(
                response,
                200,
                true,
                "Technician updated successfully",
                technician
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async updateAvailability(request: CustomRequest, response: Response) {
        try {
            const technicianId: string = request.params.technicianId;
            const { availability } = request.body;

            if (!technicianId || !availability) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Technician ID and availability are required",
                    null
                );
            }

            const result = await _technicianService.updateAvailability(
                technicianId,
                availability
            );

            return makeResponse(
                response,
                200,
                true,
                "Availability updated successfully",
                result
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getTechnicianWorkload(request: Request, response: Response) {
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

            const workload = await _technicianService.getWorkload(technicianId);

            return makeResponse(
                response,
                200,
                true,
                "Workload fetched successfully",
                { technicianId, workload }
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getAvailableTechnicians(request: CustomRequest, response: Response) {
        try {
            const organizationId: string | null = request.user.organizationId;
            const specialization: string | undefined = request.query
                .specialization as string;

            const technicians = await _technicianService.getAvailableTechnicians(
                organizationId!,
                specialization
            );

            return makeResponse(
                response,
                200,
                true,
                "Available technicians fetched successfully",
                technicians
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getTechniciansBySpecialization(
        request: CustomRequest,
        response: Response
    ) {
        try {
            const { specialization } = request.body;
            const organizationId: string | null = request.user.organizationId;

            if (!specialization) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Specialization is required",
                    null
                );
            }

            const technicians =
                await _technicianService.getTechniciansBySpecialization(
                    specialization,
                    organizationId!
                );

            return makeResponse(
                response,
                200,
                true,
                "Technicians fetched successfully",
                technicians
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }
}

export default TechnicianController;
