import { Response } from "express";
import { makeResponse } from "../common/utils";
import BankService from "../services/bank.service";
import { errorHandler } from "../common/errors";
import { CustomRequest } from "../interfaces/types";
import { AppDataSource } from "../data-source";

const bankService = new BankService();

class BankController {
    async getAllBanks(request: CustomRequest, response: Response) {
        try {
            const banks = await bankService.getAllBanks(request.user);
            return makeResponse(response, 200, true, "All banks", banks);
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async getBank(request: CustomRequest, response: Response) {
        try {
            if (!request.params.bankId) {
                return makeResponse(response, 400, false, "Bank ID is required", null);
            }
            const bank = await bankService.getBank(request.params.bankId, request.user);
            return makeResponse(
                response,
                200,
                true,
                "Bank fetched successfully",
                bank
            );
        } catch (error: any) {
            return errorHandler(response, error.message);
        }
    }

    async createBank(request: CustomRequest, response: Response) {
        try {
            const bank = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const bank = await bankService.createBank(
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return bank;
                }
            );

            if (!bank) {
                return makeResponse(response, 400, false, "Bank not created", null);
            }

            return makeResponse(
                response,
                201,
                true,
                "Bank created successfully",
                bank
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async updateBank(request: CustomRequest, response: Response) {
        try {
            const { bankId } = request.params;
            const bank = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const bank = await bankService.updateBank(
                        bankId,
                        request.body,
                        request.user,
                        transactionEntityManager
                    );
                    return bank;
                }
            );

            if (bank?.affected == 0 || bank == undefined) {
                return makeResponse(response, 400, false, "Bank not updated", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Bank updated successfully",
                bank
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }

    async deleteBank(request: CustomRequest, response: Response) {
        try {
            const { bankId } = request.params;
            const bank = await AppDataSource.transaction(
                async (transactionEntityManager) => {
                    const bank = await bankService.deleteBank(
                        bankId,
                        request.user,
                        transactionEntityManager
                    );
                    return bank;
                }
            );

            if (!bank) {
                return makeResponse(response, 400, false, "Bank not found", null);
            }

            return makeResponse(
                response,
                200,
                true,
                "Bank deleted successfully",
                bank
            );
        } catch (error: any) {
            errorHandler(response, error.message);
        }
    }
}

export default BankController;
