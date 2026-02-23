import { Client } from "@microsoft/microsoft-graph-client";
import { SharePointAuthService } from "./sharepointAuth.service";
import { SharePointConfig } from "../config/sharepoint.config";
import { AppDataSource } from "../data-source";
import { SharePointDocument, DocumentType } from "../entity/SharePointDocument";
import { Oppurtunity } from "../entity/Oppurtunity";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { decrypt } from "../common/utils";
import { Readable } from "stream";
import { Like } from "typeorm";
import { sharepointDocumentDecryption, multipleSharepointDocumentsDecryption } from "./decryption.service";

export class SharePointService {
    private authService = new SharePointAuthService();
    private documentRepository = AppDataSource.getRepository(SharePointDocument);
    private opportunityRepository = AppDataSource.getRepository(Oppurtunity);
    private userRepository = AppDataSource.getRepository(User);
    private organizationRepository = AppDataSource.getRepository(Organisation);
    private siteId: string | undefined;

    /**
     * Get the SharePoint site ID from the site URL
     * Caches the site ID for subsequent requests
     */
    private async getSiteId(): Promise<string> {
        if (this.siteId) {
            return this.siteId;
        }

        // If site ID is configured directly, use it
        if (SharePointConfig.SHAREPOINT_SITE_ID) {
            this.siteId = SharePointConfig.SHAREPOINT_SITE_ID;
            console.log('✓ Using configured SharePoint Site ID');
            return this.siteId;
        }

        // Otherwise, resolve site ID from URL
        const client = await this.getGraphClient();

        // Parse the site URL to extract hostname and site path
        const siteUrl = new URL(SharePointConfig.SHAREPOINT_SITE_URL);
        const hostname = siteUrl.hostname;
        const sitePath = siteUrl.pathname;

        console.log(`Resolving SharePoint site ID for: ${hostname}${sitePath}`);

        // Get site ID using Graph API
        const site = await client.api(`/sites/${hostname}:${sitePath}`)
            .get();

        if (!site || !site.id) {
            throw new Error('Failed to resolve SharePoint site ID - no ID returned from Graph API');
        }

        this.siteId = site.id;
        console.log(`✓ Resolved SharePoint Site ID: ${this.siteId}`);

        if (!this.siteId) {
            throw new Error('Site ID is undefined after resolution');
        }

        return this.siteId;
    }

