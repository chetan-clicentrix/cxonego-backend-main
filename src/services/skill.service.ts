import { AppDataSource } from "../data-source";
import { EntityManager } from "typeorm";
import { ResourceNotFoundError } from "../common/errors";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { Skill } from "../entity/Skill";
import { userInfo } from "../interfaces/types";
import { skillDecryption, userDecryption, orgnizationDecryption } from "./decryption.service";
import { roleNames } from "../common/utils";
import { SkillSearchSchemaType } from "../schemas/skill.schemas";

class SkillService {
    async getAllSkills(userInfo: userInfo, params: SkillSearchSchemaType) {
        const { page: pageStr, size: sizeStr, search, proficiencyLevel } = params;
        const page = pageStr ? Number(pageStr) : 1;
        const size = sizeStr ? Number(sizeStr) : 10;

        let skillRepo = AppDataSource.getRepository(Skill)
            .createQueryBuilder("skill")
            .leftJoinAndSelect("skill.owner", "user")
            .leftJoinAndSelect("skill.organization", "organisation")
            .where("organisation.organisationId = :organizationId", {
                organizationId: userInfo.organizationId,
            });

        // Filter by user if not admin
        const isAdmin = userInfo.role.some(r => r.roleName === roleNames.ADMIN);
        if (!isAdmin) {
            skillRepo.andWhere("user.userId = :userId", { userId: userInfo.userId });
        }

        if (proficiencyLevel) {
            skillRepo.andWhere("skill.proficiencyLevel = :proficiencyLevel", { proficiencyLevel });
        }

        let [skills, total] = await skillRepo
            .orderBy("skill.updatedAt", "DESC")
            .getManyAndCount();

        // Suboptimal but common in this project: decrypt and then filter by search in memory
        for (let i = 0; i < skills.length; i++) {
            skills[i] = await skillDecryption(skills[i]);
            if (skills[i].owner) skills[i].owner = await userDecryption(skills[i].owner);
            if (skills[i].organization) skills[i].organization = await orgnizationDecryption(skills[i].organization);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            skills = skills.filter(skill =>
                skill.name?.toLowerCase().includes(searchLower) ||
                skill.category?.toLowerCase().includes(searchLower) ||
                skill.certificationName?.toLowerCase().includes(searchLower)
            );
            total = skills.length;
        }

        // Apply pagination after search filtering if search was present
        const start = (page - 1) * size;
        const pagedData = skills.slice(start, start + size);

        return {
            total,
            page,
            limit: size,
            data: pagedData
        };
    }

    async createSkill(payload: any, user: userInfo, transactionEntityManager: EntityManager) {
        const userRepo = transactionEntityManager.getRepository(User);
        const userData = await userRepo.findOne({ where: { userId: user.userId } });
        if (!userData) throw new ResourceNotFoundError("User not found");

        const organizationRepo = transactionEntityManager.getRepository(Organisation);
        let orgData = null;
        if (user.organizationId) {
            orgData = await organizationRepo.findOne({ where: { organisationId: user.organizationId } });
        }

        const skill = new Skill({
            ...payload,
            lastUsedDate: payload.lastUsedDate ? new Date(payload.lastUsedDate) : undefined,
            owner: userData,
            organization: orgData as Organisation
        });

        return await transactionEntityManager.save(skill);
    }

    async getSkillById(skillId: string, userInfo: userInfo) {
        const skill = await AppDataSource.getRepository(Skill).findOne({
            where: { skillId },
            relations: ["owner", "organization"]
        });

        if (!skill) throw new ResourceNotFoundError("Skill not found");

        // Check permissions
        const isAdmin = userInfo.role.some(r => r.roleName === roleNames.ADMIN);
        if (!isAdmin && skill.owner.userId !== userInfo.userId) {
            throw new Error("Unauthorized access to skill");
        }

        await skillDecryption(skill);
        if (skill.owner) await userDecryption(skill.owner);
        if (skill.organization) await orgnizationDecryption(skill.organization);

        return skill;
    }

    async updateSkill(skillId: string, payload: any, userInfo: userInfo, transactionEntityManager: EntityManager) {
        const skillRepo = transactionEntityManager.getRepository(Skill);
        const skill = await skillRepo.findOne({ where: { skillId }, relations: ["owner"] });

        if (!skill) throw new ResourceNotFoundError("Skill not found");

        // Check permissions
        const isAdmin = userInfo.role.some(r => r.roleName === roleNames.ADMIN);
        if (!isAdmin && skill.owner.userId !== userInfo.userId) {
            throw new Error("Unauthorized access to skill");
        }

        if (payload.lastUsedDate) payload.lastUsedDate = new Date(payload.lastUsedDate);

        Object.assign(skill, payload);
        skill.modifiedBy = userInfo.email;

        return await skillRepo.save(skill);
    }

    async deleteSkill(skillId: string, userInfo: userInfo, transactionEntityManager: EntityManager) {
        const skillRepo = transactionEntityManager.getRepository(Skill);
        const skill = await skillRepo.findOne({ where: { skillId }, relations: ["owner"] });

        if (!skill) throw new ResourceNotFoundError("Skill not found");

        // Check permissions
        const isAdmin = userInfo.role.some(r => r.roleName === roleNames.ADMIN);
        if (!isAdmin && skill.owner.userId !== userInfo.userId) {
            throw new Error("Unauthorized access to skill");
        }

        return await skillRepo.softDelete(skillId);
    }

    async bulkDeleteSkills(skillIds: string[], userInfo: userInfo, transactionEntityManager: EntityManager) {
        const skillRepo = transactionEntityManager.getRepository(Skill);

        // Filter out skills that user doesn't own (if not admin)
        const isAdmin = userInfo.role.some(r => r.roleName === roleNames.ADMIN);
        let skillsToDelete: string[] = [];

        if (isAdmin) {
            skillsToDelete = skillIds;
        } else {
            const ownedSkills = await skillRepo.createQueryBuilder("skill")
                .where("skill.skillId IN (:...skillIds)", { skillIds })
                .andWhere("skill.ownerId = :userId", { userId: userInfo.userId })
                .getMany();
            skillsToDelete = ownedSkills.map(s => s.skillId);
        }

        if (skillsToDelete.length === 0) return { deleted: [], notFound: skillIds };

        await skillRepo.softDelete(skillsToDelete);
        return { deleted: skillsToDelete, notFound: skillIds.filter(id => !skillsToDelete.includes(id)) };
    }
}

export default SkillService;
