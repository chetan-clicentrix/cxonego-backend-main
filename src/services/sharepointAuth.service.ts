import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node';
import { SharePointConfig } from '../config/sharepoint.config';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';

/**
 * SharePoint OAuth tokens structure
 */
export interface SharePointTokens {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    tokenType?: string;
    scope?: string;
}

/**
 * SharePoint Authentication Service
 * Handles OAuth 2.0 authentication flow with Microsoft using MSAL
 */
export class SharePointAuthService {
    private msalClient: ConfidentialClientApplication;
    private userRepository = AppDataSource.getRepository(User);

    constructor() {
        // Validate configuration before initializing
        SharePointConfig.validateConfig();

        // Initialize MSAL Confidential Client
        this.msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: SharePointConfig.CLIENT_ID,
                authority: SharePointConfig.AUTHORITY,
                clientSecret: SharePointConfig.CLIENT_SECRET,
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (!containsPii) {
                            console.log(`[MSAL] ${message}`);
                        }
                    },
                    piiLoggingEnabled: false,
                    logLevel: 3 // Info level
                }
            }
        });

        console.log(' SharePoint Authentication Service initialized');
    }

    /**
     * Generate OAuth authorization URL for user login
     * @param userId Optional user ID to maintain state through OAuth flow
     * @returns Authorization URL to redirect user to
     */
    async getAuthorizationUrl(userId?: string): Promise<string> {
        try {
            const authUrlRequest: AuthorizationUrlRequest = {
                scopes: SharePointConfig.SCOPES,
                redirectUri: SharePointConfig.REDIRECT_URI,
                prompt: 'consent', // Force consent screen to get refresh token
                state: userId // Pass userId as state to retrieve after callback
            };

            const authUrl = await this.msalClient.getAuthCodeUrl(authUrlRequest);

            console.log(`Generated SharePoint auth URL ${userId ? `for user ${userId}` : 'without user context'}`);
            return authUrl;
        } catch (error) {
            console.error('Error generating authorization URL:', error);
            throw new Error(`Failed to generate authorization URL: ${error.message}`);
        }
    }

    /**
     * Exchange authorization code for access tokens
     * @param code Authorization code from OAuth callback
     * @param userId Optional user ID to save tokens to database
     * @returns SharePoint tokens
     */
    async exchangeCodeForTokens(code: string, userId?: string): Promise<SharePointTokens> {
        try {
            console.log(`Exchanging authorization code for tokens ${userId ? `for user ${userId}` : ''}`);

            const tokenRequest: AuthorizationCodeRequest = {
                code: code,
                scopes: SharePointConfig.SCOPES,
                redirectUri: SharePointConfig.REDIRECT_URI
            };

            const response = await this.msalClient.acquireTokenByCode(tokenRequest);

            if (!response) {
                throw new Error('No token response received from Microsoft');
            }

            // Extract tokens from response
            const tokens: SharePointTokens = {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken || '',
                expiryDate: response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600000, // Default 1 hour
                tokenType: response.tokenType,
                scope: response.scopes?.join(' ')
            };

            // Validate we have a refresh token
            if (!tokens.refreshToken) {
                console.warn('WARNING: No refresh token received from Microsoft. User may need to re-authenticate.');
            }

            // Save tokens to database if userId provided
            if (userId) {
                await this.saveUserTokens(userId, tokens);
            }

            console.log(`✓ Successfully exchanged code for tokens ${userId ? `for user ${userId}` : ''}`);
            return tokens;
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw new Error(`Failed to exchange authorization code: ${error.message}`);
        }
    }

    /**
     * Refresh an expired access token using refresh token
     * @param refreshToken The refresh token
     * @param userId Optional user ID to update stored tokens
     * @returns New access token
     */
    async refreshAccessToken(refreshToken: string, userId?: string): Promise<string> {
        try {
            console.log(`Refreshing access token ${userId ? `for user ${userId}` : ''}`);

            const refreshRequest = {
                refreshToken: refreshToken,
                scopes: SharePointConfig.SCOPES
            };

            const response = await this.msalClient.acquireTokenByRefreshToken(refreshRequest);

            if (!response || !response.accessToken) {
                throw new Error('Failed to refresh access token - no access token in response');
            }

            // Update stored tokens if userId provided
            if (userId) {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (user && user.sharepointTokens) {
                    user.sharepointTokens.accessToken = response.accessToken;
                    user.sharepointTokens.expiryDate = response.expiresOn?.getTime() || Date.now() + 3600000;

                    // Update refresh token if new one provided
                    if (response.refreshToken) {
                        user.sharepointTokens.refreshToken = response.refreshToken;
                    }

                    await this.userRepository.save(user);
                    console.log(`✓ Updated tokens in database for user ${userId}`);
                }
            }

            return response.accessToken;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error(`Failed to refresh access token: ${error.message}`);
        }
    }

    /**
     * Save SharePoint tokens to user record in database
     * @param userId User ID
     * @param tokens SharePoint tokens to save
     */
    private async saveUserTokens(userId: string, tokens: SharePointTokens): Promise<void> {
        try {
            console.log(`Saving SharePoint tokens for user ${userId}`);
            console.log('Token details:', {
                hasAccessToken: !!tokens.accessToken,
                hasRefreshToken: !!tokens.refreshToken,
                expiryDate: new Date(tokens.expiryDate).toISOString()
            });

            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                console.error(`User ${userId} not found when saving SharePoint tokens`);
                throw new Error('User not found');
            }

            // Store tokens in user record
            user.sharepointTokens = {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiryDate: tokens.expiryDate
            };

            await this.userRepository.save(user);
            console.log(`✓ Successfully saved SharePoint tokens for user ${userId}`);
        } catch (error) {
            console.error('Error saving SharePoint tokens:', error);
            throw new Error(`Failed to save tokens: ${error.message}`);
        }
    }

    /**
     * Retrieve stored SharePoint tokens for a user
     * @param userId User ID
     * @returns User's SharePoint tokens or null if not found
     */
    async getUserTokens(userId: string): Promise<SharePointTokens | null> {
        try {
            console.log(`Retrieving SharePoint tokens for user ${userId}`);

            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                console.log(`User ${userId} not found`);
                return null;
            }

            if (!user.sharepointTokens) {
                console.log(`User ${userId} has no SharePoint tokens`);
                return null;
            }

            // Validate token structure
            if (!user.sharepointTokens.refreshToken) {
                console.warn(`User ${userId} has SharePoint tokens but missing refresh token`);
            }

            console.log(`✓ Retrieved SharePoint tokens for user ${userId}`);
            return user.sharepointTokens as SharePointTokens;
        } catch (error) {
            console.error(`Error retrieving SharePoint tokens for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Check if a user is connected to SharePoint (has valid tokens)
     * @param userId User ID
     * @returns True if user has SharePoint tokens with refresh token
     */
    async isUserConnected(userId: string): Promise<boolean> {
        try {
            const tokens = await this.getUserTokens(userId);

            if (!tokens) {
                console.log(`User ${userId} is not connected to SharePoint (no tokens)`);
                return false;
            }

            if (!tokens.refreshToken) {
                console.log(`User ${userId} has SharePoint tokens but missing refresh token`);
                return false;
            }

            console.log(`✓ User ${userId} is connected to SharePoint`);
            return true;
        } catch (error) {
            console.error(`Error checking SharePoint connection for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Get a valid access token for a user, refreshing if expired
     * @param userId User ID
     * @returns Valid access token
     * @throws Error if user not connected or token refresh fails
     */
    async getValidAccessToken(userId: string): Promise<string> {
        const tokens = await this.getUserTokens(userId);

        if (!tokens) {
            throw new Error('User not connected to SharePoint');
        }

        // Check if token is expired or about to expire
        const now = Date.now();
        const isExpired = now >= (tokens.expiryDate - SharePointConfig.TOKEN_EXPIRY_BUFFER);

        if (isExpired) {
            console.log(`Access token expired for user ${userId}, refreshing...`);
            return await this.refreshAccessToken(tokens.refreshToken, userId);
        }

        return tokens.accessToken;
    }

    /**
     * Revoke SharePoint connection for a user (remove tokens)
     * @param userId User ID
     */
    async revokeConnection(userId: string): Promise<void> {
        try {
            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                throw new Error('User not found');
            }

            user.sharepointTokens = undefined;
            await this.userRepository.save(user);

            console.log(`✓ Revoked SharePoint connection for user ${userId}`);
        } catch (error) {
            console.error(`Error revoking SharePoint connection for user ${userId}:`, error);
            throw new Error(`Failed to revoke connection: ${error.message}`);
        }
    }
}
