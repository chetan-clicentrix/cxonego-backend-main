import { AppDataSource } from "../data-source";
import { Oppurtunity } from "../entity/Oppurtunity";
import { EntityManager, UpdateResult } from "typeorm";
import {
  ResourceNotFoundError,
  ValidationFailedError,
  errorHandler,
} from "../common/errors";
import {
  auditType,
  decrypt,
  encryption,
  purchaseTimeFrame,
  roleNames,
  statusType,
  stage,
} from "../common/utils";
import { Lead } from "../entity/Lead";
import { Role } from "../entity/Role";
import { Contact } from "../entity/Contact";
import { Bank } from "../entity/Bank";
import { Account } from "../entity/Account";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import {
  accountDecryption,
  contactDecryption,
  leadDecryption,
  opportunityDecryption,
  orgnizationDecryption,
  userDecryption,
} from "./decryption.service";
import { User } from "../entity/User";
import { ActivityPlanService } from "./activityPlan.service";
import { Audit } from "../entity/Audit";
import { userInfo } from "../interfaces/types";
import { Organisation } from "../entity/Organisation";
import { ProposalGroup } from "../entity/ProposalGroup";
import { v4 as uuidv4 } from "uuid";

class opportunityService {
  private activityPlanService = new ActivityPlanService();
  async getAllOppurtunities(userInfo: userInfo) {
    const oppurtunities = await AppDataSource.getRepository(Oppurtunity)
      .createQueryBuilder("opportunity")
      .leftJoinAndSelect("opportunity.owner", "user")
      .leftJoinAndSelect("opportunity.company", "account")
      .leftJoinAndSelect("opportunity.contact", "contact")
      .leftJoinAndSelect("opportunity.organization", "organization")
      // .where("user.userId = :userId", { userId: userInfo.userId })
      .where("organization.organisationId = :organizationId", {
        organizationId: userInfo.organizationId,
      })
      .select(["opportunity", "user.userId", "user.firstName", "user.lastName", "account", "contact"])
      .orderBy("opportunity.updatedAt", "DESC")
      .getMany();

    for (let opportunity of oppurtunities) {
      opportunity = await opportunityDecryption(opportunity);
      opportunity.company = await accountDecryption(opportunity.company);
      opportunity.contact = await contactDecryption(opportunity.contact);
      opportunity.owner = await userDecryption(opportunity.owner);
    }
    return oppurtunities;
  }
  async getOpportunityId(date: Date) {
    const month = String(
      date.getMonth() + 1 >= 10
        ? date.getMonth() + 1
        : "0" + (date.getMonth() + 1)
    );
    const year = String(date.getFullYear().toString().slice(-2));

    const lastOppurtunity = await AppDataSource.getRepository(Oppurtunity)
      .createQueryBuilder("Oppurtunity")
      .withDeleted()
      .select()
      .orderBy("Oppurtunity.createdAt", "DESC")
      .getOne();

    let OppurtunityNo = "00";
    const yearFromRecord = String(lastOppurtunity?.opportunityId.slice(5, 7)); //OPP032402
    const oppurtunityNoFromRecord = String(
      lastOppurtunity?.opportunityId.substring(7)
    );

    if (year === yearFromRecord) {
      OppurtunityNo = oppurtunityNoFromRecord;
    }

    const OppurtunityId =
      "OPP" + month + year + "0" + (Number(OppurtunityNo) + 1).toString();

    return OppurtunityId;
  }
  async getAllOppurtunity(
    userId: string,
    _role: Role[],
    search: string | undefined,
    page: number = 1,
    limit: number = 7,
    purchaseTimeFrame: string[] | undefined,
    forecastCategory: string[] | undefined,
    probability: string[] | undefined,
    stage: string[] | undefined,
    status: string[] | undefined,
    priority: string[] | undefined,
    purchaseProcess: string[] | undefined,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    company: string | undefined,
    contact: string | undefined,
    organizationId: string | null,
    view: string | null
  ) {
    let oppurtunityRepo;
    // if(role.length===1 && role[0].roleName===roleNames.SALESPERSON){
    if (view == "myView" || view === "null") {
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.banks", "Bank")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.ownerId=:userId", { userId: userId })
        .andWhere("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    } else {
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.banks", "Bank")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    }

    if (purchaseTimeFrame && purchaseTimeFrame.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseTimeFrame IN (:purchaseTimeFrame)",
        { purchaseTimeFrame }
      );
    }

    if (forecastCategory && forecastCategory.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.forecastCategory IN (:forecastCategory)",
        { forecastCategory }
      );
    }

