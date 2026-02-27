import { AppDataSource } from "../data-source";
import { BankDocumentConfig } from "../entity/BankDocumentConfig";
import { Bank } from "../entity/Bank";
import { userInfo } from "../interfaces/types";
import { EntityManager, IsNull } from "typeorm";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { ApplicantType } from "../common/utils";
import { v4 as uuidv4 } from "uuid";

class BankDocumentConfigService {
    async getAllConfigs(userInfo: userInfo) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = AppDataSource.getRepository(BankDocumentConfig);
        const configs = await configRepo.find({
            where: {
                organization: { organisationId: userInfo.organizationId }
            },
            order: {
                bank: { name: "ASC" },
                applicantType: "ASC"
            }
        });
        return configs;
    }

    async getConfigsByBank(bankId: string, userInfo: userInfo, loanTypeFilter?: string) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = AppDataSource.getRepository(BankDocumentConfig);

        const whereClause: any = {
            bank: { bankId: bankId },
            organization: { organisationId: userInfo.organizationId }
        };

        if (loanTypeFilter) {
            whereClause.loanType = loanTypeFilter;
        }

        const configs = await configRepo.find({
            where: whereClause,
            order: {
                loanType: "ASC",
                applicantType: "ASC"
            }
        });
        return configs;
    }

    async getDocumentsByBankAndType(
        bankId: string,
        applicantType: ApplicantType,
        organizationId: string,
        loanType?: string
    ): Promise<string[]> {
        const configRepo = AppDataSource.getRepository(BankDocumentConfig);

        const whereClause: any = {
            bank: { bankId: bankId },
            applicantType: applicantType,
            organization: { organisationId: organizationId }
        };

        // If a specific loan type is requested, filter by it
        // Otherwise it will just match the first config for this bank & applicant type
        if (loanType) {
            whereClause.loanType = loanType;
        }

        const config = await configRepo.findOne({
            where: whereClause
        });

        return config ? config.requiredDocuments : [];
    }

    async createConfig(
        payload: Partial<BankDocumentConfig>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);

        // Check if config already exists
        const existingConfig = await configRepo.findOne({
            where: {
                bank: { bankId: payload.bank?.bankId },
                applicantType: payload.applicantType,
                loanType: payload.loanType || IsNull(),
                organization: { organisationId: user.organizationId }
            }
        });

        if (existingConfig) {
            throw new Error("Configuration for this bank and applicant type already exists");
        }

        const config = new BankDocumentConfig(payload as BankDocumentConfig);
        config.configId = uuidv4();
        config.organization = { organisationId: user.organizationId } as any;
        config.modifiedBy = user.userId;

        const savedConfig = await configRepo.save(config);
        return savedConfig;
    }

    async updateConfig(
        id: string,
        payload: Partial<BankDocumentConfig>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);

        const config = await configRepo.findOne({
            where: {
                configId: id,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Configuration not found");
        }

        Object.assign(config, payload);
        config.modifiedBy = user.userId;

        const result = await configRepo.update(
            { configId: id },
            config
        );

        return result;
    }

    async getConfig(id: string, userInfo: userInfo) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = AppDataSource.getRepository(BankDocumentConfig);
        const config = await configRepo.findOne({
            where: {
                configId: id,
                organization: { organisationId: userInfo.organizationId }
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Configuration not found");
        }

        return config;
    }

    async deleteConfig(
        id: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);

        const config = await configRepo.findOne({
            where: {
                configId: id,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Configuration not found");
        }

        const result = await configRepo.delete({ configId: id });
        return result;
    }

    async cloneConfig(
        sourceBankId: string,
        sourceApplicantType: ApplicantType,
        sourceLoanType: string | undefined,
        targetBankId: string,
        targetApplicantType: ApplicantType,
        targetLoanType: string | undefined,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);
        const bankRepo = transactionEntityManager.getRepository(Bank);

        // 1. Validate source exists
        const sourceConfig = await configRepo.findOne({
            where: {
                bank: { bankId: sourceBankId },
                applicantType: sourceApplicantType,
                loanType: sourceLoanType || IsNull(),
                organization: { organisationId: user.organizationId }
            }
        });

        if (!sourceConfig) {
            throw new ResourceNotFoundError("Source configuration not found");
        }

        // 2. Check if target already exists
        const existingTarget = await configRepo.findOne({
            where: {
                bank: { bankId: targetBankId },
                applicantType: targetApplicantType,
                loanType: targetLoanType || IsNull(),
                organization: { organisationId: user.organizationId }
            }
        });

        if (existingTarget) {
            throw new Error("Target configuration already exists");
        }

        // 3. Validate target bank exists
        const targetBank = await bankRepo.findOne({
            where: {
                bankId: targetBankId,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!targetBank) {
            throw new ResourceNotFoundError("Target bank not found");
        }

        // 4. Create new configuration (deep copy)
        const newConfigPayload = {
            configId: uuidv4(),
            bank: targetBank,
            applicantType: targetApplicantType,
            loanType: targetLoanType || null,
            requiredDocuments: [...sourceConfig.requiredDocuments], // Deep copy
            organization: { organisationId: user.organizationId } as any,
            modifiedBy: user.userId
        } as BankDocumentConfig;

        const newConfig = new BankDocumentConfig(newConfigPayload);

        // 5. Save
        const savedConfig = await configRepo.save(newConfig);
        return savedConfig;
    }

    async bulkCloneConfigs(
        sourceBankId: string,
        sourceLoanType: string | undefined,
        targetBankId: string,
        targetLoanType: string | undefined,
        applicantTypes: ApplicantType[],
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[]
        };

        for (const applicantType of applicantTypes) {
            try {
                await this.cloneConfig(
                    sourceBankId,
                    applicantType,
                    sourceLoanType,
                    targetBankId,
                    applicantType,
                    targetLoanType,
                    user,
                    transactionEntityManager
                );
                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({
                    applicantType,
                    error: error.message
                });
            }
        }

        return results;
    }
    async addDocumentsToConfig(
        configId: string,
        newDocuments: string[],
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);
        const config = await configRepo.findOne({
            where: {
                configId: configId,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Configuration not found");
        }

        // Add new documents (prevent duplicates)
        const updatedDocuments = [...new Set([...config.requiredDocuments, ...newDocuments])];
        config.requiredDocuments = updatedDocuments;
        config.modifiedBy = user.userId;

        return await configRepo.save(config);
    }

    async removeDocumentsFromConfig(
        configId: string,
        documentsToRemove: string[],
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const configRepo = transactionEntityManager.getRepository(BankDocumentConfig);
        const config = await configRepo.findOne({
            where: {
                configId: configId,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!config) {
            throw new ResourceNotFoundError("Configuration not found");
        }

        // Remove specified documents
        const updatedDocuments = config.requiredDocuments.filter(doc => !documentsToRemove.includes(doc));
        config.requiredDocuments = updatedDocuments;
        config.modifiedBy = user.userId;

        return await configRepo.save(config);
    }
}

export default BankDocumentConfigService;
