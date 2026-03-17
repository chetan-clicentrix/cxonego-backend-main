import * as dotenv from 'dotenv';

dotenv.config();


export class SharePointConfig {
    // Microsoft Azure AD Service Principal Configuration
    static readonly TENANT_ID = process.env.MICROSOFT_TENANT_ID || '';
    static readonly CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
    static readonly CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';

    // SharePoint Site Configuration
    
    static readonly SHAREPOINT_SITE_URL = process.env.SHAREPOINT_SITE_URL || '';

    static readonly SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID || '';

    // Microsoft Graph API Configuration
    static readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
    static readonly AUTHORITY = `https://login.microsoftonline.com/${SharePointConfig.TENANT_ID}`;

    // Token endpoint for client credentials flow
    static readonly TOKEN_ENDPOINT = `https://login.microsoftonline.com/${SharePointConfig.TENANT_ID}/oauth2/v2.0/token`;

 
    // Using .Default scope which includes all configured API permissions
    static readonly SCOPE = 'https://graph.microsoft.com/.default';

    // Token expiry buffer (refresh 5 minutes before expiry)
    static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Folder structure configuration
    static readonly ROOT_FOLDER_NAME = 'cx1';
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
        if (!this.SHAREPOINT_SITE_URL) missingConfig.push('SHAREPOINT_SITE_URL');

        if (missingConfig.length > 0) {
            throw new Error(
                `Missing required SharePoint configuration: ${missingConfig.join(', ')}. ` +
                'Please add these to your .env file.'
            );
        }

        console.log('✓ SharePoint Service Principal configuration validated successfully');
    }

  
    static logConfigStatus(): void {
        console.log('SharePoint Service Principal Configuration:');
        console.log('- Tenant ID:', this.TENANT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client ID:', this.CLIENT_ID ? '✓ Set' : '✗ Missing');
        console.log('- Client Secret:', this.CLIENT_SECRET ? '✓ Set' : '✗ Missing');
        console.log('- SharePoint Site URL:', this.SHAREPOINT_SITE_URL ? '✓ Set' : '✗ Missing');
        console.log('- Authentication Scope:', this.SCOPE);
        console.log('- Authentication Mode: Service Principal (Application Permissions)');
    }
}
