import { Response } from "express";
import { makeResponse } from "../common/utils";
import BankDocumentConfigService from "../services/bankDocumentConfig.service";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";

const bankDocConfigService = new BankDocumentConfigService();

class BankDocumentConfigController {
    async getAllConfigs(request: AuthenticatedRequest, response: Response) {
        try {
            const configs = await bankDocConfigService.getAllConfigs(request.user);
            return makeResponse(response, 200, true, "All bank document configurations", configs);
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async getConfigsByBank(request: AuthenticatedRequest, response: Response) {
        try {
            const { bankId } = request.params;
            const { loanType } = request.query;
            const configs = await bankDocConfigService.getConfigsByBank(
                bankId,
                request.user,
                loanType as string | undefined
            );
            return makeResponse(response, 200, true, "Bank configurations", configs);
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async getDocuments(request: AuthenticatedRequest, response: Response) {
        try {
            const { bankId, applicantType } = request.query;

            if (!bankId || !applicantType) {
                return makeResponse(response, 400, false, "Bank ID and Applicant Type are required", null);
            }

            const documents = await bankDocConfigService.getDocumentsByBankAndType(
                bankId as string,
                applicantType as any,
                request.user.organizationId || ""
            );

            return makeResponse(
                response,
                200,
                true,
                "Documents fetched successfully",
                { documents }
            );
        } catch (error: any) {
            return errorHandler(response, error.message);
        }
    }

    async getConfig(request: AuthenticatedRequest, response: Response) {
        try {
            if (!request.params.configId) {
                return makeResponse(response, 400, false, "Configuration ID is required", null);
            }
            const config = await bankDocConfigService.getConfig(request.params.configId, request.user);
            return makeResponse(
                response,
                200,
                true,
                "Configuration fetched successfully",
                config
            );
        } catch (error: any) {
            return errorHandler(response, error.message);
        }
    }

    async createConfig(request: AuthenticatedRequest, response: Response) {
        try {
            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await bankDocConfigService.createConfig(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (!config) {
                return makeResponse(response, 400, false, "Configuration not created", null);
            }

            return makeResponse(
                response,
                201,
                true,
                "Configuration created successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async updateConfig(request: AuthenticatedRequest, response: Response) {
        try {
            const { configId } = request.params;

            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await bankDocConfigService.updateConfig(
                        configId,
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (config?.affected == 0 || config == undefined) {
                return makeResponse(response, 400, false, "Configuration not updated", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Configuration updated successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async deleteConfig(request: AuthenticatedRequest, response: Response) {
        try {
            const { configId } = request.params;
            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await bankDocConfigService.deleteConfig(
                        configId,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (!config) {
                return makeResponse(response, 400, false, "Configuration not found", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Configuration deleted successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async cloneConfig(request: AuthenticatedRequest, response: Response) {
        try {
            const { sourceBankId, sourceApplicantType, sourceLoanType, targetBankId, targetApplicantType, targetLoanType } = request.body;

            if (!sourceBankId || !sourceApplicantType || !targetBankId || !targetApplicantType) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Source and target bank ID and applicant type are required",
                    null
                );
            }

            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await bankDocConfigService.cloneConfig(
                        sourceBankId,
                        sourceApplicantType,
                        sourceLoanType,
                        targetBankId,
                        targetApplicantType,
                        targetLoanType,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            return makeResponse(
                response,
                201,
                true,
                "Configuration cloned successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async bulkClone(request: AuthenticatedRequest, response: Response) {
        try {
            const { sourceBankId, sourceLoanType, targetBankId, targetLoanType, applicantTypes } = request.body;

            if (!sourceBankId || !targetBankId || !applicantTypes || !Array.isArray(applicantTypes)) {
                return makeResponse(
                    response,
                    400,
                    false,
                    "Source bank ID, target bank ID, and applicant types array are required",
                    null
                );
            }

            const results = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const results = await bankDocConfigService.bulkCloneConfigs(
                        sourceBankId,
                        sourceLoanType,
                        targetBankId,
                        targetLoanType,
                        applicantTypes,
                        request.user,
                        transactionEntityManager
                    );
                    return results;
                }
            );

            return makeResponse(
                response,
                200,
                true,
                `Bulk clone completed: ${results.success} successful, ${results.failed} failed`,
                results
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }
    async addDocuments(request: AuthenticatedRequest, response: Response) {
        try {
            const { configId } = request.params;
            const { documents } = request.body;

            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    return await bankDocConfigService.addDocumentsToConfig(
                        configId,
                        documents,
                        request.user,
                        transactionEntityManager
                    );
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Documents added successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async removeDocuments(request: AuthenticatedRequest, response: Response) {
        try {
            const { configId } = request.params;
            const { documents } = request.body;

            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    return await bankDocConfigService.removeDocumentsFromConfig(
                        configId,
                        documents,
                        request.user,
                        transactionEntityManager
                    );
                }
            );

            return makeResponse(
                response,
                200,
                true,
                "Documents removed successfully",
                config
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }
}

export default BankDocumentConfigController;
