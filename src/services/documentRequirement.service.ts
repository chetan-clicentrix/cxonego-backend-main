import { AppDataSource } from "../data-source";
import { DocumentRequirement, DocumentType } from "../entity/DocumentRequirement";
import { Oppurtunity } from "../entity/Oppurtunity";
import { userInfo } from "../interfaces/types";
import { EntityManager } from "typeorm";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import { v4 as uuidv4 } from "uuid";
import BankDocumentConfigService from "./bankDocumentConfig.service";

class DocumentRequirementService {
    private bankDocService = new BankDocumentConfigService();

    /**
     * Auto-populate requirements from Bank configuration
     */
    async createRequirementsFromBank(
        opportunityId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<DocumentRequirement[]> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const opportunityRepo = transactionEntityManager.getRepository(Oppurtunity);
        const requirementRepo = transactionEntityManager.getRepository(DocumentRequirement);

        // Get opportunity with bank details (eager loading should handle this)
        const opportunity = await opportunityRepo.findOne({
            where: {
                opportunityId,
                organization: { organisationId: user.organizationId },
            },
            relations: ["banks"], // Explicitly load banks relation
        });

        if (!opportunity) {
            throw new ResourceNotFoundError("Opportunity not found");
        }

        console.log("Opportunity details:", {
            opportunityId: opportunity.opportunityId,
            banks: opportunity.banks,
            applicantType: opportunity.applicantType,
        });

        // Check if banks and applicant type are set
        if (!opportunity.banks || opportunity.banks.length === 0 || !opportunity.applicantType) {
            throw new ValidationFailedError(
                "Opportunity must have at least one bank and applicant type configured"
            );
        }

        // Check if requirements already exist for this opportunity
        const existingRequirements = await requirementRepo.find({
            where: { opportunityId: opportunityId },
        });

        if (existingRequirements.length > 0) {
            console.log(
                `Requirements already exist for opportunity ${opportunityId}. Checking if bank/applicant type changed.`
            );

            // Fetch the documents that SHOULD exist for current bank/applicant type
            // Collect documents from all banks and deduplicate
            const currentDocumentNamesSet = new Set<string>();

            for (const bank of opportunity.banks) {
                const bankDocs = await this.bankDocService.getDocumentsByBankAndType(
                    bank.bankId,
                    opportunity.applicantType,
                    user.organizationId,
                    opportunity.loanType
                );
                bankDocs.forEach(doc => currentDocumentNamesSet.add(doc));
            }

            const currentDocumentNames = Array.from(currentDocumentNamesSet);

            // Check if the existing requirements match the current configuration
            // Compare by checking if document names match
            const existingDocNames = existingRequirements
                .map(req => req.documentName)
                .sort();
            const currentDocNames = currentDocumentNames.sort();

            const hasChanged =
                existingDocNames.length !== currentDocNames.length ||
                existingDocNames.some((name, index) => name !== currentDocNames[index]);

            if (!hasChanged) {
                console.log(
                    `Bank/applicant type unchanged for opportunity ${opportunityId}. Returning existing requirements.`
                );
                return existingRequirements;
            }

            // Configuration has changed - delete old requirements and create new ones
            console.log(
                `Bank/applicant type changed for opportunity ${opportunityId}. Deleting old requirements and creating new ones.`
            );
            console.log(`Old documents: ${existingDocNames.join(', ')}`);
            console.log(`New documents: ${currentDocNames.join(', ')}`);

            await requirementRepo.remove(existingRequirements);
            // Continue to create new requirements below
        }

        // Fetch document list from BankDocumentConfig
        console.log("Fetching documents for:", {
            banks: opportunity.banks.map(b => b.name),
            applicantType: opportunity.applicantType,
            organizationId: user.organizationId,
        });

        // Collect documents from all banks and deduplicate
        const uniqueDocumentNames = new Set<string>();

        for (const bank of opportunity.banks) {
            const bankDocs = await this.bankDocService.getDocumentsByBankAndType(
                bank.bankId,
                opportunity.applicantType,
                user.organizationId,
                opportunity.loanType
            );

            if (bankDocs && bankDocs.length > 0) {
                bankDocs.forEach(doc => uniqueDocumentNames.add(doc));
            }
        }

        const documentNames = Array.from(uniqueDocumentNames);

        console.log("Found documents:", documentNames);

        if (!documentNames || documentNames.length === 0) {
            throw new ValidationFailedError(
                "No document configuration found for this bank and applicant type"
            );
        }

        // Create requirements
        const requirements: DocumentRequirement[] = [];
        for (let i = 0; i < documentNames.length; i++) {
            const docName = documentNames[i];
            const requirement = new DocumentRequirement({
                requirementId: uuidv4(),
                opportunityId,
                opportunity,
                documentName: docName,
                documentType: this.mapDocumentType(docName),
                isRequired: true,
                allowedFileTypes: ["pdf", "jpg", "jpeg", "png"],
                maxFileSize: 20 * 1024 * 1024, // 20MB
                displayOrder: i,
                modifiedBy: user.userId,
            } as DocumentRequirement);

            requirements.push(requirement);
        }

        const savedRequirements = await requirementRepo.save(requirements);
        return savedRequirements;
    }

