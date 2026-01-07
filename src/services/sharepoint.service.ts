import { Client } from "@microsoft/microsoft-graph-client";
import { SharePointAuthService } from "./sharepointAuth.service";
import { SharePointConfig } from "../config/sharepoint.config";
import { AppDataSource } from "../data-source";
import { SharePointDocument, DocumentType } from "../entity/SharePointDocument";
import { Contact } from "../entity/Contact";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { decrypt } from "../common/utils";
import { Readable } from "stream";
import { Like } from "typeorm";

export class SharePointService {
    private authService = new SharePointAuthService();
    private documentRepository = AppDataSource.getRepository(SharePointDocument);
    private contactRepository = AppDataSource.getRepository(Contact);
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
        contactId: string,
        file: Express.Multer.File,
        metadata: {
            description?: string;
            documentType?: DocumentType;
            customDocumentType?: string;
            startTime?: Date;
            endTime?: Date;
        }
    ): Promise<SharePointDocument> {
        try {
            // 1. Validate inputs
            const user = await this.userRepository.findOne({ where: { userId }, relations: ['organisation'] });
            if (!user) throw new Error("User not found");

            const contact = await this.contactRepository.findOne({ where: { contactId } });
            if (!contact) throw new Error("Contact not found");

            // 2. Get Graph Client (Service Principal)
            const client = await this.getGraphClient();
            const siteId = await this.getSiteId();

            // 3. Create Folder Structure: CxOneGo Documents / [Customer Name]
             // decrypt a contacts 
             const FirstName = contact.firstName ? decrypt(contact.firstName) : '';
             const LastName = contact.lastName ? decrypt(contact.lastName) : '';
             let displayName = '';
             if (FirstName) {
                 displayName += FirstName;
             }
             if (LastName) {
                 if (displayName) displayName += ' ';
                 displayName += LastName;
             }
             if (!displayName.trim()) {
                 displayName = `Contact-${contact.contactId}`;
             }
            const customerFolderName =displayName.replace(/[^\w\s-]/g, '_'); // Sanitize
            const rootFolder = SharePointConfig.ROOT_FOLDER_NAME;
   
            // Build the file path in SharePoint
            const filePath = `${rootFolder}/${customerFolderName}/${file.originalname}`;

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
                sharepointFolderPath: `${rootFolder}/${customerFolderName}`,
                customerFolderName: customerFolderName,
                description: metadata.description,
                documentType: metadata.documentType,
                customDocumentType: metadata.customDocumentType,
                startTime: metadata.startTime,
                endTime: metadata.endTime,
                contact: contact,
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
     * Get documents for a specific contact
     */
    async getContactDocuments(
        contactId: string,
        page: number = 1,
        limit: number = 10,
        search?: string
    ) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.documentRepository.createQueryBuilder("doc")
            .leftJoinAndSelect("doc.uploadedBy", "user")
            .where("doc.contactId = :contactId", { contactId });

        if (search) {
            queryBuilder.andWhere("(doc.fileName LIKE :search OR doc.description LIKE :search)", { search: `%${search}%` });
        }

        queryBuilder.orderBy("doc.createdAt", "DESC")
            .skip(skip)
            .take(limit);

        const [docs, total] = await queryBuilder.getManyAndCount();

        return {
            data: docs,
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
            .leftJoinAndSelect("doc.contact", "contact")
            .where("doc.uploadedById = :userId", { userId });

        if (search) {
            queryBuilder.andWhere("(doc.fileName LIKE :search OR doc.description LIKE :search)", { search: `%${search}%` });
        }

        queryBuilder.orderBy("doc.createdAt", "DESC")
            .skip(skip)
            .take(limit);

        const [docs, total] = await queryBuilder.getManyAndCount();

        return {
            data: docs,
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
            .leftJoinAndSelect("doc.contact", "contact")
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

        return {
            data: docs,
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
        return document;
    }
}
