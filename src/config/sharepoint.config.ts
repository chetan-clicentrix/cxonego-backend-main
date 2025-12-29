import * as dotenv from 'dotenv';

dotenv.config();

/**
 * SharePoint/Microsoft Graph configuration
 * Manages OAuth and API settings for SharePoint integration
 */
export class SharePointConfig {
    // Microsoft Azure AD OAuth Configuration
    static readonly TENANT_ID = process.env.MICROSOFT_TENANT_ID || '';
    static readonly CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
    static readonly CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
    static readonly REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:8000/api/v1/sharepoint/auth/callback';

    // Microsoft Graph API Configuration
    static readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
    static readonly AUTHORITY = `https://login.microsoftonline.com/${SharePointConfig.TENANT_ID}`;

    // OAuth Scopes - Define required permissions
    static readonly SCOPES = [
        'Files.ReadWrite.All',      // Read and write files in all site collections
        'Sites.ReadWrite.All',      // Read and write items in all site collections
        'User.Read',                // Read user profile
        'offline_access'            // Allow refresh token
    ];

    // Token expiry buffer (refresh 5 minutes before expiry)
    static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Folder structure configuration
    static readonly ROOT_FOLDER_NAME = 'CxOneGo Documents';
    static readonly CONTACTS_FOLDER_NAME = 'Contacts';

    /**
     * Validate that all required configuration is present
     * @throws Error if any required configuration is missing
     */
    static validateConfig(): void {
        const missingConfig: string[] = [];

        if (!this.TENANT_ID) missingConfig.push('MICROSOFT_TENANT_ID');
        if (!this.CLIENT_ID) missingConfig.push('MICROSOFT_CLIENT_ID');
        if (!this.CLIENT_SECRET) missingConfig.push('MICROSOFT_CLIENT_SECRET');
        if (!this.REDIRECT_URI) missingConfig.push('MICROSOFT_REDIRECT_URI');

        if (missingConfig.length > 0) {
            throw new Error(
                `Missing required SharePoint configuration: ${missingConfig.join(', ')}. ` +
                'Please add these to your .env file.'
            );
        }

        console.log('✓ SharePoint configuration validated successfully');
    }

    /**
     * Get the authorization URL for OAuth flow
     * @param state Optional state parameter (typically userId) to maintain through OAuth flow
     * @returns Authorization URL
     */
    static getAuthorizationUrl(state?: string): string {
        const params = new URLSearchParams({
            client_id: this.CLIENT_ID,
            response_type: 'code',
            redirect_uri: this.REDIRECT_URI,
            response_mode: 'query',
            scope: this.SCOPES.join(' '),
            prompt: 'consent' // Force consent to ensure refresh token
        });

        if (state) {
            params.append('state', state);
        }

        return `${this.AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
    }

    /**
     * Get the token endpoint URL
     */
    static getTokenEndpoint(): string {
        return `${this.AUTHORITY}/oauth2/v2.0/token`;
    }

    /**
     * Log configuration status (without exposing secrets)
     */
    static logConfigStatus(): void {
        console.log('SharePoint Configuration Status:');
        console.log('- Tenant ID:', this.TENANT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client ID:', this.CLIENT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client Secret:', this.CLIENT_SECRET ? '✓ Set' : '✗ Missing');
        console.log('- Redirect URI:', this.REDIRECT_URI);
        console.log('- Required Scopes:', this.SCOPES.join(', '));
    }
}