    if (probability && probability.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.probability IN (:probability)", {
        probability,
      });
    }

    if (stage && stage.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.stage IN (:stage)", { stage });
    }

    if (status && status.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.status IN (:status)", { status });
    }

    if (priority && priority.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.priority IN (:priority)", {
        priority,
      });
    }

    if (purchaseProcess && purchaseProcess.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseProcess IN (:purchaseProcess)",
        { purchaseProcess }
      );
    }

    if (createdAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.createdAt",
        createdAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (updatedAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.updatedAt",
        updatedAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (dateRange) {
      if (dateRange.startDate && dateRange.endDate) {
        oppurtunityRepo.andWhere(
          "DATE(Oppurtunity.updatedAt) BETWEEN :startDate AND :endDate",
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }
        );
      }
    }
    const oppurtunites = await oppurtunityRepo.getMany();

    //All decryption done here
    for (let opportunity of oppurtunites) {
      opportunity = await opportunityDecryption(opportunity);
      if (opportunity.company) {
        opportunity.company = await accountDecryption(
          opportunity.company as Account
        );
      }
      if (opportunity.contact) {
        opportunity.contact = await contactDecryption(
          opportunity.contact as Contact
        );
      }
      if (opportunity.Lead) {
        opportunity.Lead = await leadDecryption(opportunity.Lead as Lead);
      }
      if (opportunity.owner) {
        opportunity.owner = await userDecryption(opportunity.owner as User);
      }
    }

    let searchData: Oppurtunity[] = [];
    let skip = 0;
    if (search) {
      skip = 1;
      searchData = oppurtunites.filter((oppurtunity) => {
        if (
          (oppurtunity?.title &&
            oppurtunity?.title
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.currency &&
            oppurtunity?.currency
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseTimeFrame &&
            oppurtunity?.purchaseTimeFrame
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseProcess &&
            oppurtunity?.purchaseProcess
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.forecastCategory &&
            oppurtunity?.forecastCategory
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedRevenue &&
            oppurtunity?.estimatedRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualRevenue &&
            oppurtunity?.actualRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanType &&
            oppurtunity?.loanType
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanAmount &&
            oppurtunity?.loanAmount
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.probability &&
            oppurtunity?.probability
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.description &&
            oppurtunity?.description
              ?.toString()
              .toLowerCase()
              .includes(String(search))) ||
          (oppurtunity?.currentNeed &&
            oppurtunity?.currentNeed
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.proposedSolution &&
            oppurtunity?.proposedSolution
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.stage &&
            oppurtunity?.stage
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.status &&
            oppurtunity?.status
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedCloseDate &&
            oppurtunity?.estimatedCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualCloseDate &&
            oppurtunity?.actualCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.company?.accountName &&
            oppurtunity?.company?.accountName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.contact?.fullName &&
            oppurtunity?.contact?.fullName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.firstName &&
            oppurtunity?.owner?.firstName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.lastName &&
            oppurtunity?.owner?.lastName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonReason &&
            oppurtunity?.wonReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.lostReason &&
            oppurtunity?.lostReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonLostDescription &&
            oppurtunity?.wonLostDescription
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.priority &&
            oppurtunity?.priority
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()))
        ) {
          return true;
        }
      });
    }

    if (contact || company) {
      skip = 1;
      searchData = await oppurtunites.filter((opportunity) => {
        const matchContact =
          !contact ||
          opportunity.contact?.fullName
            ?.toLowerCase()
            .includes(contact?.toLowerCase());
        const matchCompany =
          !company ||
          opportunity.company?.accountName
            ?.toLowerCase()
            .includes(company.toLowerCase());
        return matchContact && matchCompany;
      });
    }

    let total = 0;
    if (skip == 0 && searchData.length == 0) {
      total = oppurtunites.length;
      searchData = oppurtunites;
    } else {
      total = searchData.length;
    }

    searchData = searchData.slice((page - 1) * limit, page * limit);

    const pagination = {
      total: total,
      page: page,
      limit: limit,
      data: searchData,
    };
    return pagination;
  }
  async isOppurtunityExists(opportunityId: string) {
    const oppurtunity = await AppDataSource.getRepository(Oppurtunity).findOne({
      where: {
        opportunityId: opportunityId,
      },
    });
    return oppurtunity ? true : false;
  }
  /**
   * Create a single opportunity for ONE bank.
   * The controller calls this once per bank, then calls createProposalGroup
   * afterwards if multiple banks were selected.
   *
   * @param payload      - opportunity fields from request body
   * @param singleBankId - the bankId this proposal is for (already resolved from the loop)
   * @param isPrimary    - true for the first bank in the list
   * @param user         - authenticated user
   * @param tem          - transaction entity manager
   */
  async createOppurtunity(
    payload: Oppurtunity,
    user: userInfo,
    transactionEntityManager: EntityManager,
    singleBankId?: string,
    isPrimary: boolean = false
  ) {
    // Use transactionEntityManager for ALL repos to avoid lock conflicts
    const userRepo = transactionEntityManager.getRepository(User);
    const userData = await userRepo.findOne({ where: { userId: user.userId } });
    if (userData) {
      payload.owner = userData as User;
    }

    const organizationRepo = transactionEntityManager.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    if (payload.Lead) {
      const lead = await transactionEntityManager.getRepository(Lead).findOne({
        where: { leadId: String(payload.Lead) },
      });
      if (lead) {
        payload.Lead = lead;
      } else {
        throw new ResourceNotFoundError("Lead not found");
      }
    }

    if (payload.contact) {
      const contact = await transactionEntityManager.getRepository(Contact).findOne({
        where: { contactId: String(payload.contact) },
      });
      if (contact) {
        payload.contact = contact;
      } else {
        throw new ResourceNotFoundError("Contact not found");
      }
    }

    if (payload.company) {
      const companyRepo = transactionEntityManager.getRepository(Account);
      const companydata = await companyRepo.findOne({
        where: { accountId: String(payload.company) },
      });
      if (companydata) {
        // Update Account with Category/Segment if provided in payload (e.g. from lead qualification)
        const extraPayload = payload as any;
        let updateNeeded = false;
        if (extraPayload.category) {
          companydata.clientCategory = extraPayload.category;
          updateNeeded = true;
        }
        if (extraPayload.segment) {
          companydata.segment = extraPayload.segment;
          updateNeeded = true;
        }
        if (updateNeeded) {
          await companyRepo.save(companydata);
        }
        payload.company = companydata;
      } else {
        throw new ResourceNotFoundError("Account not found");
      }
    }

    // ── Single-bank assignment ───────────────────────────────────────────
    // When called from the multi-bank loop, singleBankId is provided.
    // When called the old single-call way (no singleBankId passed), fall back
    // to the full banks array on the payload so legacy behaviour is preserved.
    if (singleBankId) {
      const bankRepo = transactionEntityManager.getRepository(Bank);
      const bank = await bankRepo.findOne({ where: { bankId: singleBankId } });
      if (bank) {
        payload.banks = [bank];
      }
    } else if (payload.banks && Array.isArray(payload.banks)) {
      const bankRepo = transactionEntityManager.getRepository(Bank);
      const bankIds = (payload.banks as any[]).map(b => typeof b === 'string' ? b : b.bankId).filter(Boolean);
      if (bankIds.length > 0) {
        const banks = await bankRepo.findByIds(bankIds);
        if (banks.length > 0) {
          payload.banks = banks;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────

    const opportunityInstance = new Oppurtunity({
      ...payload,
      opportunityId: await this.getOpportunityId(new Date()),
      isPrimary,
      proposalGroupId: null,   // will be set by createProposalGroup if needed
      proposalGroup: null,
    } as Oppurtunity);

    // Use transactionEntityManager to save — avoids opening a separate connection
    // that would conflict with the outer transaction's locks
    const opportunityRepo = transactionEntityManager.getRepository(Oppurtunity);
    const opportunity = await opportunityRepo.save(opportunityInstance);

    const auditId = String(user.auth_time) + user.userId;
    await this.createAuditLogHandler(
      transactionEntityManager,
      opportunity,
      auditId
    );

    // NOTE: autoAssignPlanToOpportunity is intentionally called AFTER the transaction
    // completes (from the controller) to avoid nested lock conflicts.
    // We return the opportunityId so the controller can trigger it post-commit.

    return opportunity;
  }

  /**
   * Links a list of opportunities together under one ProposalGroup.
   * Only called when multiple banks were selected (opportunities.length > 1).
   * The FIRST opportunity in the list is set as isPrimary = true.
   */
  async createProposalGroup(
    opportunities: Oppurtunity[],
    organizationId: string,
    transactionEntityManager: EntityManager
  ): Promise<ProposalGroup> {
    const groupRepo = transactionEntityManager.getRepository(ProposalGroup);
    const opportunityRepo = transactionEntityManager.getRepository(Oppurtunity);

    const group = new ProposalGroup({
      proposalGroupId: uuidv4(),
      organizationId,
    });
    const savedGroup = await groupRepo.save(group);

    // Update each opportunity: link to group, mark first as primary
    for (let i = 0; i < opportunities.length; i++) {
      await opportunityRepo.update(opportunities[i].opportunityId, {
        proposalGroupId: savedGroup.proposalGroupId,
        isPrimary: i === 0,
      });
    }

    return savedGroup;
  }

  /**
   * Returns all sibling opportunities in the same ProposalGroup,
   * EXCLUDING the given opportunityId.
   */
  async getSiblings(opportunityId: string): Promise<Oppurtunity[]> {
    const opportunityRepo = AppDataSource.getRepository(Oppurtunity);
    const opp = await opportunityRepo.findOne({ where: { opportunityId } });
    if (!opp || !opp.proposalGroupId) return [];

    return opportunityRepo
      .createQueryBuilder('o')
      .where('o.proposalGroupId = :groupId', { groupId: opp.proposalGroupId })
      .andWhere('o.opportunityId != :oppId', { oppId: opportunityId })
      .getMany();
  }

  async postCreateOpportunityTasks(opportunity: Oppurtunity, user: userInfo) {
    // This runs AFTER the transaction commits to avoid lock wait timeouts.
    // autoAssignPlanToOpportunity uses its own DB connections and would
    // deadlock if called inside the create transaction.
    try {
      await this.activityPlanService.autoAssignPlanToOpportunity(opportunity, user);
    } catch (error) {
      console.error('[OPPORTUNITY] Error in post-create tasks:', error);
      // Don't throw — opportunity was already created successfully
    }
  }

  async updateOppurtunity(
    opportunityId: string,
    payload: Oppurtunity,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    payload.modifiedBy = user.email;
    const oppurtunityRepo = transactionEntityManager.getRepository(Oppurtunity);
    const opportunity = await oppurtunityRepo.findOneBy({
      opportunityId: opportunityId,
    });
    if (!opportunity) {
      throw new ResourceNotFoundError("Opportunity not found");
    }

    const organizationRepo = AppDataSource.getRepository(Organisation);
    if (user.organizationId) {
      const orgnizationData = await organizationRepo.findOne({
        where: { organisationId: user.organizationId },
      });
      if (orgnizationData) payload.organization = orgnizationData;
    }

    const userRepo = AppDataSource.getRepository(User);
    const userObj: User = payload.owner;
    if (payload.owner) {
      const userData = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.organisation", "organisation")
        .where({
          userId: userObj.userId,
        })
        .andWhere({ organisation: user.organizationId })
        .getOne();
      if (userData) {
        payload.owner = userData as User;
      }
    }

    let lead;
    if (payload.Lead) {
      lead = await AppDataSource.getRepository(Lead).findOne({
        where: { leadId: String(payload.Lead) },
      });
      if (!lead) {
        throw new ResourceNotFoundError("Lead not found");
      }
      payload.Lead = lead;
    }

    let company;
    if (payload.company) {
      company = await AppDataSource.getRepository(Account).findOne({
        where: { accountId: String(payload.company) },
      });
      if (!company) {
        throw new ResourceNotFoundError("Account not found");
      }
      payload.company = company;
    }

    let contact;
    if (payload.contact) {
      contact = await AppDataSource.getRepository(Contact).findOne({
        where: { contactId: String(payload.contact) },
      });
      if (!company) {
        throw new ResourceNotFoundError("Contact not found");
      }
      if (contact) payload.contact = contact;
    }

    // Handle banks array
    if (payload.banks && Array.isArray(payload.banks)) {
      const bankRepo = transactionEntityManager.getRepository(Bank);
      const bankIds = payload.banks.map(b => typeof b === 'string' ? b : (b as any).bankId).filter(Boolean);
      if (bankIds.length > 0) {
        const banks = await bankRepo.findByIds(bankIds);
        if (banks.length > 0) {
          payload.banks = banks;
        }
      }
    }

    // Auto-mark as Won when stage is Disbursed
    if (payload.stage === stage.DISBURSED) {
      payload.stage = stage.WON;
    }

    // Use save() instead of update() for many-to-many relationships
    // Merge the payload with the existing opportunity
    Object.assign(opportunity, payload);
    const updatedOpportunity = await oppurtunityRepo.save(opportunity);

    const auditId = String(user.auth_time) + user.userId;
    await this.updateAuditLogHandler(
      transactionEntityManager,
      opportunity,
      payload as any,
      payload.modifiedBy,
      auditId
    );

    return updatedOpportunity;
  }
  async deleteOppurtunity(
    opportunityId: string,
    user: userInfo,
    transactionEntityManager: EntityManager
  ) {
    try {
      const oppurtunityRepo =
        transactionEntityManager.getRepository(Oppurtunity);
      const opportunity = await oppurtunityRepo.findOneBy({
        opportunityId: opportunityId,
      });
      if (!opportunity) {
        throw new Error("Oppurtunity does not exist");
      }
      await AppDataSource.getRepository(Oppurtunity).softDelete(opportunityId);
      const auditId = String(user.auth_time) + user.userId;

      await oppurtunityRepo.update(opportunityId, { modifiedBy: user.email });
      const opportunityData = await oppurtunityRepo.findOne({
        withDeleted: true, // Include soft-deleted entities
        where: { opportunityId: opportunityId },
      });

      if (opportunityData) {
        await this.deleteAuditLogHandler(
          transactionEntityManager,
          opportunityData,
          auditId
        );
      }

      return opportunity;
    } catch (error) {
      throw new Error("Oppurtunity does not exist");
    }
  }
  async getOppurtunityById(opportunityId: string) {
    let oppurtunity = await AppDataSource.getRepository(Oppurtunity).findOne({
      where: {
        opportunityId: opportunityId,
      },
    });

    if (oppurtunity) {
      oppurtunity = await opportunityDecryption(oppurtunity);
      if (oppurtunity.company) {
        oppurtunity.company = await accountDecryption(oppurtunity.company);
      }
      if (oppurtunity.contact) {
        oppurtunity.contact = await contactDecryption(oppurtunity.contact);
      }
      if (oppurtunity.Lead) {
        oppurtunity.Lead = await leadDecryption(oppurtunity.Lead);
      }
      if (oppurtunity.organization) {
        oppurtunity.organization = await orgnizationDecryption(
          oppurtunity.organization
        );
      }
      if (oppurtunity.owner) {
        oppurtunity.owner = await userDecryption(oppurtunity.owner);
      }
    }
    return oppurtunity;
  }

  async bulkDeleteOpportunity(
    opportunityIds: Array<string>,
    userId: string,
    auth_time: number,
    email: string,
    transactionEntityManager: EntityManager
  ) {
    try {
      const auditId = String(auth_time) + userId;
      const opportunityRepository =
        await transactionEntityManager.getRepository(Oppurtunity);
      const { opportunityCanBeDelete, opportunityCanNotBeDeleted } =
        await this.isOpportunityExistsByIdToBulkdelete(
          transactionEntityManager,
          opportunityIds
        );
      for (const opportunityId of opportunityCanBeDelete) {
        await opportunityRepository.softDelete(opportunityId);

        await opportunityRepository.update(opportunityId, {
          modifiedBy: email,
        });
        const opportunityData = await opportunityRepository.findOne({
          withDeleted: true, // Include soft-deleted entities
          where: { opportunityId: opportunityId },
        });
        if (opportunityData) {
          await this.deleteAuditLogHandler(
            transactionEntityManager,
            opportunityData,
            auditId
          );
        }
      }
      return {
        deleted: opportunityCanBeDelete,
        opportunitiesNotFound: opportunityCanNotBeDeleted,
      };
    } catch (error) {
      return;
    }
  }

  async isOpportunityExistsByIdToBulkdelete(
    transactionEntityManager: EntityManager,
    opportunityIds: Array<string>
  ) {
    const opportunityRepository =
      transactionEntityManager.getRepository(Oppurtunity);
    const opportunityCanNotBeDeleted: Array<string> = [];
    const opportunityCanBeDelete: Array<string> = [];
    for (const opportunityId of opportunityIds) {
      const opportunity = await opportunityRepository.findOne({
        where: {
          opportunityId: opportunityId,
        },
      });

      if (opportunity) {
        opportunityCanBeDelete.push(opportunityId);
      } else {
        opportunityCanNotBeDeleted.push(opportunityId);
      }
    }
    return { opportunityCanBeDelete, opportunityCanNotBeDeleted };
  }

  async createAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldOpportunityRecord: Oppurtunity,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const title = decrypt(oldOpportunityRecord.title);
    const description = `New opportunity created with title ${title}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.INSERTED,
      opportunity: oldOpportunityRecord,
      owner: oldOpportunityRecord.owner,
      modifiedBy: oldOpportunityRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async deleteAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldOpportunityRecord: Oppurtunity,
    auditId: string
  ) {
    const auditRepository = transactionEntityManager.getRepository(Audit);
    const title = decrypt(oldOpportunityRecord.title);
    const description = `Opportunity has been deleted with title ${title}`;
    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.DELETED,
      opportunity: oldOpportunityRecord,
      owner: oldOpportunityRecord.owner,
      modifiedBy: oldOpportunityRecord.modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.save(auditInstance);
  }

  async updateAuditLogHandler(
    transactionEntityManager: EntityManager,
    oldOpportunityRecord: Oppurtunity,
    updatedOpportunityRecord: Oppurtunity,
    modifiedBy: string,
    auditId: string
  ) {
    const updatedOpportunity = Object(updatedOpportunityRecord);

    const oldOpportunity = Object(oldOpportunityRecord);
    const auditRepository = transactionEntityManager.getRepository(Audit);
    let description = "";
    const predescription = await auditRepository.findOne({
      where: { auditId: auditId },
    });

    if (predescription) {
      description = predescription.description;
    }

    //keys which are encrypted in table goes in if block and non encrypted goes in else block
    const keywords = [
      "title",
      "description",
      "currentNeed",
      "proposedSolution",
      "wonLostDescription",
      "estimatedRevenue",
      "actualRevenue",
      "loanType",
      "loanAmount",
    ];

    for (let key in updatedOpportunity) {
      if (`${key}` === "contact") {
        const oldContact = oldOpportunity[key];
        const updatedContact = updatedOpportunity[key];
        if (!oldContact && updatedContact) {
          description += `null --> ${decrypt(updatedContact.fullName)}`;
        } else if (oldContact && !updatedContact) {
          description += `${decrypt(oldContact.fullName)} --> null`;
        } else if (
          oldContact != updatedContact &&
          updatedOpportunity[key].contactId !== oldOpportunity[key].contactId
        ) {
          const oldContactName = decrypt(oldOpportunity[key].fullName);
          const updatedContactName = decrypt(updatedOpportunity[key].fullName);
          description += `${key} ${oldContactName} --> ${updatedContactName} `;
        }
      } else if (`${key}` === "company") {
        const oldCompany = oldOpportunity[key];
        const updatedCompany = updatedOpportunity[key];

        if (!oldCompany && updatedCompany) {
          description += `null --> ${decrypt(updatedCompany.accountName)}`;
        } else if (oldCompany && !updatedCompany) {
          description += `${decrypt(oldCompany.accountName)} --> null`;
        } else if (
          oldCompany != updatedCompany &&
          updatedOpportunity[key].accountId !== oldOpportunity[key].accountId
        ) {
          const oldCompanyName = decrypt(oldOpportunity[key].accountName);
          const updatedCompanyName = decrypt(
            updatedOpportunity[key].accountName
          );
          description += `${key} ${oldCompanyName} --> ${updatedCompanyName} `;
        }
      } else if (`${key}` === "owner") {
        if (updatedOpportunity[key].userId !== oldOpportunity[key].userId) {
          const oldOwnerName =
            decrypt(oldOpportunity[key].firstName) +
            " " +
            decrypt(oldOpportunity[key].lastName);
          const updatedOwnerName =
            decrypt(updatedOpportunity[key].firstName) +
            " " +
            decrypt(updatedOpportunity[key].lastName);
          description += `${key} ${oldOwnerName} --> ${updatedOwnerName} `;
        }
      } else if (updatedOpportunity[key] !== oldOpportunity[key]) {
        if (
          `${key}` !== "owner" &&
          `${key}` !== "company" &&
          `${key}` !== "contact" &&
          `${key}` !== "Lead" &&
          `${key}` !== "modifiedBy" &&
          `${key}` !== "organization"
        ) {
          if (keywords.includes(key)) {
            description +=
              key +
              " " +
              (oldOpportunity[key] !== null
                ? decrypt(oldOpportunity[key])
                : "null") +
              " --> " +
              (updatedOpportunity[key] !== null
                ? decrypt(updatedOpportunity[key])
                : "null") +
              " ";
          } else {
            if (
              `${key}` === "actualCloseDate" ||
              `${key}` === "estimatedCloseDate"
            ) {
              const oldDate = new Date(oldOpportunity[key]);
              const updatedDate = new Date(updatedOpportunity[key]);
              if (oldDate.getTime() !== updatedDate.getTime()) {
                description += `${key} ${oldDate} --> ${updatedDate} `;
              }
            } else {
              description += `${key} ${oldOpportunity[key]} --> ${updatedOpportunity[key]} `;
            }
          }
        }
      }
    }

    const title = decrypt(oldOpportunityRecord.title);
    if (!predescription)
      description = `${title} opportunity changed from ${description}`;

    const payload = {
      auditId: auditId,
      description: encryption(description),
      auditType: auditType.UPDATED,
      opportunity: oldOpportunityRecord,
      owner: oldOpportunityRecord.owner,
      modifiedBy: modifiedBy,
    };
    const auditInstance = new Audit(payload as Audit);
    return await auditRepository.insert(auditInstance);
  }

  async getAllOppurtunityByAccountId(
    userId: string,
    _role: Role[],
    search: string | undefined,
    page: number = 1,
    limit: number = 7,
    purchaseTimeFrame: string[] | undefined,
    forecastCategory: string[] | undefined,
    probability: string[] | undefined,
    stage: string[] | undefined,
    status: string[] | undefined,
    priority: string[] | undefined,
    purchaseProcess: string[] | undefined,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    company: string | undefined,
    contact: string | undefined,
    accountID: string | undefined,
    organizationId: string | null,
    view: string | null
  ) {
    let oppurtunityRepo;
    if (view == "myView" || view === "null") {
      // if(role.length===1 && role[0].roleName===roleNames.SALESPERSON){
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.ownerId=:userId", { userId: userId })
        .andWhere("Oppurtunity.companyAccountId=:accountID", {
          accountID: accountID,
        })
        .andWhere("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    } else {
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.companyAccountId=:accountID", {
          accountID: accountID,
        })
        .andWhere("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    }

    if (purchaseTimeFrame && purchaseTimeFrame.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseTimeFrame IN (:purchaseTimeFrame)",
        { purchaseTimeFrame }
      );
    }

    if (forecastCategory && forecastCategory.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.forecastCategory IN (:forecastCategory)",
        { forecastCategory }
      );
    }

    if (probability && probability.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.probability IN (:probability)", {
        probability,
      });
    }

    if (stage && stage.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.stage IN (:stage)", { stage });
    }

    if (status && status.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.status IN (:status)", { status });
    }

    if (priority && priority.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.priority IN (:priority)", {
        priority,
      });
    }

    if (purchaseProcess && purchaseProcess.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseProcess IN (:purchaseProcess)",
        { purchaseProcess }
      );
    }

    if (createdAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.createdAt",
        createdAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (updatedAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.updatedAt",
        updatedAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (dateRange) {
      if (dateRange.startDate && dateRange.endDate) {
        oppurtunityRepo.andWhere(
          "DATE(Oppurtunity.updatedAt) BETWEEN :startDate AND :endDate",
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }
        );
      }
    }
    const oppurtunites = await oppurtunityRepo.getMany();

    //All decryption done here
    for (let opportunity of oppurtunites) {
      opportunity = await opportunityDecryption(opportunity);

      if (opportunity.company) {
        opportunity.company = await accountDecryption(
          opportunity.company as Account
        );
      }

      if (opportunity.contact) {
        opportunity.contact = await contactDecryption(
          opportunity.contact as Contact
        );
      }

      if (opportunity.Lead) {
        opportunity.Lead = await leadDecryption(opportunity.Lead as Lead);
      }

      if (opportunity.organization) {
        opportunity.organization = await orgnizationDecryption(
          opportunity.organization as Organisation
        );
      }

      if (opportunity.owner) {
        opportunity.owner = await userDecryption(opportunity.owner as User);
      }
    }

    let searchData: Oppurtunity[] = [];
    let skip = 0;
    if (search) {
      skip = 1;
      searchData = oppurtunites.filter((oppurtunity) => {
        if (
          (oppurtunity?.title &&
            oppurtunity?.title
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.currency &&
            oppurtunity?.currency
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseTimeFrame &&
            oppurtunity?.purchaseTimeFrame
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseProcess &&
            oppurtunity?.purchaseProcess
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.forecastCategory &&
            oppurtunity?.forecastCategory
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedRevenue &&
            oppurtunity?.estimatedRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualRevenue &&
            oppurtunity?.actualRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanType &&
            oppurtunity?.loanType
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanAmount &&
            oppurtunity?.loanAmount
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.probability &&
            oppurtunity?.probability
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.description &&
            oppurtunity?.description
              ?.toString()
              .toLowerCase()
              .includes(String(search))) ||
          (oppurtunity?.currentNeed &&
            oppurtunity?.currentNeed
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.proposedSolution &&
            oppurtunity?.proposedSolution
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.stage &&
            oppurtunity?.stage
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.status &&
            oppurtunity?.status
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedCloseDate &&
            oppurtunity?.estimatedCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualCloseDate &&
            oppurtunity?.actualCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.company?.accountName &&
            oppurtunity?.company?.accountName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.contact?.fullName &&
            oppurtunity?.contact?.fullName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.firstName &&
            oppurtunity?.owner?.firstName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.lastName &&
            oppurtunity?.owner?.lastName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonReason &&
            oppurtunity?.wonReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.lostReason &&
            oppurtunity?.lostReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonLostDescription &&
            oppurtunity?.wonLostDescription
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.priority &&
            oppurtunity?.priority
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()))
        ) {
          return true;
        }
      });
    }

    if (contact || company) {
      skip = 1;
      searchData = await oppurtunites.filter((opportunity) => {
        const matchContact =
          !contact ||
          opportunity.contact?.fullName
            ?.toLowerCase()
            .includes(contact?.toLowerCase());
        const matchCompany =
          !company ||
          opportunity.company?.accountName
            ?.toLowerCase()
            .includes(company.toLowerCase());
        return matchContact && matchCompany;
      });
    }

    let total = 0;
    if (skip == 0 && searchData.length == 0) {
      total = oppurtunites.length;
      searchData = oppurtunites;
    } else {
      total = searchData.length;
    }

    searchData = searchData.slice((page - 1) * limit, page * limit);

    const pagination = {
      total: total,
      page: page,
      limit: limit,
      data: searchData,
    };
    return pagination;
  }

  async getAllOppurtunityByContactId(
    userId: string,
    _role: Role[],
    search: string | undefined,
    page: number = 1,
    limit: number = 7,
    purchaseTimeFrame: string[] | undefined,
    forecastCategory: string[] | undefined,
    probability: string[] | undefined,
    stage: string[] | undefined,
    status: string[] | undefined,
    priority: string[] | undefined,
    purchaseProcess: string[] | undefined,
    createdAt: string,
    updatedAt: string,
    dateRange: DateRangeParamsType,
    company: string | undefined,
    contact: string | undefined,
    contactID: string | undefined,
    organizationId: string | null,
    view: string | null
  ) {
    let oppurtunityRepo;

    // if(role.length===1 && role[0].roleName===roleNames.SALESPERSON){
    if (view == "myView" || view === "null") {
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.ownerId=:userId", { userId: userId })
        .andWhere("Oppurtunity.contactContactId=:contactID", {
          contactID: contactID,
        })
        .andWhere("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    } else {
      oppurtunityRepo = AppDataSource.getRepository(Oppurtunity)
        .createQueryBuilder("Oppurtunity")
        .leftJoinAndSelect("Oppurtunity.Lead", "Lead")
        .leftJoinAndSelect("Oppurtunity.company", "Account")
        .leftJoinAndSelect("Oppurtunity.contact", "Contact")
        .leftJoinAndSelect("Oppurtunity.owner", "user")
        .where("Oppurtunity.contactContactId=:contactID", {
          contactID: contactID,
        })
        .andWhere("Oppurtunity.organizationId=:organizationId", {
          organizationId: organizationId,
        })
        .orderBy("Oppurtunity.updatedAt", "DESC");
    }

    if (purchaseTimeFrame && purchaseTimeFrame.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseTimeFrame IN (:purchaseTimeFrame)",
        { purchaseTimeFrame }
      );
    }

    if (forecastCategory && forecastCategory.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.forecastCategory IN (:forecastCategory)",
        { forecastCategory }
      );
    }

    if (probability && probability.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.probability IN (:probability)", {
        probability,
      });
    }

    if (stage && stage.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.stage IN (:stage)", { stage });
    }

    if (status && status.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.status IN (:status)", { status });
    }

    if (priority && priority.length > 0) {
      oppurtunityRepo.andWhere("Oppurtunity.priority IN (:priority)", {
        priority,
      });
    }

    if (purchaseProcess && purchaseProcess.length > 0) {
      oppurtunityRepo.andWhere(
        "Oppurtunity.purchaseProcess IN (:purchaseProcess)",
        { purchaseProcess }
      );
    }

    if (createdAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.createdAt",
        createdAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (updatedAt != undefined) {
      oppurtunityRepo.orderBy(
        "Oppurtunity.updatedAt",
        updatedAt == "DESC" ? "DESC" : "ASC"
      );
    }

    if (dateRange) {
      if (dateRange.startDate && dateRange.endDate) {
        oppurtunityRepo.andWhere(
          "DATE(Oppurtunity.updatedAt) BETWEEN :startDate AND :endDate",
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }
        );
      }
    }
    const oppurtunites = await oppurtunityRepo.getMany();

    //All decryption done here
    for (let opportunity of oppurtunites) {
      opportunity = await opportunityDecryption(opportunity);
      if (opportunity.company) {
        opportunity.company = await accountDecryption(
          opportunity.company as Account
        );
      }

      if (opportunity.contact) {
        opportunity.contact = await contactDecryption(
          opportunity.contact as Contact
        );
      }

      if (opportunity.Lead) {
        opportunity.Lead = await leadDecryption(opportunity.Lead as Lead);
      }

      if (opportunity.organization) {
        opportunity.organization = await orgnizationDecryption(
          opportunity.organization as Organisation
        );
      }

      if (opportunity.owner) {
        opportunity.owner = await userDecryption(opportunity.owner as User);
      }
    }

    let searchData: Oppurtunity[] = [];
    let skip = 0;
    if (search) {
      skip = 1;
      searchData = oppurtunites.filter((oppurtunity) => {
        if (
          (oppurtunity?.title &&
            oppurtunity?.title
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.currency &&
            oppurtunity?.currency
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseTimeFrame &&
            oppurtunity?.purchaseTimeFrame
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.purchaseProcess &&
            oppurtunity?.purchaseProcess
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.forecastCategory &&
            oppurtunity?.forecastCategory
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedRevenue &&
            oppurtunity?.estimatedRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualRevenue &&
            oppurtunity?.actualRevenue
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanType &&
            oppurtunity?.loanType
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.loanAmount &&
            oppurtunity?.loanAmount
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.probability &&
            oppurtunity?.probability
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.description &&
            oppurtunity?.description
              ?.toString()
              .toLowerCase()
              .includes(String(search))) ||
          (oppurtunity?.currentNeed &&
            oppurtunity?.currentNeed
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.proposedSolution &&
            oppurtunity?.proposedSolution
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.stage &&
            oppurtunity?.stage
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.status &&
            oppurtunity?.status
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.estimatedCloseDate &&
            oppurtunity?.estimatedCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.actualCloseDate &&
            oppurtunity?.actualCloseDate
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.company?.accountName &&
            oppurtunity?.company?.accountName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.contact?.fullName &&
            oppurtunity?.contact?.fullName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.firstName &&
            oppurtunity?.owner?.firstName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.owner?.lastName &&
            oppurtunity?.owner?.lastName
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonReason &&
            oppurtunity?.wonReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.lostReason &&
            oppurtunity?.lostReason
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.wonLostDescription &&
            oppurtunity?.wonLostDescription
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase())) ||
          (oppurtunity?.priority &&
            oppurtunity?.priority
              ?.toString()
              .toLowerCase()
              .includes(String(search).toLowerCase()))
        ) {
          return true;
        }
      });
    }

    if (contact || company) {
      skip = 1;
      searchData = await oppurtunites.filter((opportunity) => {
        const matchContact =
          !contact ||
          opportunity.contact?.fullName
            ?.toLowerCase()
            .includes(contact?.toLowerCase());
        const matchCompany =
          !company ||
          opportunity.company?.accountName
            ?.toLowerCase()
            .includes(company.toLowerCase());
        return matchContact && matchCompany;
      });
    }

    let total = 0;
    if (skip == 0 && searchData.length == 0) {
      total = oppurtunites.length;
      searchData = oppurtunites;
    } else {
      total = searchData.length;
    }

    searchData = searchData.slice((page - 1) * limit, page * limit);

    const pagination = {
      total: total,
      page: page,
      limit: limit,
      data: searchData,
    };
    return pagination;
  }
}

export default opportunityService;
