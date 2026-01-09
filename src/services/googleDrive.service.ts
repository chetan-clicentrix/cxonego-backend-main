import { google, drive_v3 } from 'googleapis';
import * as dotenv from 'dotenv';
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Readable } from 'stream';

dotenv.config();

interface GoogleTokens {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    id_token?: string;
    expiry_date: number;
}

export class GoogleDriveService {
    private oauth2Client;
    private drive: drive_v3.Drive;
    private userRepository = AppDataSource.getRepository(User);

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        this.drive = google.drive({
            version: 'v3',
            auth: this.oauth2Client
        });
    }

    async getAuthUrl(userId?: string): Promise<string> {
        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const authOptions: any = {
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Always request consent to ensure we get a refresh token
        };

        // If userId is provided, include it in the state to retrieve later
        if (userId) {
            authOptions.state = userId;
            console.log(`Generating Google auth URL for user ${userId} with consent prompt`);
        } else {
            console.log('Warning: Generating Google auth URL without user ID. Tokens will not be saved to a user.');
        }

        return this.oauth2Client.generateAuthUrl(authOptions);
    }

    async setCredentials(code: string, userId?: string): Promise<GoogleTokens> {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // If userId is provided, store tokens in the database
            if (userId) {
                await this.saveUserTokens(userId, tokens as GoogleTokens);
            }

            return tokens as GoogleTokens;
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw new Error('Failed to get Google tokens: ' + error.message);
        }
    }

    private async saveUserTokens(userId: string, tokens: GoogleTokens): Promise<void> {
        try {
            console.log(`Attempting to save tokens for user ${userId}`);
            console.log(`Tokens received:`, {
                hasAccessToken: !!tokens.access_token,
                hasRefreshToken: !!tokens.refresh_token,
                expiryDate: tokens.expiry_date
            });

            if (!tokens.refresh_token) {
                console.warn("WARNING: No refresh token received from Google. This will cause authentication issues!");
            }

            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                console.error(`User with ID ${userId} not found when saving Google tokens`);
                throw new Error('User not found');
            }

            console.log(`Current user Google tokens:`, user.googleTokens);

            // Update googleTokens field in User entity
            user.googleTokens = {
                refreshToken: tokens.refresh_token || (user.googleTokens?.refreshToken || ''),
                accessToken: tokens.access_token,
                expiryDate: tokens.expiry_date
            };

            await this.userRepository.save(user);
            console.log(`Successfully saved Google tokens for user ${userId}:`, user.googleTokens);
        } catch (error) {
            console.error('Error saving user tokens:', error);
            throw new Error('Failed to save user tokens: ' + error.message);
        }
    }

    async getUserTokens(userId: string): Promise<{ refreshToken: string, accessToken: string, expiryDate: number } | null> {
        try {
            console.log(`Retrieving Google tokens for user ${userId}`);

            // Find the user by ID
            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                console.log(`User ${userId} not found when retrieving Google tokens`);
                return null;
            }

            if (!user.googleTokens) {
                console.log(`User ${userId} has no googleTokens property in database`);
                return null;
            }

            // Ensure refreshToken is available
            if (!user.googleTokens.refreshToken) {
                console.log(`User ${userId} has googleTokens but missing refreshToken`);
            }

            console.log(`Successfully retrieved tokens for user ${userId}`);
            return user.googleTokens;
        } catch (error) {
            console.error(`Error getting Google tokens for user ${userId}:`, error);
            return null;
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<string> {
        try {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();

            return credentials.access_token || '';
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh access token: ' + error.message);
        }
    }

    async uploadFileWithUserAuth(userId: string, fileBuffer: Buffer, mimeType: string, fileName: string): Promise<{ fileId: string, webViewLink: string }> {
        try {
            // Get user's stored tokens
            const tokens = await this.getUserTokens(userId);
            if (!tokens) {
                throw new Error('User not authenticated with Google Drive');
            }

            // Check if token is expired and refresh if needed
            const now = Date.now();
            let accessToken = tokens.accessToken;

            if (now >= tokens.expiryDate) {
                accessToken = await this.refreshAccessToken(tokens.refreshToken);

                // Update stored token
                const user = await this.userRepository.findOne({ where: { userId } });
                if (user && user.googleTokens) {
                    user.googleTokens.accessToken = accessToken || '';
                    user.googleTokens.expiryDate = now + 3600000; // Add 1 hour
                    await this.userRepository.save(user);
                }
            }

            // Set credentials for this request
            this.oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: tokens.refreshToken
            });

            // Convert buffer to ReadableStream
            const readableStream = Readable.from(fileBuffer);

            // Create file in Drive
            const createResponse = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: mimeType
                },
                media: {
                    mimeType: mimeType,
                    body: readableStream
                }
            });

            const fileId = createResponse.data.id;

            if (!fileId) {
                throw new Error('Failed to create file in Google Drive');
            }

            // Set file permissions
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // Get the web view link
            console.log("enter in first step")
            const getResponse = await this.drive.files.get({
                fileId: fileId,
                fields: 'webViewLink'
            });

            return {
                fileId: fileId,
                webViewLink: getResponse.data.webViewLink || ''
            };
        } catch (error) {
            console.error('Error uploading file to Google Drive:', error);
            throw error;
        }
    }

    async uploadFile(fileBuffer: Buffer, mimeType: string, fileName: string) {
        try {
            // Create file in Drive
            const createResponse = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: mimeType
                },
                media: {
                    mimeType: mimeType,
                    body: fileBuffer
                }
            });

            const fileId = createResponse.data.id;

            if (!fileId) {
                throw new Error('Failed to create file in Google Drive');
            }

            // Set file permissions
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // Get the web view link
            const getResponse = await this.drive.files.get({
                fileId: fileId,
                fields: 'webViewLink'
            });

            return {
                fileId: fileId,
                webViewLink: getResponse.data.webViewLink
            };
        } catch (error) {
            console.error('Error uploading file to Google Drive:', error);
            throw error;
        }
    }

    async getForceReconnectUrl(userId: string): Promise<string> {
        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const authOptions: any = {
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Always force consent for reconnection
            state: userId
        };

        console.log(`Generating forced reconnection URL for user ${userId}`);

        return this.oauth2Client.generateAuthUrl(authOptions);
    }

    /**
     * Uploads a file to a specific contact's folder in Google Drive,
     * creating the folder structure if it doesn't exist.
     * 
     * Structure:
     * cxonego
     * └── Documents
     *     └── contacts
     *         └── [contact_name]
     *             └── uploaded_file.ext
     * 
     * @param userId User ID for authentication
     * @param contactName Name of the contact for folder naming
     * @param fileBuffer File content as buffer
     * @param mimeType MIME type of the file
     * @param fileName Name of the file to be uploaded
     * @returns Object containing fileId and webViewLink
     */
    async uploadFileToContactFolder(
        userId: string,
        contactName: string,
        fileBuffer: Buffer,
        mimeType: string,
        fileName: string
    ): Promise<{ fileId: string, webViewLink: string }> {
        try {
            // Sanitize contact name for use as folder name (remove special chars)
            const sanitizedContactName = contactName.replace(/[^\w\s-]/g, '_');

            // Get user's stored tokens
            const tokens = await this.getUserTokens(userId);
            if (!tokens) {
                throw new Error('User not authenticated with Google Drive');
            }

            // Setup authentication
            await this.setupAuthentication(userId, tokens);

            // Cache for folder IDs to avoid repeated lookups
            const folderCache: Record<string, string> = {};

            // Step 1: Find or create the root "cxonego" folder
            const rootFolderId = await this.findOrCreateFolder('cxonego', 'root', folderCache);

            // Step 2: Find or create "Documents" subfolder
            const documentsFolderId = await this.findOrCreateFolder('Documents', rootFolderId, folderCache);

            // Step 3: Find or create "contacts" subfolder
            const contactsFolderId = await this.findOrCreateFolder('contacts', documentsFolderId, folderCache);

            // Step 4: Find or create specific contact folder
            const contactFolderId = await this.findOrCreateFolder(sanitizedContactName, contactsFolderId, folderCache);

            // Step 5: Upload the file to the contact's folder
            console.log(`Uploading file "${fileName}" to contact folder "${sanitizedContactName}"`);

            // Create file in Drive
            const createResponse = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: mimeType,
                    parents: [contactFolderId] // Specify parent folder
                },
                media: {
                    mimeType: mimeType,
                    body: Readable.from(fileBuffer)
                }
            });

            const fileId = createResponse.data.id;

            if (!fileId) {
                throw new Error('Failed to create file in Google Drive');
            }

            // Set file permissions (viewable by anyone with the link)
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // Get the web view link
            const getResponse = await this.drive.files.get({
                fileId: fileId,
                fields: 'webViewLink'
            });

            return {
                fileId: fileId,
                webViewLink: getResponse.data.webViewLink || ''
            };
        } catch (error) {
            console.error('Error uploading file to contact folder:', error);
            throw new Error(`Failed to upload file to contact folder: ${error.message}`);
        }
    }

    /**
     * Helper method to find or create a folder in Google Drive
     * 
     * @param folderName Name of the folder to find or create
     * @param parentId ID of the parent folder
     * @param cache Cache object to store folder IDs
     * @returns ID of the found or created folder
     */
    private async findOrCreateFolder(
        folderName: string,
        parentId: string,
        cache: Record<string, string>
    ): Promise<string> {
        // Create a cache key using parent ID and folder name
        const cacheKey = `${parentId}:${folderName}`;

        // Check if folder ID is in cache
        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        try {
            console.log(`Looking for folder "${folderName}" in parent "${parentId}"`);

            // Search for existing folder
            const folderMimeType = 'application/vnd.google-apps.folder';
            const response = await this.drive.files.list({
                q: `name='${folderName}' and mimeType='${folderMimeType}' and '${parentId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)',
                pageSize: 1
            });

            // If folder exists, return its ID
            if (response.data.files && response.data.files.length > 0) {
                const folderId = response.data.files[0].id;
                if (!folderId) {
                    throw new Error(`Found folder "${folderName}" but ID is missing`);
                }
                console.log(`Found existing folder "${folderName}" with ID: ${folderId}`);

                // Cache the folder ID
                cache[cacheKey] = folderId;
                return folderId;
            }

            // If folder doesn't exist, create it
            console.log(`Creating new folder "${folderName}" in parent "${parentId}"`);
            const createResponse = await this.drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: folderMimeType,
                    parents: [parentId]
                },
                fields: 'id'
            });

            const newFolderId = createResponse.data.id;
            if (!newFolderId) {
                throw new Error(`Failed to create folder "${folderName}": ID is missing in response`);
            }
            console.log(`Created new folder "${folderName}" with ID: ${newFolderId}`);

            // Cache the new folder ID
            cache[cacheKey] = newFolderId;
            return newFolderId;
        } catch (error) {
            console.error(`Error finding/creating folder "${folderName}":`, error);
            throw new Error(`Failed to find or create folder "${folderName}": ${error.message}`);
        }
    }

    /**
     * Helper method to setup authentication for Google Drive operations
     * 
     * @param userId User ID for authentication
     * @param tokens User's Google tokens
     */
    private async setupAuthentication(
        userId: string,
        tokens: { refreshToken: string, accessToken: string, expiryDate: number }
    ): Promise<void> {
        try {
            // Check if token is expired and refresh if needed
            const now = Date.now();
            let accessToken = tokens.accessToken;

            if (now >= tokens.expiryDate) {
                console.log(`Access token expired for user ${userId}, refreshing...`);
                accessToken = await this.refreshAccessToken(tokens.refreshToken);

                // Update stored token
                const user = await this.userRepository.findOne({ where: { userId } });
                if (user && user.googleTokens) {
                    user.googleTokens.accessToken = accessToken || '';
                    user.googleTokens.expiryDate = now + 3600000; // Add 1 hour
                    await this.userRepository.save(user);
                }
            }

            // Set credentials for this request
            this.oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: tokens.refreshToken
            });
        } catch (error) {
            console.error('Error setting up authentication:', error);
            throw new Error(`Authentication setup failed: ${error.message}`);
        }
    }
} 