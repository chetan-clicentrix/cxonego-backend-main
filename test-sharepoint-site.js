require('dotenv').config();
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

async function testSiteAccess() {
    console.log('🔍 Testing SharePoint Site Access...\n');
    
    if (!process.env.SHAREPOINT_SITE_URL) {
        console.error('❌ SHAREPOINT_SITE_URL not set in .env file');
        console.error('Add: SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite');
        process.exit(1);
    }
    
    try {
        // Get access token
        const msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.MICROSOFT_CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            }
        });
        
        console.log('🔐 Acquiring access token...');
        const tokenResponse = await msalClient.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
        });
        
        if (!tokenResponse || !tokenResponse.accessToken) {
            throw new Error('Failed to acquire access token');
        }
        
        console.log('✅ Access token acquired\n');
        
        // Initialize Graph client
        const client = Client.init({
            authProvider: (done) => {
                done(null, tokenResponse.accessToken);
            }
        });
        
        // Parse site URL
        const siteUrl = new URL(process.env.SHAREPOINT_SITE_URL);
        const hostname = siteUrl.hostname;
        const sitePath = siteUrl.pathname;
        
        console.log('📍 SharePoint Site URL:', process.env.SHAREPOINT_SITE_URL);
        console.log('   Hostname:', hostname);
        console.log('   Site Path:', sitePath);
        console.log('');
        
        // Get site information
        console.log('🔍 Resolving SharePoint site...');
        const site = await client.api(`/sites/${hostname}:${sitePath}`)
            .get();
        
        console.log('✅ SUCCESS! SharePoint site found');
        console.log('');
        console.log('Site Details:');
        console.log('- Site ID:', site.id);
        console.log('- Site Name:', site.displayName || site.name);
        console.log('- Web URL:', site.webUrl);
        console.log('');
        
        // Try to access the drive
        console.log('🔍 Accessing site drive...');
        const drive = await client.api(`/sites/${site.id}/drive`)
            .get();
        
        console.log('✅ SUCCESS! Site drive accessible');
        console.log('');
        console.log('Drive Details:');
        console.log('- Drive ID:', drive.id);
        console.log('- Drive Type:', drive.driveType);
        console.log('- Owner:', drive.owner?.user?.displayName || 'SharePoint');
        console.log('');
        
        // Try to list root items
        console.log('🔍 Listing drive contents...');
        const items = await client.api(`/sites/${site.id}/drive/root/children`)
            .top(5)
            .get();
        
        console.log('✅ Drive contents accessible');
        console.log(`Found ${items.value.length} items in root`);
        if (items.value.length > 0) {
            console.log('Sample items:');
            items.value.slice(0, 3).forEach(item => {
                console.log(`  - ${item.name} (${item.folder ? 'folder' : 'file'})`);
            });
        }
        console.log('');
        
        console.log('🎉 SharePoint site is fully accessible!');
        console.log('');
        console.log('💡 OPTIONAL: Add this to your .env for better performance:');
        console.log(`SHAREPOINT_SITE_ID=${site.id}`);
        console.log('');
        console.log('✅ All tests passed! You can now upload files via the API.');
        
        return true;
    } catch (error) {
        console.error('❌ FAILED: Error accessing SharePoint site');
        console.error('Error:', error.message);
        if (error.statusCode) {
            console.error('Status Code:', error.statusCode);
        }
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        console.error('');
        console.error('Common issues:');
        console.error('1. SHAREPOINT_SITE_URL is incorrect');
        console.error('   - Check the URL in your .env file');
        console.error('   - Ensure the site exists');
        console.error('');
        console.error('2. App permissions not configured:');
        console.error('   - Go to Azure AD → App registrations → Your app');
        console.error('   - API permissions → Add Sites.ReadWrite.All and Files.ReadWrite.All');
        console.error('   - Grant admin consent');
        console.error('');
        console.error('3. Permissions not propagated yet:');
        console.error('   - Wait 5-10 minutes after granting consent');
        console.error('   - Try again');
        return false;
    }
}

testSiteAccess().then(success => {
    process.exit(success ? 0 : 1);
});
