import { errorHandler } from "../common/errors";
import { Request, Response } from "express";
import OppurtunityServices from "../services/oppurtunity.service";
import { makeResponse, decrypt } from "../common/utils";
import { Oppurtunity } from "../entity/Oppurtunity";
import { ProposalGroup } from "../entity/ProposalGroup";
import { AuthenticatedRequest } from "../interfaces/types";
import { DateRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
import { AppDataSource } from "../data-source";
import { v4 as uuidv4 } from "uuid";

const oppurtunityServices = new OppurtunityServices();
export class OppurtunityController {
  async getAllOppurtunities(request: AuthenticatedRequest, response: Response) {
    try {
      const oppurtunities = await oppurtunityServices.getAllOppurtunities(
        request.user
      );
      return makeResponse(
        response,
        200,
        true,
        "All oppurtunities",
        oppurtunities
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getAllOppurtunity(request: AuthenticatedRequest, response: Response) {
    try {
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const organizationId: string | null = request.user.organizationId;
      const role: Role[] = request.user.role;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;
      let view: string = request.query.view as string;

      const oppurtunity = await oppurtunityServices.getAllOppurtunity(
        userId,
        role,
        search,
        page,
        limit,
        purchaseTimeFrame,
        forecastCategory,
        probability,
        stage,
        status,
        priority,
        purchaseProcess,
        createdAt,
        updatedAt,
        dateRange,
        company,
        contact,
        organizationId,
        view
      );

      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async createOppurtunity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const payload = request.body as Oppurtunity;

      // Extract and deduplicate bank IDs from the incoming payload
      const rawBankIds: string[] = Array.isArray(payload.banks)
        ? (payload.banks as any[]).map((b: any) =>
          typeof b === "string" ? b : b?.bankId
        ).filter(Boolean)
        : [];

      const rawBanks = Array.from(new Set(rawBankIds)); // Remove duplicate banks

      let createdOpportunities: Oppurtunity[] = [];

      if (rawBanks.length > 1) {
        // ── Multi-bank: create one proposal per bank ─────────────────────
        for (let i = 0; i < rawBanks.length; i++) {
          const bankId = rawBanks[i];
          const isPrimary = i === 0; // first bank = primary

          const opp = await AppDataSource.transaction(
            async (transactionEntityManager) => {
              return oppurtunityServices.createOppurtunity(
                { ...payload } as Oppurtunity,
                request.user,
                transactionEntityManager,
                bankId,
                isPrimary
              );
            }
          );
          createdOpportunities.push(opp);
        }

        // Link all created proposals into one group (outside individual
        // per-bank transactions — they are already committed at this point)
        const group = await AppDataSource.transaction(
          async (transactionEntityManager) => {
            return oppurtunityServices.createProposalGroup(
              createdOpportunities,
              request.user.organizationId ?? "",
              transactionEntityManager
            );
          }
        );

        // Fire post-create tasks for all proposals
        const decryptedOpportunities = [];
        for (const opp of createdOpportunities) {
          if (opp && typeof opp.decrypt === 'function') opp.decrypt();
          oppurtunityServices
            .postCreateOpportunityTasks(opp, request.user)
            .catch((err) =>
              console.error(
                "[OPPORTUNITY_CONTROLLER] Post-create task error:",
                err
              )
            );

          const fullyDecryptedOpp = await oppurtunityServices.getOppurtunityById(opp.opportunityId);
          if (fullyDecryptedOpp) {
            decryptedOpportunities.push(fullyDecryptedOpp);
          } else {
            decryptedOpportunities.push(opp);
          }
        }

        return makeResponse(
          response,
          201,
          true,
          "Opportunities created successfully",
          { opportunities: decryptedOpportunities, proposalGroupId: group.proposalGroupId }
        );
      } else {
        // ── Single bank (or no bank): original flow ───────────────────────
        const opportunity = await AppDataSource.transaction(
          async (transactionEntityManager) => {
            return oppurtunityServices.createOppurtunity(
              payload,
              request.user,
              transactionEntityManager
            );
          }
        );

        if (!opportunity) {
          return makeResponse(
            response,
            400,
            false,
            "Fail to create opportunity",
            null
          );
        }

        // Run post-create tasks (activity plan auto-assignment) AFTER the transaction
        // commits to avoid MySQL lock wait timeout caused by nested DB connections.
        if (opportunity && typeof opportunity.decrypt === 'function') {
          opportunity.decrypt();
        }

        oppurtunityServices
          .postCreateOpportunityTasks(opportunity, request.user)
          .catch((err) =>
            console.error(
              "[OPPORTUNITY_CONTROLLER] Post-create task error:",
              err
            )
          );

        const fullyDecryptedOpportunity = await oppurtunityServices.getOppurtunityById(opportunity.opportunityId);

        return makeResponse(
          response,
          201,
          true,
          "Opportunity created successfully",
          fullyDecryptedOpportunity || opportunity
        );
      }
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }
  async updateOppurtunity(request: AuthenticatedRequest, response: Response) {
    const copiedObject = { ...request.body };
    try {
      const opportunityId = request.params.opportunityId;
      const user = request.user;
      const payload = { ...request.body };

      // Determine if a new banks list was provided and deduplicate it
      const banksProvided = Array.isArray(payload.banks);
      const rawBankIds: string[] = banksProvided
        ? (payload.banks as any[]).map((b: any) =>
          typeof b === "string" ? b : b?.bankId
        ).filter(Boolean)
        : [];

      const rawBanks = Array.from(new Set(rawBankIds)); // Remove duplicate banks

      // Ensure generic fields pass without overwriting system/relation fields
      delete payload.banks;
      delete payload.opportunityId;
      delete payload.isPrimary;
      delete payload.proposalGroupId;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.deletedAt;

      const oppurtunity = await AppDataSource.transaction(async (manager) => {
        const oppRepo = manager.getRepository(Oppurtunity);

        const targetOpp = await oppRepo.findOne({
          where: { opportunityId },
          relations: ["banks"]
        });

        if (!targetOpp) throw new Error("Opportunity not found");

        let siblings = [targetOpp];
        if (targetOpp.proposalGroupId) {
          siblings = await oppRepo.find({
            where: { proposalGroupId: targetOpp.proposalGroupId },
            relations: ["banks"]
          });
        }

        const currentBankIdToOppId = new Map<string, string>();
        for (const sib of siblings) {
          if (sib.banks && sib.banks.length > 0) {
            currentBankIdToOppId.set(sib.banks[0].bankId, sib.opportunityId);
          } else if (!sib.proposalGroupId && siblings.length === 1 && (!sib.banks || sib.banks.length === 0)) {
            // Standalone with no bank attached yet
            currentBankIdToOppId.set("NO_BANK", sib.opportunityId);
          }
        }

        let finalActiveOpportunities: Oppurtunity[] = [];
        let primaryOppId = siblings.find(s => s.isPrimary)?.opportunityId || targetOpp.opportunityId;

        if (banksProvided) {
          const incomingBankIds = new Set(rawBanks);
          const currentBankIds = new Set(Array.from(currentBankIdToOppId.keys()).filter(k => k !== "NO_BANK"));

          for (const bankId of currentBankIds) {
            const siblingId = currentBankIdToOppId.get(bankId)!;
            if (!incomingBankIds.has(bankId)) {
              // Bank removed -> archive sibling proposal
              await oppurtunityServices.deleteOppurtunity(siblingId, user, manager);
            } else {
              // Bank kept -> update sibling proposal
              // Make sure to explicitly pass the bank ID down so the many-to-many relationship isn't broken
              const updated = await oppurtunityServices.updateOppurtunity(siblingId, { ...payload, banks: [bankId] } as any, user, manager);
              finalActiveOpportunities.push(updated!);
            }
          }

          for (const bankId of rawBanks) {
            if (!currentBankIds.has(bankId)) {
              if (currentBankIdToOppId.has("NO_BANK") && finalActiveOpportunities.length === 0) {
                const noBankOppId = currentBankIdToOppId.get("NO_BANK")!;
                const updated = await oppurtunityServices.updateOppurtunity(noBankOppId, { ...payload, banks: [bankId] }, user, manager);
                finalActiveOpportunities.push(updated!);
                currentBankIdToOppId.delete("NO_BANK");
              } else {
                // Create new sibling for new bank
                // CRITICAL: We MUST strip opportunityId out of the payload specifically here, 
                // so the service generates a distinct, new ID instead of upserting over the primary one.
                const { opportunityId: _strippedId, ...createPayload } = payload;
                const newOpp = await oppurtunityServices.createOppurtunity(
                  { ...createPayload, banks: [bankId] } as any,
                  user,
                  manager,
                  bankId,
                  false
                );
                finalActiveOpportunities.push(newOpp);
              }
            }
          }
        } else {
          // No banks provided; just update basic fields on all siblings
          for (const sib of siblings) {
            // Keep the sibling's existing bank
            const existingBankId = sib.banks && sib.banks.length > 0 ? sib.banks[0].bankId : null;
            const updatePayload = existingBankId ? { ...payload, banks: [existingBankId] } : { ...payload };
            const updated = await oppurtunityServices.updateOppurtunity(sib.opportunityId, updatePayload as any, user, manager);
            finalActiveOpportunities.push(updated!);
          }
        }

        // Finalize group structure if >1 proposal
        if (finalActiveOpportunities.length > 1) {
          let groupId = targetOpp.proposalGroupId;
          if (!groupId) {
            const groupRepo = manager.getRepository(ProposalGroup);
            const newGroup = groupRepo.create({ proposalGroupId: uuidv4(), organizationId: user.organizationId! });
            await groupRepo.save(newGroup);
            groupId = newGroup.proposalGroupId;
          }

          let hasPrimary = false;
          for (let i = 0; i < finalActiveOpportunities.length; i++) {
            const opp = finalActiveOpportunities[i];
            let isPrimary = false;
            if (opp.opportunityId === primaryOppId) {
              isPrimary = true;
              hasPrimary = true;
            }

            await oppRepo.update(opp.opportunityId, { proposalGroupId: groupId, isPrimary: isPrimary });
            opp.proposalGroupId = groupId;
            opp.isPrimary = isPrimary;
          }

          // If primary was deleted, set the first active one as primary
          if (!hasPrimary && finalActiveOpportunities.length > 0) {
            await oppRepo.update(finalActiveOpportunities[0].opportunityId, { isPrimary: true });
            finalActiveOpportunities[0].isPrimary = true;
          }
        } else if (finalActiveOpportunities.length === 1) {
          // If shrunk back to 1, ensure it is primary and can keep its group ID
          await oppRepo.update(finalActiveOpportunities[0].opportunityId, { isPrimary: true });
          finalActiveOpportunities[0].isPrimary = true;
        }

        // Return the one requested, or fallback to the primary
        const returnOpp = finalActiveOpportunities.find(o => o.opportunityId === opportunityId)
          || finalActiveOpportunities.find(o => o.isPrimary)
          || finalActiveOpportunities[0]
          || targetOpp;

        if (returnOpp && typeof returnOpp.decrypt === 'function') {
          returnOpp.decrypt();
        }

        return returnOpp;
      });

      if (!oppurtunity) {
        return makeResponse(
          response,
          400,
          false,
          "Oppurtunity not updated",
          null
        );
      }

      const fullyDecryptedOpportunity = await oppurtunityServices.getOppurtunityById(oppurtunity.opportunityId);

      return makeResponse(
        response,
        200,
        true,
        "Oppurtunity updated successfully",
        fullyDecryptedOpportunity || oppurtunity
      );
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage.includes("Duplicate entry")) {
        const startIndex = errorMessage.indexOf("'") + 1;
        const endIndex = errorMessage.indexOf("'", startIndex);
        const duplicateEntry = decrypt(
          errorMessage.substring(startIndex, endIndex)
        );

        let columnName;
        for (const key in copiedObject) {
          if (Object.prototype.hasOwnProperty.call(copiedObject, key)) {
            if (
              copiedObject[key] !== null &&
              copiedObject[key].trim() === duplicateEntry.trim()
            ) {
              columnName = key;
              break;
            }
          }
        }
        errorMessage = columnName;
      } else {
        errorMessage = `Internal server error : ${errorMessage}`;
      }
      errorHandler(response, errorMessage);
    }
  }
  async deleteOppurtunity(request: AuthenticatedRequest, response: Response) {
    try {
      const oppurtunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const oppurtunity = await oppurtunityServices.deleteOppurtunity(
            request.params.opportunityId,
            request.user,
            transactionEntityManager
          );
          return oppurtunity;
        }
      );

      // if(oppurtunity?.affected===0){
      //     return makeResponse(response, 200, false, "Oppurtunity Not deleted", null);
      // }

      return makeResponse(
        response,
        201,
        true,
        "Oppurtunity deleted successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
  async getOppurtunityById(request: Request, response: Response) {
    try {
      const oppurtunityId: string = request.params.opportunityId as string;
      const oppurtunity = await oppurtunityServices.getOppurtunityById(
        oppurtunityId
      );
      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Oppurtunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Oppurtunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async bulkDeleteOpportunity(request: AuthenticatedRequest, response: Response) {
    try {
      const userId = request.user.userId;
      const auth_time = request.user.auth_time;
      const email = request.user.email;
      const opportunity = await AppDataSource.transaction(
        async (transactionEntityManager) => {
          const opportunity = await oppurtunityServices.bulkDeleteOpportunity(
            request.body.opportunityIds,
            userId,
            auth_time,
            email,
            transactionEntityManager
          );
          return opportunity;
        }
      );

      if (opportunity?.deleted?.length == 0) {
        return makeResponse(
          response,
          400,
          false,
          "Opportunity not deleted",
          null
        );
      }
      return makeResponse(
        response,
        200,
        true,
        "Opportunity deleted successfully",
        opportunity
      );
    } catch (error) {
      return errorHandler(response, error.message);
    }
  }

  async getAllOppurtunityByAccountId(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const accountID: string = request.params.accountID;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;
      let view: string = request.query.view as string;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;

      const oppurtunity =
        await oppurtunityServices.getAllOppurtunityByAccountId(
          userId,
          role,
          search,
          page,
          limit,
          purchaseTimeFrame,
          forecastCategory,
          probability,
          stage,
          status,
          priority,
          purchaseProcess,
          createdAt,
          updatedAt,
          dateRange,
          company,
          contact,
          accountID,
          organizationId,
          view
        );

      if (!oppurtunity) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }

  async getAllOppurtunityByContactId(
    request: AuthenticatedRequest,
    response: Response
  ) {
    try {
      const contactID: string = request.params.contactID;
      const search: string | undefined = request.query.search as
        | string
        | undefined;
      let createdAt: string = request.query.createdAt as string;
      let updatedAt: string = request.query.updatedAt as string;
      let dateRange: DateRangeParamsType = request.body
        .dateRange as DateRangeParamsType;
      const userId: string = request.user.userId;
      const role: Role[] = request.user.role;
      const organizationId: string | null = request.user.organizationId;
      const purchaseTimeFrame: string[] = request.body
        .purchaseTimeFrame as string[];
      const forecastCategory: string[] = request.body
        .forecastCategory as string[];
      const probability: string[] = request.body.probability as string[];
      const stage: string[] = request.body.stage as string[];
      const status: string[] = request.body.status as string[];
      const priority: string[] = request.body.priority as string[];
      const purchaseProcess: string[] = request.body
        .purchaseProcess as string[];
      const company: string = request.body.company;
      const contact: string = request.body.contact;
      let view: string = request.query.view as string;

      let page: number | undefined = Number(request.query.page) || undefined;
      let limit: number | undefined = Number(request.query.limit) || undefined;

      const oppurtunity =
        await oppurtunityServices.getAllOppurtunityByContactId(
          userId,
          role,
          search,
          page,
          limit,
          purchaseTimeFrame,
          forecastCategory,
          probability,
          stage,
          status,
          priority,
          purchaseProcess,
          createdAt,
          updatedAt,
          dateRange,
          company,
          contact,
          contactID,
          organizationId,
          view
        );

      if (oppurtunity?.data?.length == 0) {
        return makeResponse(
          response,
          200,
          false,
          "Opportunity not found",
          null
        );
      }
      return makeResponse(
        response,
        201,
        true,
        "Opportunity fetched successfully",
        oppurtunity
      );
    } catch (error) {
      errorHandler(response, error.message);
    }
  }
}
