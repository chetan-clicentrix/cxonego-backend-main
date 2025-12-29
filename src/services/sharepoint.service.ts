import { Client } from "@microsoft/microsoft-graph-client";
import { SharePointAuthService } from "./sharepointAuth.service";
import { SharePointConfig } from "../config/sharepoint.config";
import { AppDataSource } from "../data-source";
import { SharePointDocument, DocumentType } from "../entity/SharePointDocument";
import { Contact } from "../entity/Contact";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { Readable } from "stream";
import { Like } from "typeorm";

export class SharePointService {
    private authService = new SharePointAuthService();
    private documentRepository = AppDataSource.getRepository(SharePointDocument);
    private contactRepository = AppDataSource.getRepository(Contact);
    private userRepository = AppDataSource.getRepository(User);
    private organizationRepository = AppDataSource.getRepository(Organisation);

    /**
     * Get an authenticated Microsoft Graph client for a user
     */
    private async getGraphClient(userId: string): Promise<Client> {
        const accessToken = await this.authService.getValidAccessToken(userId);

        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    /**
     * Upload a file to SharePoint/OneDrive and create database record
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

            // 2. Get Graph Client
            const client = await this.getGraphClient(userId);

            // 3. Create Folder Structure: CxOneGo Documents / [Customer Name]
            const customerFolderName = contact.getDisplayName().replace(/[^\w\s-]/g, '_'); // Sanitize
            const rootFolder = SharePointConfig.ROOT_FOLDER_NAME;

            // Note: In a real production app, we should check/create folders recursively.
            // For simplicity/MVP, we'll upload to a specific path or root/customer folder.
            // Microsoft Graph allows uploading by path: /drive/root:/path/to/file:/content

            const filePath = `${rootFolder}/${customerFolderName}/${file.originalname}`;

            console.log(`Uploading file to OneDrive: ${filePath}`);

            // 4. Upload File
            // Using large file upload task is better for large files, but for MVP simple put is okay for small files
            // For production, we should implement upload session for files > 4MB

            const driveItem = await client.api(`/me/drive/root:/${filePath}:/content`)
                .put(file.buffer);

            console.log("File uploaded to OneDrive:", driveItem.id);

            // 5. Create Sharing Link (View Link)
            // We create a sharing link so we can access it later without user context if needed, 
            // or just use the webUrl provided by Graph

            const permission = await client.api(`/me/drive/items/${driveItem.id}/createLink`)
                .post({
                    type: "view",
                    scope: "organization" // or "anonymous" if needed public
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
     * Delete a document
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
            // 1. Delete from SharePoint
            // We need a valid token. If the uploader is deleting, use their token.
            // If admin is deleting, we might need the uploader's token OR admin's token if they have access.
            // For now, we assume the user performing the action has access to the file in SharePoint.
            // Note: If admin deletes another user's file, this might fail if admin doesn't have permissions on that specific OneDrive file.
            // In a real enterprise app, we'd use Application Permissions, but here we use Delegated.
            // We'll try to use the current user's token.

            const client = await this.getGraphClient(userId);

            await client.api(`/me/drive/items/${document.sharepointFileId}`)
                .delete();

            console.log(`File ${document.sharepointFileId} deleted from SharePoint`);

        } catch (error) {
            console.error("Error deleting from SharePoint (might already be deleted or permission issue):", error);
            // We proceed to soft delete from DB even if SharePoint delete fails/is already gone
        }

        // 2. Soft delete from Database
        await this.documentRepository.softRemove(document);
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
