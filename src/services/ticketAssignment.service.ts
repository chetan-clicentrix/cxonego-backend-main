import { TicketAssignment } from "../entity/TicketAssignment";
import { AppDataSource } from "../data-source";
import { EntityManager } from "typeorm";
import { ResourceNotFoundError } from "../common/errors";
import { userInfo } from "../interfaces/types";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { Case } from "../entity/Case";
import { Technician } from "../entity/Technician";
import { assignmentStatus, ticketStatus } from "../common/utils";
import { TicketStatusHistory } from "../entity/TicketStatusHistory";

class TicketAssignmentService {
    // Get all assignments with pagination and filters
    async getAssignments(
        status: string[] | undefined,
        technicianId: string | undefined,
        caseId: string | undefined,
        page: number,
        limit: number,
        organizationId: string | null
    ) {
        try {
            let assignmentRepo = AppDataSource.getRepository(TicketAssignment)
                .createQueryBuilder("assignment")
                .select()
                .leftJoinAndSelect("assignment.case", "case")
                .leftJoinAndSelect("assignment.technician", "technician")
                .leftJoinAndSelect("assignment.assignedBy", "user")
                .where("assignment.organizationId=:organizationId", {
                    organizationId: organizationId,
                })
                .orderBy("assignment.assignedDate", "DESC");

            // Apply filters
            if (status && status.length > 0) {
                assignmentRepo.andWhere("assignment.status IN (:...status)", {
                    status,
                });
            }

            if (technicianId) {
                assignmentRepo.andWhere("assignment.technicianId = :technicianId", {
                    technicianId,
                });
            }

            if (caseId) {
                assignmentRepo.andWhere("assignment.caseId = :caseId", { caseId });
            }

            const assignments = await assignmentRepo
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();

            return {
                data: assignments[0],
                total: assignments[1],
                page,
                limit,
            };
        } catch (error) {
            throw error;
        }
    }

    // Get single assignment by ID
    async getAssignment(assignmentId: string) {
        try {
            const assignment = await AppDataSource.getRepository(TicketAssignment)
                .createQueryBuilder("assignment")
                .select()
                .leftJoinAndSelect("assignment.case", "case")
                .leftJoinAndSelect("assignment.technician", "technician")
                .leftJoinAndSelect("assignment.assignedBy", "user")
                .where({ assignmentId: assignmentId })
                .getOne();

            return assignment;
        } catch (error) {
            throw error;
        }
    }