    /**
     * Get an authenticated Microsoft Graph client using Service Principal
     * No user context required - uses application permissions
     */
    private async getGraphClient(): Promise<Client> {
        const accessToken = await this.authService.getAccessToken();

        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    /**
     * Upload a file to SharePoint site and create database record
     * Uses Service Principal - no user authentication required
     */
    async uploadFile(
        userId: string,
        opportunityId: string,
        file: Express.Multer.File,
        metadata: {
            description?: string;
            documentType?: DocumentType;
            customDocumentType?: string;
            documentName?: string;
            startTime?: Date;
            endTime?: Date;
        }
    ): Promise<SharePointDocument> {
        try {
            // 1. Validate inputs
            const user = await this.userRepository.findOne({ where: { userId }, relations: ['organisation'] });
            if (!user) throw new Error("User not found");

            const opportunity = await this.opportunityRepository.findOne({
                where: { opportunityId },
                relations: ['organization', 'contact']
            });
            if (!opportunity) throw new Error("Opportunity not found");

            // 2. Get Graph Client (Service Principal)
            const client = await this.getGraphClient();
            const siteId = await this.getSiteId();

            // 3. Create Folder Structure: cx1/{CustomerName}[/{DocumentName}]
            let customerFolderName = 'Unknown-Customer';
            if (opportunity.contact?.fullName) {
                const decryptedName = decrypt(opportunity.contact.fullName);
                customerFolderName = decryptedName.trim() || `Contact-${opportunity.contact.contactId}`;
            } else if (opportunity.contact) {
                customerFolderName = `Contact-${opportunity.contact.contactId}`;
            }
            const opportunityFolderName = customerFolderName.replace(/[^\w\s-]/g, '_'); // Sanitize

            const docNamePath = metadata.documentName ? `/${metadata.documentName.replace(/[^\w\s-]/g, '_')}` : '';

            const rootFolder = SharePointConfig.ROOT_FOLDER_NAME;
            // Build path dynamically
            const folderPath = `${rootFolder}/${opportunityFolderName}${docNamePath}`;

            // Build the file path in SharePoint
            const filePath = `${folderPath}/${file.originalname}`;

            console.log(`Uploading file to SharePoint site: ${filePath}`);

            // 4. Upload File to SharePoint Site
            // Using the site's drive instead of user's OneDrive
            const driveItem = await client.api(`/sites/${siteId}/drive/root:/${filePath}:/content`)
                .put(file.buffer);

            console.log("✓ File uploaded to SharePoint site:", driveItem.id);

            // 5. Create Sharing Link (View Link)
            const permission = await client.api(`/sites/${siteId}/drive/items/${driveItem.id}/createLink`)
                .post({
                    type: "view",
                    scope: "organization" // Organization-wide access
                });

            const webUrl = permission.link.webUrl;

            // 6. Save to Database
            const document = new SharePointDocument({
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                sharepointFileId: driveItem.id,
                sharepointLink: webUrl,
                sharepointFolderPath: folderPath,
                opportunityFolderName: opportunityFolderName,
                description: metadata.description,
                documentType: metadata.documentType,
                customDocumentType: metadata.customDocumentType,
                startTime: metadata.startTime,
                endTime: metadata.endTime,
                opportunity: opportunity,
                uploadedBy: user,
                organization: user.organisation // Associate with user's org
            });

            // Encrypt sensitive fields
            document.encrypt();

            console.log('✓ Document metadata saved to database');
            return await this.documentRepository.save(document);

        } catch (error) {
            console.error("Error uploading file to SharePoint:", error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Upload a file for an Activity Plan Action to SharePoint
     * Creates folder structure: CxOneGo Documents / [Opportunity Title] / Activity Plans / [Action Name]
     */
    async uploadActivityPlanDocument(
        userId: string,
        opportunityId: string,
        actionId: string,
        file: Express.Multer.File,
        metadata?: {
            description?: string;
            documentType?: DocumentType;
        }
    ): Promise<SharePointDocument> {
        try {
            const { ActivityPlanAction } = await import("../entity/ActivityPlanAction");
            const actionRepository = AppDataSource.getRepository(ActivityPlanAction);

            // 1. Validate inputs
            const user = await this.userRepository.findOne({ where: { userId }, relations: ['organisation'] });
            if (!user) throw new Error("User not found");

            const opportunity = await this.opportunityRepository.findOne({
                where: { opportunityId },
                relations: ['organization', 'contact']
            });
            if (!opportunity) throw new Error("Opportunity not found");

            const action = await actionRepository.findOne({ where: { actionId } });
            if (!action) throw new Error("Activity Plan Action not found");

            // 2. Get Graph Client (Service Principal)
            const client = await this.getGraphClient();
            const siteId = await this.getSiteId();

            // 3. Create Folder Structure: cx1/{CustomerName}/{DocType}/Activity Plans/{ActionName}
            let customerFolderName = 'Unknown-Customer';
            if (opportunity.contact?.fullName) {
                const decryptedName = decrypt(opportunity.contact.fullName);
                customerFolderName = decryptedName.trim() || `Contact-${opportunity.contact.contactId}`;
            } else if (opportunity.contact) {
                customerFolderName = `Contact-${opportunity.contact.contactId}`;
            }
            const opportunityFolderName = customerFolderName.replace(/[^\w\s-]/g, '_'); // Sanitize

            const docTypeFolderName = metadata?.documentType || 'OTHER';
            const actionName = action.actionName ? decrypt(action.actionName) : 'Unknown Action';
            const actionFolderName = actionName.replace(/[^\w\s-]/g, '_');

            const rootFolder = SharePointConfig.ROOT_FOLDER_NAME;
            const folderPath = `${rootFolder}/${opportunityFolderName}/${docTypeFolderName}/Activity Plans/${actionFolderName}`;

            // Build the file path in SharePoint
            const filePath = `${folderPath}/${file.originalname}`;

            console.log(`Uploading activity plan file to SharePoint: ${filePath}`);

            // 4. Upload File to SharePoint Site
            const driveItem = await client.api(`/sites/${siteId}/drive/root:/${filePath}:/content`)
                .put(file.buffer);

            console.log("✓ Activity plan file uploaded to SharePoint:", driveItem.id);

            // 5. Create Sharing Link (View Link)
            const permission = await client.api(`/sites/${siteId}/drive/items/${driveItem.id}/createLink`)
                .post({
                    type: "view",
                    scope: "organization" // Organization-wide access
                });

            const webUrl = permission.link.webUrl;

            // 6. Save to Database with Activity Plan Action link
            const document = new SharePointDocument({
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                sharepointFileId: driveItem.id,
                sharepointLink: webUrl,
                sharepointFolderPath: folderPath,
                opportunityFolderName: opportunityFolderName,
                description: metadata?.description || `Uploaded for activity: ${actionName}`,
                documentType: metadata?.documentType || DocumentType.OTHER,
                opportunity: opportunity,
                uploadedBy: user,
                organization: user.organisation,
                activityPlanActionId: actionId  // Link to activity plan action
            });

            // Encrypt sensitive fields
            document.encrypt();

            console.log('✓ Activity plan document metadata saved to database');
            return await this.documentRepository.save(document);

        } catch (error) {
            console.error("Error uploading activity plan file to SharePoint:", error);
            throw new Error(`Failed to upload activity plan file: ${error.message}`);
        }
    }

    /**
     * Upload file from temp path (for resumable uploads)
     * Used by background worker after chunks are assembled
     */
    async uploadFromTempFile(
        tempFilePath: string,
        fileName: string,
        opportunityId: string,
        uploadSessionId: string,
        userId: string,
        documentType?: DocumentType,
        documentName?: string,
        customDocumentType?: string
    ): Promise<SharePointDocument> {
        try {
            // Read file from temp path
            const fileBuffer = await import("fs/promises").then(fs => fs.readFile(tempFilePath));
            const fileStats = await import("fs/promises").then(fs => fs.stat(tempFilePath));
            const mime = await import("mime-types");

            // Get user and opportunity
            const user = await this.userRepository.findOne({
                where: { userId },
                relations: ['organisation']
            });
            if (!user) throw new Error("User not found");

            const opportunity = await this.opportunityRepository.findOne({
                where: { opportunityId }
            });
            if (!opportunity) throw new Error("Opportunity not found");

            // Create multer-like file object
            const file: Express.Multer.File = {
                buffer: fileBuffer,
                originalname: fileName,
                size: fileStats.size,
                mimetype: mime.lookup(fileName) || "application/octet-stream",
                fieldname: "file",
                encoding: "7bit",
                destination: "",
                filename: fileName,
                path: tempFilePath,
                stream: null as any,
            };

            // Upload using existing uploadFile method
            const sharepointDoc = await this.uploadFile(userId, opportunityId, file, {
                description: `Uploaded via session ${uploadSessionId}`,
                documentType,
                customDocumentType,
                documentName
            });

            return sharepointDoc;
        } catch (error) {
            console.error("Error uploading from temp file:", error);
            throw new Error(`Failed to upload from temp file: ${error.message}`);
        }
    }

    /**
     * Get documents for a specific opportunity
     */
    async getOpportunityDocuments(
        opportunityId: string,
        page: number = 1,
        limit: number = 10,
        search?: string
    ) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.documentRepository.createQueryBuilder("doc")
            .leftJoinAndSelect("doc.uploadedBy", "user")
            .where("doc.opportunityId = :opportunityId", { opportunityId });

        if (search) {
            queryBuilder.andWhere("(doc.fileName LIKE :search OR doc.description LIKE :search)", { search: `%${search}%` });
        }

        queryBuilder.orderBy("doc.createdAt", "DESC")
            .skip(skip)
            .take(limit);

        const [docs, total] = await queryBuilder.getManyAndCount();

        // Decrypt documents before returning
        const decryptedDocs = await multipleSharepointDocumentsDecryption(docs);

        return {
            data: decryptedDocs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get documents uploaded by the current user
     */
    async getUserDocuments(
        userId: string,
        page: number = 1,
        limit: number = 10,
        search?: string
    ) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.documentRepository.createQueryBuilder("doc")
            .leftJoinAndSelect("doc.opportunity", "opportunity")
            .where("doc.uploadedById = :userId", { userId });

        if (search) {
            queryBuilder.andWhere("(doc.fileName LIKE :search OR doc.description LIKE :search)", { search: `%${search}%` });
        }

        queryBuilder.orderBy("doc.createdAt", "DESC")
            .skip(skip)
            .take(limit);

        const [docs, total] = await queryBuilder.getManyAndCount();

        // Decrypt documents before returning
        const decryptedDocs = await multipleSharepointDocumentsDecryption(docs);

        return {
            data: decryptedDocs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get ALL documents (Admin only)
     * Optionally filter by organization
     */
    async getAllDocuments(
        page: number = 1,
        limit: number = 10,
        search?: string,
        organizationId?: string
    ) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.documentRepository.createQueryBuilder("doc")
            .leftJoinAndSelect("doc.opportunity", "opportunity")
            .leftJoinAndSelect("doc.uploadedBy", "user");

        if (organizationId) {
            queryBuilder.andWhere("doc.organizationId = :organizationId", { organizationId });
        }

        if (search) {
            queryBuilder.andWhere("(doc.fileName LIKE :search OR doc.description LIKE :search)", { search: `%${search}%` });
        }

        queryBuilder.orderBy("doc.createdAt", "DESC")
            .skip(skip)
            .take(limit);

        const [docs, total] = await queryBuilder.getManyAndCount();

        // Decrypt documents before returning
        const decryptedDocs = await multipleSharepointDocumentsDecryption(docs);

        return {
            data: decryptedDocs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Delete a document from SharePoint site and database
     * Uses Service Principal - has permissions to delete any file
     */
    async deleteDocument(documentId: string, userId: string, isAdmin: boolean = false): Promise<void> {
        const document = await this.documentRepository.findOne({
            where: { sharepointDocumentId: documentId },
            relations: ['uploadedBy']
        });

        if (!document) {
            throw new Error("Document not found");
        }

        // Authorization check: User must be uploader OR Admin
        if (document.uploadedBy.userId !== userId && !isAdmin) {
            throw new Error("Unauthorized to delete this document");
        }

        try {
            // 1. Delete from SharePoint Site using Service Principal
            const client = await this.getGraphClient();
            const siteId = await this.getSiteId();

            await client.api(`/sites/${siteId}/drive/items/${document.sharepointFileId}`)
                .delete();

            console.log(`✓ File ${document.sharepointFileId} deleted from SharePoint site`);

        } catch (error) {
            console.error("Error deleting from SharePoint (might already be deleted):", error);
            // We proceed to soft delete from DB even if SharePoint delete fails/is already gone
        }

        // 2. Soft delete from Database
        await this.documentRepository.softRemove(document);
        console.log(`✓ Document ${documentId} soft deleted from database`);
    }

    /**
     * Get download link or content
     */
    async getDocument(documentId: string, _userId: string) {
        const document = await this.documentRepository.findOne({ where: { sharepointDocumentId: documentId } });

        if (!document) {
            throw new Error("Document not found");
        }

        // Return the metadata including the link
        // In a more complex scenario, we might fetch a temporary download URL from Graph API
        // Decrypt document before returning
        return await sharepointDocumentDecryption(document);
    }
}
