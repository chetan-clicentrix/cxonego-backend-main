import { Response } from "express";
import SkillService from "../services/skill.service";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";
import { AddSkillSchema, UpdateSkillSchema, SkillSearchSchema, BulkDeleteSkillSchema } from "../schemas/skill.schemas";

const skillService = new SkillService();

class SkillController {
    async getAllSkills(request: AuthenticatedRequest, response: Response) {
        try {
            const validation = SkillSearchSchema.safeParse(request.query);

            if (!validation.success) {
                return makeResponse(response, 400, false, "Invalid search parameters", validation.error);
            }

            const result = await skillService.getAllSkills(request.user, validation.data);
            return makeResponse(response, 200, true, "Skills fetched successfully", result);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    async getSkillById(request: AuthenticatedRequest, response: Response) {
        try {
            const { skillId } = request.params;
            const skill = await skillService.getSkillById(skillId, request.user);
            return makeResponse(response, 200, true, "Skill fetched successfully", skill);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    async createSkill(request: AuthenticatedRequest, response: Response) {
        try {
            const validation = AddSkillSchema.safeParse(request.body);
            if (!validation.success) {
                return makeResponse(response, 400, false, "Invalid skill data", validation.error);
            }

            const skill = await AppDataSource.transaction(async (transactionEntityManager) => {
                return await skillService.createSkill(validation.data, request.user, transactionEntityManager);
            });

            return makeResponse(response, 201, true, "Skill created successfully", skill);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    async updateSkill(request: AuthenticatedRequest, response: Response) {
        try {
            const { skillId } = request.params;
            const validation = UpdateSkillSchema.safeParse(request.body);
            if (!validation.success) {
                return makeResponse(response, 400, false, "Invalid skill data", validation.error);
            }

            const result = await AppDataSource.transaction(async (transactionEntityManager) => {
                return await skillService.updateSkill(skillId, validation.data, request.user, transactionEntityManager);
            });

            return makeResponse(response, 200, true, "Skill updated successfully", result);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    async deleteSkill(request: AuthenticatedRequest, response: Response) {
        try {
            const { skillId } = request.params;
            await AppDataSource.transaction(async (transactionEntityManager) => {
                return await skillService.deleteSkill(skillId, request.user, transactionEntityManager);
            });

            return makeResponse(response, 200, true, "Skill deleted successfully", null);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    async bulkDeleteSkills(request: AuthenticatedRequest, response: Response) {
        try {
            const validation = BulkDeleteSkillSchema.safeParse(request.body);
            if (!validation.success) {
                return makeResponse(response, 400, false, "Invalid data", validation.error);
            }

            const result = await AppDataSource.transaction(async (transactionEntityManager) => {
                return await skillService.bulkDeleteSkills(validation.data.skillIds, request.user, transactionEntityManager);
            });

            return makeResponse(response, 200, true, "Skills deleted successfully", result);
        } catch (error) {
            return errorHandler(response, error);
        }
    }
}

export default SkillController;
