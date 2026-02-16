import { AppDataSource } from "../data-source";
import { Document } from "../entity/Document";
import { Contact } from "../entity/Contact";
import { User } from "../entity/User";
import { GoogleDriveService } from "./googleDrive.service";
import { Not, IsNull } from "typeorm";
import { roleNames } from "../common/utils";
import { documentDecryption, multipleDocumentsDecryption, userDecryption } from "./decryption.service";

export class DocumentService {
    private documentRepository = AppDataSource.getRepository(Document);
    private contactRepository = AppDataSource.getRepository(Contact);
    private userRepository = AppDataSource.getRepository(User);
    private googleDriveService = new GoogleDriveService();

    async getAuthUrl(userId?: string): Promise<string> {
        return this.googleDriveService.getAuthUrl(userId);
    }

    async handleGoogleCallback(code: string, userId?: string) {
        try {
            // Set credentials and store tokens if userId is provided
            const tokens = await this.googleDriveService.setCredentials(code, userId);
            return tokens;
        } catch (error) {
            console.error("Error handling Google callback:", error);
            throw error;
        }
    }

    async isUserConnectedToGoogle(userId: string): Promise<boolean> {
        try {
            console.log(`Checking Google connection for user ${userId}`);

            // First, check if the user exists
            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                console.log(`User ${userId} not found in database`);
                return false;
            }

            // Get tokens from GoogleDriveService
            const tokens = await this.googleDriveService.getUserTokens(userId);

            // Log token information for debugging (without exposing actual token values)
            console.log(`Google tokens for user ${userId}:`, {
                hasTokens: !!tokens,
                hasRefreshToken: tokens ? !!tokens.refreshToken : false,
                hasAccessToken: tokens ? !!tokens.accessToken : false,
                tokenExpiry: tokens ? new Date(tokens.expiryDate).toISOString() : null
            });

            // Verify we have tokens and at least a refresh token
            if (!tokens) {
                console.log(`User ${userId} has no Google tokens`);
                return false;
            }

            if (!tokens.refreshToken) {
                console.log(`User ${userId} is missing refresh token`);
                return false;
            }

            console.log(`User ${userId} is connected to Google Drive with valid tokens`);
            return true;
        } catch (error) {
            console.error(`Error checking if user ${userId} is connected to Google:`, error);
            return false;
        }
    }

    async uploadDocument(
        file: Express.Multer.File,
        contactId: string,
        userId: string,
        description?: string,
        documentType?: string,
        customDocumentType?: string,
        startTime?: Date,
        endTime?: Date
    ) {
        const contact = await this.contactRepository.findOne({ where: { contactId } });
        if (!contact) {
            throw new Error('Contact not found');
        }

        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Check if user belongs to the same organization as the contact
        if (contact.organization?.organisationId !== user.organisation?.organisationId) {
            throw new Error('Unauthorized to upload document for this contact');
        }

        // Check if user is connected to Google Drive
        const isConnected = await this.isUserConnectedToGoogle(userId);
        if (!isConnected) {
            throw new Error('User not connected to Google Drive. Please authenticate first.');
        }

        // Generate contact folder name from contact's full name
        const contactName = (contact.fullName && contact.fullName.trim())
            ? contact.fullName
            : `Contact-${contactId}`;

        // Create file in Drive using folder structure
        const { fileId, webViewLink } = await this.googleDriveService.uploadFileToContactFolder(
            userId,
            contactName,
            file.buffer,
            file.mimetype,
            file.originalname
        );

        // Create document record with payload
        const documentData: any = {
            fileName: file.originalname,
            fileType: file.mimetype,
            googleDriveFileId: fileId,
            googleDriveLink: webViewLink,
            contact: contact,
            uploadedBy: user
        };

        // Add organization if available
        if (user.organisation) {
            documentData.organization = user.organisation;
        }

        // Only add fields if they are provided
        if (description) {
            documentData.description = description;
        }

        if (documentType) {
            documentData.documentType = documentType;
        }

        if (customDocumentType) {
            documentData.customDocumentType = customDocumentType;
        }

        if (startTime) {
            documentData.startTime = startTime;
        }

        if (endTime) {
            documentData.endTime = endTime;
        }

        const document = new Document(documentData);

        // Encrypt the document before saving
        document.encrypt();

        const savedDocument = await this.documentRepository.save(document);

        // Decrypt the document before returning it
        return await documentDecryption(savedDocument);
    }

    async getDocumentsByContact(contactId: string, userId: string, page: number = 1, limit: number = 10, search?: string, createdAt?: string, updatedAt?: string) {
        // Get the user with roles
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['roles', 'organisation']
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get the contact with organization
        const contact = await this.contactRepository.findOne({
            where: { contactId },
            relations: ['organization']
        });

        if (!contact) {
            throw new Error('Contact not found');
        }

        // Check if user and contact belong to the same organization
        if (contact.organization?.organisationId !== user.organisation?.organisationId) {
            throw new Error('Unauthorized to access documents for this contact');
        }

        // Check if user is an organization owner/admin
        const isAdmin = user.roles.some(role => role.roleName === roleNames.ADMIN);

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Build the query
        let query = this.documentRepository.createQueryBuilder('document')
            .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
            // Select only necessary user fields to avoid decrypting unnecessary ones
            .select([
                'document',
                'uploadedBy.userId',
                'uploadedBy.email',
                'uploadedBy.firstName',
                'uploadedBy.lastName',
                'uploadedBy.countryCode',
                'uploadedBy.phone',
                'uploadedBy.country',
                'uploadedBy.state',
                'uploadedBy.city',
                'uploadedBy.theme',
                'uploadedBy.currency',
                'uploadedBy.industry',
                'uploadedBy.jobtitle',
                'uploadedBy.primaryIntension',
                'uploadedBy.fcmWebToken'
            ])
            .where('document.contact = :contactId', { contactId })
            .andWhere('document.deletedAt IS NULL');

        // Add user restriction if not admin
        if (!isAdmin) {
            query = query.andWhere('document.uploadedBy = :userId', { userId });
        }

        // Add search condition if provided
        if (search) {
            query = query.andWhere(
                '(document.fileName LIKE :search OR document.description LIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Add sorting based on createdAt or updatedAt if provided
        if (createdAt) {
            query = query.orderBy('document.createdAt', createdAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else if (updatedAt) {
            query = query.orderBy('document.updatedAt', updatedAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else {
            // Default sorting
            query = query.orderBy('document.createdAt', 'DESC');
        }

        // Get total count for pagination
        const total = await query.getCount();

        // Add pagination
        query = query.skip(skip).take(limit);

        // Get documents
        const documents = await query.getMany();

        // Decrypt documents AND the nested uploadedBy user
        const decryptedDocuments = [];
        for (const doc of documents) {
            // First, decrypt the document fields
            const decryptedDoc = await documentDecryption(doc);

            // Then, if uploadedBy exists, decrypt its fields
            if (decryptedDoc.uploadedBy) {
                decryptedDoc.uploadedBy = await userDecryption(decryptedDoc.uploadedBy);
            }
            decryptedDocuments.push(decryptedDoc);
        }

        console.log("decryptedDocuments is this :", decryptedDocuments);

        // Return with pagination details
        return {
            data: decryptedDocuments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getAllOrganizationDocuments(userId: string, page: number = 1, limit: number = 10, search?: string, createdAt?: string, updatedAt?: string) {
        // Get the user with roles and organization
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['roles', 'organisation']
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.organisation) {
            throw new Error('User does not belong to any organization');
        }

        // Check if user is an organization owner/admin
        const isAdmin = user.roles.some(role => role.roleName === roleNames.ADMIN);

        if (!isAdmin) {
            throw new Error('Only organization admins can access all documents');
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Build the query
        let query = this.documentRepository.createQueryBuilder('document')
            .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
            .leftJoinAndSelect('document.contact', 'contact')
            .where('document.organization = :organizationId', { organizationId: user.organisation.organisationId })
            .andWhere('document.deletedAt IS NULL');

        // Add search condition if provided
        if (search) {
            query = query.andWhere(
                '(document.fileName LIKE :search OR document.description LIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Add sorting based on createdAt or updatedAt if provided
        if (createdAt) {
            query = query.orderBy('document.createdAt', createdAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else if (updatedAt) {
            query = query.orderBy('document.updatedAt', updatedAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else {
            // Default sorting
            query = query.orderBy('document.createdAt', 'DESC');
        }

        // Get total count for pagination
        const total = await query.getCount();

        // Add pagination
        query = query.skip(skip).take(limit);

        // Get documents
        const documents = await query.getMany();

        // Decrypt documents
        const decryptedDocuments = await multipleDocumentsDecryption(documents);

        // Return with pagination details
        return {
            data: decryptedDocuments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getUserDocuments(userId: string, page: number = 1, limit: number = 10, search?: string, createdAt?: string, updatedAt?: string) {
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Build the query
        let query = this.documentRepository.createQueryBuilder('document')
            .leftJoinAndSelect('document.contact', 'contact')
            .where('document.uploadedBy = :userId', { userId })
            .andWhere('document.deletedAt IS NULL');

        // Add search condition if provided
        if (search) {
            query = query.andWhere(
                '(document.fileName LIKE :search OR document.description LIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Add sorting based on createdAt or updatedAt if provided
        if (createdAt) {
            query = query.orderBy('document.createdAt', createdAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else if (updatedAt) {
            query = query.orderBy('document.updatedAt', updatedAt.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else {
            // Default sorting
            query = query.orderBy('document.createdAt', 'DESC');
        }

        // Get total count for pagination
        const total = await query.getCount();

        // Add pagination
        query = query.skip(skip).take(limit);

        // Get documents
        const documents = await query.getMany();

        // Decrypt documents
        const decryptedDocuments = await multipleDocumentsDecryption(documents);

        // Return with pagination details
        return {
            data: decryptedDocuments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async deleteDocument(documentId: string, userId: string) {
        // Get the user with roles
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['roles']
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get the document with uploader
        const document = await this.documentRepository.findOne({
            where: { documentId },
            relations: ['uploadedBy', 'organization']
        });

        if (!document) {
            throw new Error('Document not found');
        }

        // Check if user is an admin or the uploader
        const isAdmin = user.roles.some(role => role.roleName === roleNames.ADMIN);
        const isUploader = document.uploadedBy.userId === userId;

        // Only allow deletion if user is admin or uploader
        if (!isAdmin && !isUploader) {
            throw new Error('Unauthorized to delete this document');
        }

        // Soft delete the document
        document.deletedAt = new Date();
        return await this.documentRepository.save(document);
    }

    async getForceReconnectUrl(userId: string): Promise<string> {
        return this.googleDriveService.getForceReconnectUrl(userId);
    }
} 