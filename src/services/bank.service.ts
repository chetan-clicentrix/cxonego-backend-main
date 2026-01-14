import { AppDataSource } from "../data-source";
import { Bank } from "../entity/Bank";
import { userInfo } from "../interfaces/types";
import { EntityManager } from "typeorm";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";

class BankService {
    async getAllBanks(userInfo: userInfo) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = AppDataSource.getRepository(Bank);
        const banks = await bankRepo.find({
            where: {
                organization: { organisationId: userInfo.organizationId },
                isActive: true
            },
            order: {
                name: "ASC"
            }
        });
        return banks;
    }

    async getAllBanksIncludingInactive(userInfo: userInfo) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = AppDataSource.getRepository(Bank);
        const banks = await bankRepo.find({
            where: {
                organization: { organisationId: userInfo.organizationId }
            },
            order: {
                name: "ASC"
            }
        });
        return banks;
    }

    async getBankId(date: Date) {
        const month = String(
            date.getMonth() + 1 >= 10
                ? date.getMonth() + 1
                : "0" + (date.getMonth() + 1)
        );

        const year = String(date.getFullYear().toString().slice(-2));
        const lastBank = await AppDataSource.getRepository(Bank)
            .createQueryBuilder("BankEntity")
            .withDeleted()
            .select()
            .orderBy("BankEntity.createdAt", "DESC")
            .getOne();

        let bankNo = "00";
        if (lastBank && lastBank.bankId) {
            const yearFromRecord = String(lastBank.bankId.slice(3, 5));
            const bankIdFromRecord = String(lastBank.bankId.substring(5));

            if (year === yearFromRecord) {
                bankNo = bankIdFromRecord;
            }
        }

        const bankId = "B" + month + year + "0" + (Number(bankNo) + 1).toString();
        return bankId;
    }

    async createBank(
        payload: Partial<Bank>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = transactionEntityManager.getRepository(Bank);

        // Check if bank with same name already exists for this organization
        const existingBank = await bankRepo.findOne({
            where: {
                name: payload.name,
                organization: { organisationId: user.organizationId }
            }
        });

        if (existingBank) {
            throw new Error("Bank with this name already exists");
        }

        const bankId = await this.getBankId(new Date());

        const bank = new Bank(payload as Bank);
        bank.bankId = bankId;
        bank.organization = { organisationId: user.organizationId } as any;
        bank.modifiedBy = user.userId;

        const savedBank = await bankRepo.save(bank);
        return savedBank;
    }

    async updateBank(
        id: string,
        payload: Partial<Bank>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = transactionEntityManager.getRepository(Bank);

        const bank = await bankRepo.findOne({
            where: {
                bankId: id,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!bank) {
            throw new ResourceNotFoundError("Bank not found");
        }

        // Check if updating name to an existing bank name
        if (payload.name && payload.name !== bank.name) {
            const existingBank = await bankRepo.findOne({
                where: {
                    name: payload.name,
                    organization: { organisationId: user.organizationId }
                }
            });

            if (existingBank && existingBank.bankId !== id) {
                throw new Error("Bank with this name already exists");
            }
        }

        Object.assign(bank, payload);
        bank.modifiedBy = user.userId;

        const result = await bankRepo.update(
            { bankId: id },
            bank
        );

        return result;
    }

    async getBank(id: string, userInfo: userInfo) {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = AppDataSource.getRepository(Bank);
        const bank = await bankRepo.findOne({
            where: {
                bankId: id,
                organization: { organisationId: userInfo.organizationId }
            }
        });

        if (!bank) {
            throw new ResourceNotFoundError("Bank not found");
        }

        return bank;
    }

    async deleteBank(
        id: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ) {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const bankRepo = transactionEntityManager.getRepository(Bank);

        const bank = await bankRepo.findOne({
            where: {
                bankId: id,
                organization: { organisationId: user.organizationId }
            }
        });

        if (!bank) {
            throw new ResourceNotFoundError("Bank not found");
        }

        // Soft delete by setting isActive to false
        bank.isActive = false;
        bank.modifiedBy = user.userId;

        const result = await bankRepo.save(bank);
        return result;
    }
}

export default BankService;
