import { AppDataSource } from "../data-source";
import { LeadRoutingConfig } from "../entity/LeadRoutingConfig";
import { Lead } from "../entity/Lead";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import {
    routingAssignToType,
    routingOperator,
    decrypt
} from "../common/utils";
import { EntityManager, Repository, UpdateResult } from "typeorm";
import { userInfo } from "../interfaces/types";
import { ResourceNotFoundError } from "../common/errors";
import { leadRoutingConfigDecryption, orgnizationDecryption } from "./decryption.service";

class LeadRoutingConfigService {
    async getAllConfigs(userInfo: userInfo) {
        // Exact mirror of LeadService query structure
        const configs = await AppDataSource.getRepository(LeadRoutingConfig)
            .createQueryBuilder("config")
            .leftJoinAndSelect("config.organization", "organisation")
            .andWhere("organisation.organisationId = :organizationId", {
                organizationId: userInfo.organizationId,
            })
            .select(["config", "organisation"]) // Explicitly select config and its organization
            .orderBy("config.updatedAt", "DESC")
            .getMany();

        for (let config of configs) {
            config = await leadRoutingConfigDecryption(config);
            if (config.organization) {
                config.organization = await orgnizationDecryption(config.organization);
            }
        }
        return configs;
    }

    async createConfig(
        payload: LeadRoutingConfig,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const organizationRepo = AppDataSource.getRepository(Organisation);
        if (user.organizationId) {
            const orgnizationData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
            });
            if (orgnizationData) payload.organization = orgnizationData;
        }

        const leadRoutingRepository: Repository<LeadRoutingConfig> =
            transactionEntityManager.getRepository(LeadRoutingConfig);
        const configInstance = new LeadRoutingConfig(payload);
        const config = await leadRoutingRepository.save(configInstance);

        return config;
    }

    async updateConfig(
        id: string,
        payload: LeadRoutingConfig,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<UpdateResult> {
        const leadRoutingRepository = transactionEntityManager.getRepository(LeadRoutingConfig);
        const config = await leadRoutingRepository.findOne({
            where: {
                id: id as any
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Lead routing config not found");
        }

        const organizationRepo = AppDataSource.getRepository(Organisation);
        if (user.organizationId) {
            const orgnizationData = await organizationRepo.findOne({
                where: { organisationId: user.organizationId },
            });
            if (orgnizationData) payload.organization = orgnizationData;
            else {
                throw new ResourceNotFoundError("Organization not found");
            }
        }

        payload.modifiedBy = user.email;
        const configEntity = new LeadRoutingConfig(payload);
        const update = await leadRoutingRepository.update(id, configEntity);

        return update;
    }

    async getLeadRoutingConfig(id: string) {
        try {
            const config = await AppDataSource.getRepository(LeadRoutingConfig).findOne({
                where: {
                    id: id,
                },
            });

            if (!config) {
                throw new ResourceNotFoundError("Lead routing config not found");
            }

            await leadRoutingConfigDecryption(config);
            if (config.organization) {
                config.organization = await orgnizationDecryption(config.organization);
            }
            return config;
        } catch (error) {
            return;
        }
    }

    async deleteConfig(
        id: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        try {
            const leadRoutingRepository = transactionEntityManager.getRepository(LeadRoutingConfig);
            const config = await leadRoutingRepository.findOne({
                where: {
                    id: id as any
                }
            });

            if (!config) {
                throw new Error("Lead routing config does not exist");
            }

            await AppDataSource.getRepository(LeadRoutingConfig).softDelete(id);
            await leadRoutingRepository.update(id as any, { modifiedBy: user.email });

            await leadRoutingConfigDecryption(config);
            if (config.organization) {
                config.organization = await orgnizationDecryption(config.organization);
            }

            return config;
        } catch (error) {
            throw new Error("Lead routing config does not exist");
        }
    }

    async executeRouting(lead: Lead): Promise<string | null> {
        const organizationId =
            lead.organization?.organisationId ||
            (lead as any).organizationId ||
            (lead as any).organisationId;
        if (!organizationId) return null;

        const rules = await AppDataSource.getRepository(LeadRoutingConfig)
            .createQueryBuilder("config")
            .where("config.organizationId = :organizationId", { organizationId })
            .orderBy("config.priority", "ASC")
            .getMany();

        for (const rule of rules) {
            if (rule.value) rule.value = decrypt(rule.value);
            const isMatch = await this.evaluateRule(rule, lead);
            if (isMatch) {
                if (rule.assignToType === routingAssignToType.USER) {
                    return rule.assignToId;
                } else if (rule.assignToType === routingAssignToType.ROLE) {
                    const userId = await this.getFirstActiveUserInRole(
                        rule.assignToId,
                        organizationId
                    );
                    if (userId) return userId;
                }
            }
        }

        return null;
    }

    async evaluateRule(
        rule: LeadRoutingConfig,
        lead: Lead
    ): Promise<boolean> {
        let leadValue: any = (lead as any)[rule.attribute];

        if (leadValue && typeof leadValue === "string") {
            try {
                const decryptedValue = decrypt(leadValue);
                if (decryptedValue) leadValue = decryptedValue;
            } catch (e) {
                // Not encrypted or decryption failed
            }
        }

        const ruleValue = rule.value;

        switch (rule.operator) {
            case routingOperator.EQUALS:
                return (
                    String(leadValue).toLowerCase() === String(ruleValue).toLowerCase()
                );
            case routingOperator.CONTAINS:
                return String(leadValue)
                    .toLowerCase()
                    .includes(String(ruleValue).toLowerCase());
            case routingOperator.STARTS_WITH:
                return String(leadValue)
                    .toLowerCase()
                    .startsWith(String(ruleValue).toLowerCase());
            case routingOperator.IN:
                const allowedValues = ruleValue
                    .split(",")
                    .map((v) => v.trim().toLowerCase());
                return allowedValues.includes(String(leadValue).toLowerCase());
            default:
                return false;
        }
    }

    private async getFirstActiveUserInRole(
        roleId: string,
        organizationId: string
    ): Promise<string | null> {
        const user = await AppDataSource.getRepository(User)
            .createQueryBuilder("user")
            .innerJoin("user.roles", "role")
            .where("role.roleId = :roleId", { roleId })
            .leftJoinAndSelect("user.organisation", "organisation")
            .andWhere("organisation.organisationId = :orgId", {
                orgId: organizationId,
            })
            .andWhere("user.isActive = :isActive", { isActive: true })
            .getOne();

        return user ? user.userId : null;
    }
}

export default LeadRoutingConfigService;
