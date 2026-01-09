import { ConfidentialClientApplication } from '@azure/msal-node';
import { SharePointConfig } from '../config/sharepoint.config';

/**
 * SharePoint Service Principal Authentication Service
 * Handles authentication using Client Credentials flow (Application Permissions)
 * No user authentication required - uses service principal
 */
export class SharePointAuthService {
    private msalClient: ConfidentialClientApplication;
    private cachedToken: {
        accessToken: string;
        expiryDate: number;
    } | null = null;

    constructor() {
        // Validate configuration before initializing
        SharePointConfig.validateConfig();

        // Initialize MSAL Confidential Client for Service Principal
        this.msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: SharePointConfig.CLIENT_ID,
                authority: SharePointConfig.AUTHORITY,
                clientSecret: SharePointConfig.CLIENT_SECRET,
            },
            system: {
                loggerOptions: {
                    loggerCallback: (_level, message, containsPii) => {
                        if (!containsPii) {
                            console.log(`[MSAL Service Principal] ${message}`);
                        }
                    },
                    piiLoggingEnabled: false,
                    logLevel: 3 // Info level
                }
            }
        });

        console.log('✓ SharePoint Service Principal Authentication Service initialized');
    }

    /**
     * Get a valid access token using Client Credentials flow
     * Automatically caches and refreshes tokens
     * @returns Valid access token
     */
    async getAccessToken(): Promise<string> {
        try {
            // Check if we have a cached token that's still valid
            if (this.cachedToken) {
                const now = Date.now();
                const isExpired = now >= (this.cachedToken.expiryDate - SharePointConfig.TOKEN_EXPIRY_BUFFER);

                if (!isExpired) {
                    console.log('✓ Using cached Service Principal access token');
                    return this.cachedToken.accessToken;
                }

                console.log('Cached token expired, acquiring new token...');
            }

            // Acquire new token using client credentials
            console.log('Acquiring Service Principal access token...');

            const response = await this.msalClient.acquireTokenByClientCredential({
                scopes: [SharePointConfig.SCOPE],
            });

            if (!response || !response.accessToken) {
                throw new Error('Failed to acquire access token - no token in response');
            }

            // Cache the token
            this.cachedToken = {
                accessToken: response.accessToken,
                expiryDate: response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600000, // Default 1 hour
            };

            console.log('✓ Successfully acquired Service Principal access token');
            console.log(`Token expires at: ${new Date(this.cachedToken.expiryDate).toISOString()}`);

            return this.cachedToken.accessToken;
        } catch (error) {
            console.error('Error acquiring Service Principal access token:', error);
            throw new Error(`Failed to acquire access token: ${error.message}`);
        }
    }

    /**
     * Force refresh the access token (clear cache and get new token)
     */
    async refreshAccessToken(): Promise<string> {
        console.log('Force refreshing Service Principal access token...');
        this.cachedToken = null;
        return await this.getAccessToken();
    }

    /**
     * Clear cached token
     */
    clearCache(): void {
        console.log('Clearing cached Service Principal token');
        this.cachedToken = null;
    }

    /**
     * Check if service principal is properly configured
     */
    async testConnection(): Promise<boolean> {
        try {
            const token = await this.getAccessToken();
            return !!token;
        } catch (error) {
            console.error('Service Principal connection test failed:', error);
            return false;
        }
    }
}
