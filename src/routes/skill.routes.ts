import { Router } from "express";
import SkillController from "../controllers/skill.controller";
import { roleNames } from "../common/utils";
import hasPermission from "../middlewares/permission.middleware";

const skillRouter = Router();
const skillController = new SkillController();

/**
 * @swagger
 * tags:
 *   name: Skills
 *   description: User skill management endpoints
 */

/**
 * @swagger
 * /skills:
 *   get:
 *     summary: Get all skills
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: proficiencyLevel
 *         schema:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced, Expert]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Skill'
 *   post:
 *     summary: Create a new skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               proficiencyLevel:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced, Expert]
 *               yearsOfExperience:
 *                 type: integer
 *               isCertified:
 *                 type: boolean
 *               certificationName:
 *                 type: string
 *               lastUsedDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Created successfully
 *
 * /skills/{skillId}:
 *   get:
 *     summary: Get skill by ID
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Success
 *   put:
 *     summary: Update a skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               proficiencyLevel:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced, Expert]
 *               yearsOfExperience:
 *                 type: integer
 *               isCertified:
 *                 type: boolean
 *               certificationName:
 *                 type: string
 *               lastUsedDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Updated successfully
 *   delete:
 *     summary: Delete a skill
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted successfully
 *
 * /skills/bulk-delete:
 *   post:
 *     summary: Bulk delete skills (Admin only)
 *     tags: [Skills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skillIds]
 *             properties:
 *               skillIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Deleted successfully
 */

skillRouter.get("/", skillController.getAllSkills);
skillRouter.get("/:skillId", skillController.getSkillById);
skillRouter.post("/", skillController.createSkill);
skillRouter.put("/:skillId", skillController.updateSkill);
skillRouter.delete("/:skillId", skillController.deleteSkill);
skillRouter.post("/bulk-delete", hasPermission([roleNames.ADMIN]), skillController.bulkDeleteSkills);

export default skillRouter;
