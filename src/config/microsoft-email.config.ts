import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Microsoft Email Notification Service Configuration
 * Reuses existing Microsoft credentials from SharePoint integration
 * Focused on sending notification emails only
 */
export class MicrosoftEmailConfig {
    // Reuse existing Microsoft Azure AD Service Principal Configuration
    static readonly TENANT_ID = process.env.MICROSOFT_TENANT_ID || '';
    static readonly CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
    static readonly CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';

    // Email Service Configuration
    static readonly EMAIL_ENABLED = process.env.MICROSOFT_EMAIL_ENABLED === 'true';
    static readonly DEFAULT_FROM_MAILBOX = process.env.MICROSOFT_EMAIL_DEFAULT_FROM_MAILBOX || '';
    static readonly ADMIN_EMAIL = process.env.MICROSOFT_EMAIL_ADMIN_EMAIL || '';
    static readonly MANAGER_EMAIL = process.env.MICROSOFT_EMAIL_MANAGER_EMAIL || '';

    // Microsoft Graph API Configuration
    static readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
    static readonly AUTHORITY = `https://login.microsoftonline.com/${MicrosoftEmailConfig.TENANT_ID}`;

    // Using .Default scope which includes all configured API permissions
    static readonly SCOPE = 'https://graph.microsoft.com/.default';

    // Token expiry buffer (refresh 5 minutes before expiry)
    static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

    /**
     * Validate that all required configuration is present
     * @throws Error if any required configuration is missing
     */
    static validateConfig(): void {
        const missingConfig: string[] = [];

        if (!this.TENANT_ID) missingConfig.push('MICROSOFT_TENANT_ID');
        if (!this.CLIENT_ID) missingConfig.push('MICROSOFT_CLIENT_ID');
        if (!this.CLIENT_SECRET) missingConfig.push('MICROSOFT_CLIENT_SECRET');
        if (!this.DEFAULT_FROM_MAILBOX) missingConfig.push('MICROSOFT_EMAIL_DEFAULT_FROM_MAILBOX');

        if (missingConfig.length > 0) {
            throw new Error(
                `Missing required Microsoft Email configuration: ${missingConfig.join(', ')}. ` +
                'Please add these to your .env file.'
            );
        }

        console.log('✓ Microsoft Email Notification Service configuration validated successfully');
    }

    /**
     * Log configuration status (for debugging)
     */
    static logConfigStatus(): void {
        console.log('Microsoft Email Notification Service Configuration:');
        console.log('- Tenant ID:', this.TENANT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client ID:', this.CLIENT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client Secret:', this.CLIENT_SECRET ? '✓ Set' : '✗ Missing');
        console.log('- Default From Mailbox:', this.DEFAULT_FROM_MAILBOX ? '✓ Set' : '✗ Missing');
        console.log('- Admin Email:', this.ADMIN_EMAIL ? '✓ Set' : '⚠ Optional');
        console.log('- Manager Email:', this.MANAGER_EMAIL ? '✓ Set' : '⚠ Optional');
        console.log('- Email Enabled:', this.EMAIL_ENABLED);
        console.log('- Authentication Scope:', this.SCOPE);
        console.log('- Authentication Mode: Service Principal (Application Permissions)');
    }
}