    // Create new assignment
    async createAssignment(
        payload: TicketAssignment,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        // Get case
        const caseItem = await transactionEntityManager
            .getRepository(Case)
            .findOne({ where: { caseId: String(payload.case) } });

        if (!caseItem) {
            throw new ResourceNotFoundError("Case not found");
        }

        // Get technician
        const technician = await transactionEntityManager
            .getRepository(Technician)
            .findOne({ where: { technicianId: String(payload.technician) } });

        if (!technician) {
            throw new ResourceNotFoundError("Technician not found");
        }

        // Get assigned by user
        const assignedByUser = await transactionEntityManager
            .getRepository(User)
            .findOne({ where: { userId: user.userId } });

        // Set organization
        const organizationRepo = transactionEntityManager.getRepository(Organisation);
        if (user.organizationId) {
            const orgData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
            });
            if (orgData) payload.organization = orgData;
        }

        payload.case = caseItem;
        payload.technician = technician;
        payload.assignedBy = assignedByUser!;
        payload.assignedDate = new Date();
        payload.status = assignmentStatus.PENDING;

        const assignmentInstance = new TicketAssignment(payload);
        const assignmentObj = await transactionEntityManager.save(assignmentInstance);

        // Update case with assigned technician and status
        await transactionEntityManager.getRepository(Case).update(caseItem.caseId, {
            assignedTechnician: technician,
            status: ticketStatus.ASSIGNED,
        });

        // Create status history
        const statusHistory = new TicketStatusHistory({
            case: caseItem,
            previousStatus: caseItem.status,
            newStatus: ticketStatus.ASSIGNED,
            changedDate: new Date(),
            reason: `Assigned to technician ${technician.firstName} ${technician.lastName}`,
            changedBy: assignedByUser!,
            organization: payload.organization,
        } as TicketStatusHistory);

        await transactionEntityManager.save(statusHistory);

        return assignmentObj;
    }

    // Accept assignment
    async acceptAssignment(
        assignmentId: string,
        transactionEntityManager: EntityManager
    ) {
        const assignmentRepository =
            transactionEntityManager.getRepository(TicketAssignment);
        const assignment = await assignmentRepository.findOne({
            where: { assignmentId },
            relations: ["case", "technician"],
        });

        if (!assignment) {
            throw new ResourceNotFoundError("Assignment not found");
        }

        if (assignment.status !== assignmentStatus.PENDING) {
            throw new Error("Assignment is not in pending status");
        }

        // Update assignment
        await assignmentRepository.update(assignmentId, {
            status: assignmentStatus.ACCEPTED,
            acceptedDate: new Date(),
        });

        // Update case status to IN_PROGRESS
        await transactionEntityManager.getRepository(Case).update(assignment.case.caseId, {
            status: ticketStatus.IN_PROGRESS,
        });

        return assignment;
    }

    // Reject assignment
    async rejectAssignment(
        assignmentId: string,
        rejectionReason: string,
        transactionEntityManager: EntityManager
    ) {
        const assignmentRepository =
            transactionEntityManager.getRepository(TicketAssignment);
        const assignment = await assignmentRepository.findOne({
            where: { assignmentId },
            relations: ["case", "technician"],
        });

        if (!assignment) {
            throw new ResourceNotFoundError("Assignment not found");
        }

        if (assignment.status !== assignmentStatus.PENDING) {
            throw new Error("Assignment is not in pending status");
        }

        // Update assignment
        await assignmentRepository.update(assignmentId, {
            status: assignmentStatus.REJECTED,
            rejectionReason: rejectionReason,
        });

        // Update case - remove assigned technician and set back to NEW
        await transactionEntityManager.getRepository(Case).update(assignment.case.caseId, {
            assignedTechnician: null as any,
            status: ticketStatus.NEW,
        });

        return assignment;
    }

    // Complete assignment
    async completeAssignment(
        assignmentId: string,
        notes: string | undefined,
        transactionEntityManager: EntityManager
    ) {
        const assignmentRepository =
            transactionEntityManager.getRepository(TicketAssignment);
        const assignment = await assignmentRepository.findOne({
            where: { assignmentId },
            relations: ["case", "technician"],
        });

        if (!assignment) {
            throw new ResourceNotFoundError("Assignment not found");
        }

        if (assignment.status !== assignmentStatus.IN_PROGRESS) {
            throw new Error("Assignment is not in progress");
        }

        // Update assignment
        await assignmentRepository.update(assignmentId, {
            status: assignmentStatus.COMPLETED,
            completedDate: new Date(),
            assignmentNotes: notes || assignment.assignmentNotes,
        });

        // Update case status to RESOLVED
        await transactionEntityManager.getRepository(Case).update(assignment.case.caseId, {
            status: ticketStatus.RESOLVED,
            completedDate: new Date(),
        });

        // Increment technician's completed ticket count
        const technician = assignment.technician;
        await transactionEntityManager.getRepository(Technician).update(technician.technicianId, {
            totalTicketsCompleted: technician.totalTicketsCompleted + 1,
        });

        return assignment;
    }

    // Get assignments by case
    async getAssignmentsByCase(caseId: string) {
        const assignments = await AppDataSource.getRepository(TicketAssignment)
            .createQueryBuilder("assignment")
            .leftJoinAndSelect("assignment.technician", "technician")
            .leftJoinAndSelect("assignment.assignedBy", "user")
            .where("assignment.caseId = :caseId", { caseId })
            .orderBy("assignment.assignedDate", "DESC")
            .getMany();

        return assignments;
    }

    // Get assignments by technician
    async getAssignmentsByTechnician(
        technicianId: string,
        status: string[] | undefined,
        page: number,
        limit: number
    ) {
        let query = AppDataSource.getRepository(TicketAssignment)
            .createQueryBuilder("assignment")
            .leftJoinAndSelect("assignment.case", "case")
            .leftJoinAndSelect("assignment.assignedBy", "user")
            .where("assignment.technicianId = :technicianId", { technicianId })
            .orderBy("assignment.assignedDate", "DESC");

        if (status && status.length > 0) {
            query = query.andWhere("assignment.status IN (:...status)", { status });
        }

        const assignments = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: assignments[0],
            total: assignments[1],
            page,
            limit,
        };
    }

    // Get pending assignments for a technician
    async getPendingAssignments(technicianId: string) {
        const assignments = await AppDataSource.getRepository(TicketAssignment)
            .createQueryBuilder("assignment")
            .leftJoinAndSelect("assignment.case", "case")
            .leftJoinAndSelect("assignment.assignedBy", "user")
            .where("assignment.technicianId = :technicianId", { technicianId })
            .andWhere("assignment.status = :status", {
                status: assignmentStatus.PENDING,
            })
            .orderBy("assignment.assignedDate", "ASC")
            .getMany();

        return assignments;
    }

    // Start assignment (change from ACCEPTED to IN_PROGRESS)
    async startAssignment(
        assignmentId: string,
        transactionEntityManager: EntityManager
    ) {
        const assignmentRepository =
            transactionEntityManager.getRepository(TicketAssignment);
        const assignment = await assignmentRepository.findOne({
            where: { assignmentId },
            relations: ["case"],
        });

        if (!assignment) {
            throw new ResourceNotFoundError("Assignment not found");
        }

        if (assignment.status !== assignmentStatus.ACCEPTED) {
            throw new Error("Assignment must be accepted before starting");
        }

        // Update assignment
        await assignmentRepository.update(assignmentId, {
            status: assignmentStatus.IN_PROGRESS,
            startedDate: new Date(),
        });

        // Update case status
        await transactionEntityManager.getRepository(Case).update(assignment.case.caseId, {
            status: ticketStatus.IN_PROGRESS,
        });

        return assignment;
    }
}

export default TicketAssignmentService;