    /**
     * Map document name to DocumentType enum
     */
    private mapDocumentType(documentName: string): DocumentType {
        const nameLower = documentName.toLowerCase();

        if (nameLower.includes("aadhaar") || nameLower.includes("aadhar")) {
            return DocumentType.AADHAAR;
        }
        if (nameLower.includes("pan")) {
            return DocumentType.PAN;
        }
        if (nameLower.includes("bank statement") || nameLower.includes("bank_statement")) {
            return DocumentType.BANK_STATEMENT;
        }
        if (nameLower.includes("salary") || nameLower.includes("payslip")) {
            return DocumentType.SALARY_SLIP;
        }
        if (nameLower.includes("itr") || nameLower.includes("income tax")) {
            return DocumentType.ITR;
        }
        if (nameLower.includes("business")) {
            return DocumentType.BUSINESS_PROOF;
        }
        if (nameLower.includes("address")) {
            return DocumentType.ADDRESS_PROOF;
        }
        if (nameLower.includes("photo") || nameLower.includes("photograph")) {
            return DocumentType.PHOTO;
        }

        return DocumentType.OTHER;
    }

    /**
     * Create manual requirement (fallback if no bank config)
     */
    async createRequirement(
        payload: Partial<DocumentRequirement>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<DocumentRequirement> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const requirementRepo = transactionEntityManager.getRepository(DocumentRequirement);

        const requirement = new DocumentRequirement({
            ...payload,
            requirementId: uuidv4(),
            modifiedBy: user.userId,
        } as DocumentRequirement);

        const savedRequirement = await requirementRepo.save(requirement);
        return savedRequirement;
    }

    /**
     * Get all requirements for an opportunity
     */
    async getRequirementsByOpportunity(
        opportunityId: string,
        userInfo: userInfo
    ): Promise<DocumentRequirement[]> {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
        const requirements = await requirementRepo.find({
            where: {
                opportunityId,
                opportunity: {
                    organization: { organisationId: userInfo.organizationId },
                },
            },
            order: {
                displayOrder: "ASC",
            },
        });

        return requirements;
    }

    /**
     * Update requirement
     */
    async updateRequirement(
        requirementId: string,
        payload: Partial<DocumentRequirement>,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<void> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const requirementRepo = transactionEntityManager.getRepository(DocumentRequirement);

        const requirement = await requirementRepo.findOne({
            where: { requirementId },
        });

        if (!requirement) {
            throw new ResourceNotFoundError("Requirement not found");
        }

        Object.assign(requirement, payload);
        requirement.modifiedBy = user.userId;

        await requirementRepo.save(requirement);
    }

    /**
     * Delete requirement
     */
    async deleteRequirement(
        requirementId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<void> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const requirementRepo = transactionEntityManager.getRepository(DocumentRequirement);

        const result = await requirementRepo.delete({ requirementId });

        if (result.affected === 0) {
            throw new ResourceNotFoundError("Requirement not found");
        }
    }
}

export default DocumentRequirementService;
