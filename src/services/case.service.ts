import { Case } from "../entity/Case";
import { AppDataSource } from "../data-source";
import { EntityManager, UpdateResult } from "typeorm";
import { ResourceNotFoundError } from "../common/errors";
import { userInfo } from "../interfaces/types";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { Contact } from "../entity/Contact";
import { Account } from "../entity/Account";
import { Technician } from "../entity/Technician";
import { TicketAssignment } from "../entity/TicketAssignment";
import { TicketStatusHistory } from "../entity/TicketStatusHistory";
import { ticketStatus, assignmentStatus } from "../common/utils";
import { Role } from "../entity/Role";
import { DateRangeParamsType } from "../schemas/comman.schemas";

class CaseService {
    // Get all cases for an organization
    async getAllCases(userInfo: userInfo) {
        const cases = await AppDataSource.getRepository(Case)
            .createQueryBuilder("case")
            .leftJoinAndSelect("case.customer", "customer")
            .leftJoinAndSelect("case.account", "account")
            .leftJoinAndSelect("case.createdBy", "user")
            .leftJoinAndSelect("case.assignedTechnician", "technician")
            .leftJoinAndSelect("case.organization", "organisation")
            .where("organisation.organisationId = :organisationId", {
                organisationId: userInfo.organizationId,
            })
            .select([
                "case",
                "customer.contactId",
                "customer.fullName",
                "account.accountId",
                "account.accountName",
                "user.userId",
                "user.firstName",
                "user.lastName",
                "technician.technicianId",
                "technician.firstName",
                "technician.lastName",
            ])
            .orderBy("case.updatedAt", "DESC")
            .getMany();

        return cases;
    }

