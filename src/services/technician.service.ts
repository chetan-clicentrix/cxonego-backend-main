import { Technician } from "../entity/Technician";
import { AppDataSource } from "../data-source";
import { EntityManager, UpdateResult } from "typeorm";
import { ResourceNotFoundError } from "../common/errors";
import { userInfo } from "../interfaces/types";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { technicianStatus, technicianAvailability, ticketStatus } from "../common/utils";
import { Case } from "../entity/Case";

class TechnicianService {
    // Get all technicians for an organization
    async getAllTechnicians(userInfo: userInfo) {
        const technicians = await AppDataSource.getRepository(Technician)
            .createQueryBuilder("technician")
            .leftJoinAndSelect("technician.user", "user")
            .leftJoinAndSelect("technician.organization", "organisation")
            .where("organisation.organisationId = :organisationId", {
                organisationId: userInfo.organizationId,
            })
            .select([
                "technician",
                "user.userId",
                "user.firstName",
                "user.lastName",
                "user.email",
            ])
            .orderBy("technician.updatedAt", "DESC")
            .getMany();

        return technicians;
    }

    // Get technicians with pagination and filters
    async getTechnicians(
        search: string | undefined,
        status: string[] | undefined,
        availability: string[] | undefined,
        specialization: string[] | undefined,
        page: number,
        limit: number,
        organizationId: string | null
    ) {
        try {
            let technicianRepo = AppDataSource.getRepository(Technician)
                .createQueryBuilder("technician")
                .select()
                .leftJoinAndSelect("technician.user", "user")
                .where("technician.organizationId=:organizationId", {
                    organizationId: organizationId,
                })
                .orderBy("technician.updatedAt", "DESC");

            // Apply filters
            if (status && status.length > 0) {
                technicianRepo.andWhere("technician.status IN (:...status)", {
                    status,
                });
            }

            if (availability && availability.length > 0) {
                technicianRepo.andWhere(
                    "technician.availability IN (:...availability)",
                    { availability }
                );
            }

            if (specialization && specialization.length > 0) {
                // JSON contains query for specialization array
                technicianRepo.andWhere(
                    "JSON_CONTAINS(technician.specialization, :specialization)",
                    { specialization: JSON.stringify(specialization) }
                );
            }

            const technicians = await technicianRepo.getMany();

            // Search functionality
            let searchedData: Technician[] = [];
            let skip = 0;
            if (search && technicians.length > 0) {
                skip = 1;
                searchedData = technicians.filter((technician) => {
                    if (
                        technician?.employeeId
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.firstName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.lastName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.email
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.phone
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.city
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        technician?.state
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase())
                    ) {
                        return true;
                    }
                    return false;
                });
            }

            if (searchedData.length === 0 && skip === 0) {
                searchedData = technicians;
            }

            const total = searchedData.length;
            searchedData = searchedData.slice((page - 1) * limit, page * limit);

            const pagination = {
                total,
                page: page,
                limit: limit,
                data: searchedData,
            };
            return pagination;
        } catch (error) {
            throw error;
        }
    }

    // Get single technician by ID
    async getTechnician(technicianId: string) {
        try {
            const technician = await AppDataSource.getRepository(Technician)
                .createQueryBuilder("technician")
                .select()
                .leftJoinAndSelect("technician.user", "user")
                .leftJoinAndSelect("technician.assignedCases", "cases")
                .where({ technicianId: technicianId })
                .getOne();

            return technician;
        } catch (error) {
            throw error;
        }
    }

    // Create new technician
    async createTechnician(
        payload: Technician,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        // Check if employee ID already exists
        const existingTechnician = await transactionEntityManager
            .getRepository(Technician)
            .createQueryBuilder("technician")
            .where("technician.employeeId = :employeeId", {
                employeeId: payload.employeeId,
            })
            .andWhere("technician.organizationId = :organizationId", {
                organizationId: user.organizationId,
            })
            .getOne();

        if (existingTechnician) {
            throw new Error("Employee ID already exists");
        }

        // Check if email already exists
        const existingEmail = await transactionEntityManager
            .getRepository(Technician)
            .createQueryBuilder("technician")
            .where("technician.email = :email", { email: payload.email })
            .andWhere("technician.organizationId = :organizationId", {
                organizationId: user.organizationId,
            })
            .getOne();

        if (existingEmail) {
            throw new Error("Email already exists");
        }

        // Set organization
        const organizationRepo = transactionEntityManager.getRepository(Organisation);
        if (user.organizationId) {
            const orgData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
            });
            if (orgData) payload.organization = orgData;
        }

        // Link to user if userId provided
        if (payload.user) {
            const userObj = await transactionEntityManager
                .getRepository(User)
                .findOne({ where: { userId: String(payload.user) } });
            if (userObj) {
                payload.user = userObj;
            }
        }

        // Set default values
        if (!payload.status) {
            payload.status = technicianStatus.ACTIVE;
        }
        if (!payload.availability) {
            payload.availability = technicianAvailability.AVAILABLE;
        }
        if (!payload.experienceYears) {
            payload.experienceYears = 0;
        }
        if (!payload.totalTicketsCompleted) {
            payload.totalTicketsCompleted = 0;
        }

        const technicianInstance = new Technician(payload);
        const technicianObj = await transactionEntityManager.save(technicianInstance);

        return technicianObj;
    }

    // Update technician
    async updateTechnician(
        payload: Technician,
        technicianId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const technicianRepository =
            transactionEntityManager.getRepository(Technician);
        const existingTechnician = await technicianRepository.findOne({
            where: { technicianId: technicianId },
        });

        if (!existingTechnician) {
            throw new ResourceNotFoundError("Technician not found");
        }

        payload.modifiedBy = user.email;

        // Link to user if userId provided
        if (payload.user) {
            const userObj = await transactionEntityManager
                .getRepository(User)
                .findOne({ where: { userId: String(payload.user) } });
            if (userObj) {
                payload.user = userObj;
            }
        }

        const technicianEntity = new Technician(payload);
        const update = await technicianRepository.update(
            technicianId,
            technicianEntity
        );

        return update;
    }

    // Delete technician (soft delete)
    async deleteTechnician(
        technicianId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const technicianRepository =
            transactionEntityManager.getRepository(Technician);
        const technician = await technicianRepository.findOneBy({
            technicianId: technicianId,
        });

        if (!technician) {
            throw new ResourceNotFoundError("Technician not found");
        }

        // Check if technician has active cases
        const activeCases = await transactionEntityManager
            .getRepository(Case)
            .createQueryBuilder("case")
            .where("case.assignedTechnicianId = :technicianId", { technicianId })
            .andWhere("case.status NOT IN (:...statuses)", {
                statuses: [ticketStatus.CLOSED, ticketStatus.CANCELLED],
            })
            .getCount();

        if (activeCases > 0) {
            throw new Error(
                "Cannot delete technician with active cases. Please reassign or close all cases first."
            );
        }

        await technicianRepository.softDelete(technicianId);
        await technicianRepository.update(technicianId, { modifiedBy: user.email });

        return technician;
    }

    // Partially update technician
    async partiallyUpdateTechnician(
        technicianId: string,
        payload: Partial<Technician>
    ): Promise<UpdateResult> {
        const update = await AppDataSource.getRepository(Technician).update(
            technicianId,
            { ...payload }
        );
        return update;
    }

    // Update technician availability
    async updateAvailability(
        technicianId: string,
        availability: technicianAvailability
    ) {
        const technician = await AppDataSource.getRepository(Technician).findOne({
            where: { technicianId },
        });

        if (!technician) {
            throw new ResourceNotFoundError("Technician not found");
        }

        await AppDataSource.getRepository(Technician).update(technicianId, {
            availability,
        });

        return { technicianId, availability };
    }

    // Get technician workload (count of active cases)
    async getWorkload(technicianId: string): Promise<number> {
        const workload = await AppDataSource.getRepository(Case)
            .createQueryBuilder("case")
            .where("case.assignedTechnicianId = :technicianId", { technicianId })
            .andWhere("case.status NOT IN (:...statuses)", {
                statuses: [ticketStatus.CLOSED, ticketStatus.CANCELLED, ticketStatus.RESOLVED],
            })
            .getCount();

        return workload;
    }

    // Get available technicians
    async getAvailableTechnicians(
        organizationId: string,
        specialization?: string
    ) {
        let query = AppDataSource.getRepository(Technician)
            .createQueryBuilder("technician")
            .where("technician.organizationId = :organizationId", { organizationId })
            .andWhere("technician.status = :status", {
                status: technicianStatus.ACTIVE,
            })
            .andWhere("technician.availability = :availability", {
                availability: technicianAvailability.AVAILABLE,
            });

        if (specialization) {
            query = query.andWhere(
                "JSON_CONTAINS(technician.specialization, :specialization)",
                { specialization: JSON.stringify([specialization]) }
            );
        }

        const technicians = await query.getMany();

        // Get workload for each technician
        const techniciansWithWorkload = await Promise.all(
            technicians.map(async (technician) => {
                const workload = await this.getWorkload(technician.technicianId);
                return {
                    ...technician,
                    currentWorkload: workload,
                };
            })
        );

        // Sort by workload (ascending)
        techniciansWithWorkload.sort((a, b) => a.currentWorkload - b.currentWorkload);

        return techniciansWithWorkload;
    }

    // Get technicians by specialization
    async getTechniciansBySpecialization(
        specialization: string,
        organizationId: string
    ) {
        const technicians = await AppDataSource.getRepository(Technician)
            .createQueryBuilder("technician")
            .where("technician.organizationId = :organizationId", { organizationId })
            .andWhere("JSON_CONTAINS(technician.specialization, :specialization)", {
                specialization: JSON.stringify([specialization]),
            })
            .andWhere("technician.status = :status", {
                status: technicianStatus.ACTIVE,
            })
            .getMany();

        return technicians;
    }

    // Increment ticket count for technician
    async incrementTicketCount(
        technicianId: string,
        transactionEntityManager: EntityManager
    ) {
        const technician = await transactionEntityManager
            .getRepository(Technician)
            .findOne({ where: { technicianId } });

        if (technician) {
            await transactionEntityManager
                .getRepository(Technician)
                .update(technicianId, {
                    totalTicketsCompleted: technician.totalTicketsCompleted + 1,
                });
        }
    }
}

export default TechnicianService;
