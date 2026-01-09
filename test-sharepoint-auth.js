require('dotenv').config();
const { ConfidentialClientApplication } = require('@azure/msal-node');

async function testAuth() {
    console.log('🔍 Testing SharePoint Service Principal Authentication...\n');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('- MICROSOFT_TENANT_ID:', process.env.MICROSOFT_TENANT_ID ? '✓ Set' : '✗ Missing');
    console.log('- MICROSOFT_CLIENT_ID:', process.env.MICROSOFT_CLIENT_ID ? '✓ Set' : '✗ Missing');
    console.log('- MICROSOFT_CLIENT_SECRET:', process.env.MICROSOFT_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
    console.log('- SHAREPOINT_SITE_URL:', process.env.SHAREPOINT_SITE_URL ? '✓ Set' : '✗ Missing');
    console.log('');
    
    if (!process.env.MICROSOFT_TENANT_ID || !process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        console.error('❌ Missing required environment variables!');
        console.error('Please add them to your .env file:');
        console.error('  MICROSOFT_TENANT_ID=your-tenant-id');
        console.error('  MICROSOFT_CLIENT_ID=your-client-id');
        console.error('  MICROSOFT_CLIENT_SECRET=your-client-secret');
        console.error('  SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite');
        process.exit(1);
    }
    
    try {
        // Initialize MSAL client
        const msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.MICROSOFT_CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            }
        });
        
        console.log('🔐 Acquiring access token...');
        
        // Acquire token
        const response = await msalClient.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
        });

        console.log("response is :  ",response);
        
        if (response && response.accessToken) {
            console.log('✅ SUCCESS! Access token acquired');
            console.log('Token expires at:', new Date(response.expiresOn).toISOString());
            console.log('Token type:', response.tokenType);
            console.log('');
            console.log('🎉 SharePoint authentication is working correctly!');
            console.log('');
            console.log('Next step: Run "node test-sharepoint-site.js" to test site access');
            return true;
        } else {
            console.error('❌ FAILED: No access token received');
            return false;
        }
    } catch (error) {
        console.error('❌ FAILED: Error acquiring token');
        console.error('Error:', error.message);
        if (error.errorCode) {
            console.error('Error Code:', error.errorCode);
        }
        console.error('');
        console.error('Common issues:');
        console.error('- Invalid client secret (check Azure AD)');
        console.error('- Wrong tenant ID');
        console.error('- App permissions not granted (grant admin consent in Azure AD)');
        return false;
    }
}

testAuth().then(success => {
    process.exit(success ? 0 : 1);
});