    // Get cases with pagination and filters
    async getCases(
        userId: string,
        search: string | undefined,
        status: string[] | undefined,
        priority: string[] | undefined,
        category: string[] | undefined,
        customerId: string | undefined,
        technicianId: string | undefined,
        page: number,
        limit: number,
        createdAt: string,
        updatedAt: string,
        dateRange: DateRangeParamsType,
        organizationId: string | null,
        view: string | null
    ) {
        try {
            let caseRepo;

            // Filter by view (myView = created by user, allView = all in organization)
            if (view == "myView" || view === "null") {
                caseRepo = AppDataSource.getRepository(Case)
                    .createQueryBuilder("case")
                    .select()
                    .leftJoinAndSelect("case.customer", "customer")
                    .leftJoinAndSelect("case.account", "account")
                    .leftJoinAndSelect("case.createdBy", "user")
                    .leftJoinAndSelect("case.assignedTechnician", "technician")
                    .where("case.createdById=:userId", { userId: userId })
                    .andWhere("case.organizationId=:organizationId", {
                        organizationId: organizationId,
                    })
                    .orderBy("case.updatedAt", "DESC");
            } else {
                caseRepo = AppDataSource.getRepository(Case)
                    .createQueryBuilder("case")
                    .select()
                    .leftJoinAndSelect("case.customer", "customer")
                    .leftJoinAndSelect("case.account", "account")
                    .leftJoinAndSelect("case.createdBy", "user")
                    .leftJoinAndSelect("case.assignedTechnician", "technician")
                    .where("case.organizationId=:organizationId", {
                        organizationId: organizationId,
                    })
                    .orderBy("case.updatedAt", "DESC");
            }

            // Apply filters
            if (status && status.length > 0) {
                caseRepo.andWhere("case.status IN (:...status)", { status });
            }

            if (priority && priority.length > 0) {
                caseRepo.andWhere("case.priority IN (:...priority)", { priority });
            }

            if (category && category.length > 0) {
                caseRepo.andWhere("case.category IN (:...category)", { category });
            }

            if (customerId) {
                caseRepo.andWhere("case.customerId = :customerId", { customerId });
            }

            if (technicianId) {
                caseRepo.andWhere("case.assignedTechnicianId = :technicianId", {
                    technicianId,
                });
            }

            if (createdAt != undefined) {
                caseRepo.orderBy(
                    "case.createdAt",
                    createdAt == "DESC" ? "DESC" : "ASC"
                );
            }

            if (updatedAt != undefined) {
                caseRepo.orderBy(
                    "case.updatedAt",
                    updatedAt == "DESC" ? "DESC" : "ASC"
                );
            }

            if (dateRange) {
                if (dateRange.startDate && dateRange.endDate) {
                    caseRepo.andWhere(
                        "DATE(case.updatedAt) BETWEEN :startDate AND :endDate",
                        {
                            startDate: dateRange.startDate,
                            endDate: dateRange.endDate,
                        }
                    );
                }
            }

            const cases = await caseRepo.getMany();

            // Search functionality
            let searchedData: Case[] = [];
            let skip = 0;
            if (search && cases.length > 0) {
                skip = 1;
                searchedData = cases.filter((caseItem) => {
                    if (
                        caseItem?.caseNumber
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.title
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.description
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.productName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.customer?.fullName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.assignedTechnician?.firstName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase()) ||
                        caseItem?.assignedTechnician?.lastName
                            ?.toLowerCase()
                            .includes(String(search).toLowerCase())
                    ) {
                        return true;
                    }
                    return false;
                });
            }

            if (searchedData.length === 0 && skip === 0) {
                searchedData = cases;
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

    // Get single case by ID
    async getCase(caseId: string) {
        try {
            const caseItem = await AppDataSource.getRepository(Case)
                .createQueryBuilder("case")
                .select()
                .leftJoinAndSelect("case.customer", "customer")
                .leftJoinAndSelect("case.account", "account")
                .leftJoinAndSelect("case.createdBy", "user")
                .leftJoinAndSelect("case.assignedTechnician", "technician")
                .leftJoinAndSelect("case.assignments", "assignments")
                .leftJoinAndSelect("case.statusHistory", "statusHistory")
                .where({ caseId: caseId })
                .getOne();

            return caseItem;
        } catch (error) {
            throw error;
        }
    }

    // Generate unique case number
    async generateCaseNumber(organizationId: string): Promise<string> {
        const year = new Date().getFullYear();

        const lastCase = await AppDataSource.getRepository(Case)
            .createQueryBuilder("case")
            .withDeleted()
            .where("case.organizationId = :organizationId", { organizationId })
            .andWhere("YEAR(case.createdAt) = :year", { year })
            .orderBy("case.createdAt", "DESC")
            .getOne();

        let caseNo = 0;
        if (lastCase && lastCase.caseNumber) {
            const lastNumber = lastCase.caseNumber.split("-")[2];
            caseNo = parseInt(lastNumber);
        }

        const caseNumber = `CASE-${year}-${String(caseNo + 1).padStart(4, "0")}`;
        return caseNumber;
    }

    // Create new case
    async createCase(
        payload: Case,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        // Generate case number
        payload.caseNumber = await this.generateCaseNumber(user.organizationId!);

        // Set created by user
        const userRepo = transactionEntityManager.getRepository(User);
        const userData = await userRepo.findOne({ where: { userId: user.userId } });
        if (userData) {
            payload.createdBy = userData as User;
        }

        // Set organization
        const organizationRepo = transactionEntityManager.getRepository(Organisation);
        if (user.organizationId) {
            const orgData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
            });
            if (orgData) payload.organization = orgData;
        }

        if (payload.customer) {
            const customerId = String(payload.customer);

            const customer = await transactionEntityManager
                .getRepository(Contact)
                .findOne({ where: { contactId: customerId } });

            if (!customer) {
                throw new ResourceNotFoundError("Customer not found");
            }

            payload.customer = customer;
        }


        // Set account (optional)
        if (payload.account) {
            const account = await transactionEntityManager
                .getRepository(Account)
                .findOne({ where: { accountId: String(payload.account) } });
            if (account) {
                payload.account = account;
            }
        }

        // Set default status
        if (!payload.status) {
            payload.status = ticketStatus.NEW;
        }

        // Generate UUID for caseId
        const { v4: uuidv4 } = require('uuid');
        payload.caseId = uuidv4();

        const caseInstance = new Case(payload);
        const caseObj = await transactionEntityManager.save(caseInstance);

        // Create initial status history
        const statusHistory = new TicketStatusHistory({
            case: caseObj,
            previousStatus: null as any,
            newStatus: ticketStatus.NEW,
            changedDate: new Date(),
            reason: "Case created",
            changedBy: userData!,
            organization: payload.organization,
        } as TicketStatusHistory);

        await transactionEntityManager.save(statusHistory);

        return caseObj;
    }

    // Update case
    async updateCase(
        payload: Case,
        caseId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const caseRepository = transactionEntityManager.getRepository(Case);
        const existingCase = await caseRepository.findOne({
            where: { caseId: caseId },
        });

        if (!existingCase) {
            throw new ResourceNotFoundError("Case not found");
        }

        payload.modifiedBy = user.email;

        // Update customer if provided
        if (payload.customer) {
            const customer = await transactionEntityManager
                .getRepository(Contact)
                .findOne({ where: { contactId: String(payload.customer) } });
            if (!customer) {
                throw new ResourceNotFoundError("Customer not found");
            }
            payload.customer = customer;
        }

        // Update account if provided
        if (payload.account) {
            const account = await transactionEntityManager
                .getRepository(Account)
                .findOne({ where: { accountId: String(payload.account) } });
            if (account) {
                payload.account = account;
            }
        }

        const caseEntity = new Case(payload);
        const update = await caseRepository.update(caseId, caseEntity);

        return update;
    }

    // Delete case (soft delete)
    async deleteCase(
        caseId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const caseRepository = transactionEntityManager.getRepository(Case);
        const caseItem = await caseRepository.findOneBy({ caseId: caseId });

        if (!caseItem) {
            throw new ResourceNotFoundError("Case not found");
        }

        await caseRepository.softDelete(caseId);
        await caseRepository.update(caseId, { modifiedBy: user.email });

        return caseItem;
    }

