import { Response } from "express";
import { makeResponse, decrypt } from "../common/utils";
import LeadRoutingConfigService from "../services/leadRoutingConfig.service";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";

const leadRoutingConfigService = new LeadRoutingConfigService();

class LeadRoutingController {
    async getAllConfigs(request: AuthenticatedRequest, response: Response) {
        try {
            const configs = await leadRoutingConfigService.getAllConfigs(request.user);
            return makeResponse(response, 200, true, "All lead routing configs", configs);
        } catch (error) {
            errorHandler(response, error.message);
        }
    }

    async getConfig(request: AuthenticatedRequest, response: Response) {
        try {
            if (!request.params.id) {
                return makeResponse(response, 400, false, "Lead routing config id is required", null);
            }
            const config = await leadRoutingConfigService.getLeadRoutingConfig(request.params.id);
            if (!config) {
                return makeResponse(response, 200, false, "Lead routing config not found", null);
            }
            return makeResponse(
                response,
                200,
                true,
                "Lead routing config fetched successfully",
                config
            );
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async createConfig(request: AuthenticatedRequest, response: Response) {
        const copiedObject = { ...request.body };
        try {
            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await leadRoutingConfigService.createConfig(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (!config) {
                return makeResponse(response, 400, true, "Lead routing config does not created", null);
            }

            return makeResponse(
                response,
                201,
                true,
                "Lead routing config created successfully",
                config
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
                            String(copiedObject[key]).trim() === duplicateEntry.trim()
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

    async updateConfig(request: AuthenticatedRequest, response: Response) {
        const copiedObject = { ...request.body };
        try {
            const { id } = request.params;
            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await leadRoutingConfigService.updateConfig(
                        id,
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (config?.affected == 0 || config == undefined) {
                return makeResponse(response, 400, false, "Lead routing config not updated", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Lead routing config updated successfully",
                config
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
                            String(copiedObject[key]).trim() === duplicateEntry.trim()
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

    async deleteConfig(request: AuthenticatedRequest, response: Response) {
        try {
            const { id } = request.params;
            const config = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const config = await leadRoutingConfigService.deleteConfig(
                        id,
                        request.user,
                        transactionEntityManager
                    );
                    return config;
                }
            );

            if (!config) {
                return makeResponse(response, 400, false, "Lead routing config not found", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Lead routing config deleted successfully",
                config
            );
        } catch (error) {
            errorHandler(response, error.message);
        }
    }
}

export default LeadRoutingController;