    // Bulk delete cases
    async bulkDeleteCase(
        caseIds: string[],
        transactionEntityManager: EntityManager
    ) {
        const caseRepository = transactionEntityManager.getRepository(Case);
        const deleted: string[] = [];
        const notFound: string[] = [];

        for (const caseId of caseIds) {
            const caseItem = await caseRepository.findOne({ where: { caseId } });
            if (caseItem) {
                await caseRepository.softDelete(caseId);
                deleted.push(caseId);
            } else {
                notFound.push(caseId);
            }
        }

        return { deleted, notFound };
    }

    // Partially update case
    async partiallyUpdateCase(
        caseId: string,
        payload: Partial<Case>
    ): Promise<UpdateResult> {
        const update = await AppDataSource.getRepository(Case).update(caseId, {
            ...payload,
        });
        return update;
    }

    // Assign technician to case
    async assignTechnician(
        caseId: string,
        technicianId: string,
        assignedBy: userInfo,
        assignmentNotes: string | undefined,
        transactionEntityManager: EntityManager
    ) {
        const caseRepository = transactionEntityManager.getRepository(Case);
        const caseItem = await caseRepository.findOne({ where: { caseId } });

        if (!caseItem) {
            throw new ResourceNotFoundError("Case not found");
        }

        const technician = await transactionEntityManager
            .getRepository(Technician)
            .findOne({ where: { technicianId } });

        if (!technician) {
            throw new ResourceNotFoundError("Technician not found");
        }

        // Update case with assigned technician
        await caseRepository.update(caseId, {
            assignedTechnician: technician,
            status: ticketStatus.ASSIGNED,
        });

        // Create assignment record
        const user = await transactionEntityManager
            .getRepository(User)
            .findOne({ where: { userId: assignedBy.userId } });

        const assignment = new TicketAssignment({
            case: caseItem,
            technician: technician,
            assignedBy: user!,
            assignedDate: new Date(),
            status: assignmentStatus.PENDING,
            assignmentNotes: assignmentNotes || null,
            organization: caseItem.organization,
        } as TicketAssignment);

        await transactionEntityManager.save(assignment);

        // Create status history
        const statusHistory = new TicketStatusHistory({
            case: caseItem,
            previousStatus: caseItem.status,
            newStatus: ticketStatus.ASSIGNED,
            changedDate: new Date(),
            reason: `Assigned to technician ${technician.firstName} ${technician.lastName}`,
            changedBy: user!,
            organization: caseItem.organization,
        } as TicketStatusHistory);

        await transactionEntityManager.save(statusHistory);

        return assignment;
    }

    // Update case status
    async updateStatus(
        caseId: string,
        newStatus: ticketStatus,
        reason: string | undefined,
        notes: string | undefined,
        changedBy: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const caseRepository = transactionEntityManager.getRepository(Case);
        const caseItem = await caseRepository.findOne({ where: { caseId } });

        if (!caseItem) {
            throw new ResourceNotFoundError("Case not found");
        }

        const previousStatus = caseItem.status;

        // Update case status
        await caseRepository.update(caseId, { status: newStatus });

        // Create status history
        const user = await transactionEntityManager
            .getRepository(User)
            .findOne({ where: { userId: changedBy.userId } });

        const statusHistory = new TicketStatusHistory({
            case: caseItem,
            previousStatus: previousStatus,
            newStatus: newStatus,
            changedDate: new Date(),
            reason: reason || null,
            notes: notes || null,
            changedBy: user!,
            organization: caseItem.organization,
        } as TicketStatusHistory);

        await transactionEntityManager.save(statusHistory);

        return statusHistory;
    }

    // Get cases by customer
    async getCasesByCustomer(
        customerId: string,
        page: number,
        limit: number,
        organizationId: string
    ) {
        const cases = await AppDataSource.getRepository(Case)
            .createQueryBuilder("case")
            .leftJoinAndSelect("case.assignedTechnician", "technician")
            .leftJoinAndSelect("case.createdBy", "user")
            .where("case.customerId = :customerId", { customerId })
            .andWhere("case.organizationId = :organizationId", { organizationId })
            .orderBy("case.updatedAt", "DESC")
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: cases[0],
            total: cases[1],
            page,
            limit,
        };
    }

    // Get cases by technician
    async getCasesByTechnician(
        technicianId: string,
        page: number,
        limit: number,
        organizationId: string
    ) {
        const cases = await AppDataSource.getRepository(Case)
            .createQueryBuilder("case")
            .leftJoinAndSelect("case.customer", "customer")
            .leftJoinAndSelect("case.createdBy", "user")
            .where("case.assignedTechnicianId = :technicianId", { technicianId })
            .andWhere("case.organizationId = :organizationId", { organizationId })
            .orderBy("case.updatedAt", "DESC")
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: cases[0],
            total: cases[1],
            page,
            limit,
        };
    }

    // Get case status history
    async getStatusHistory(caseId: string) {
        const history = await AppDataSource.getRepository(TicketStatusHistory)
            .createQueryBuilder("history")
            .leftJoinAndSelect("history.changedBy", "user")
            .where("history.caseId = :caseId", { caseId })
            .orderBy("history.changedDate", "DESC")
            .getMany();

        return history;
    }
}

export default CaseService;
