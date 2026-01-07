# SharePoint Integration Testing Guide

## ✅ Pre-Test Checklist

Before testing, ensure you have:

### 1. Environment Variables Set in `.env`
```env
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite
```

### 2. Azure AD App Configured
- ✅ Client secret created
- ✅ Application permissions added: `Sites.ReadWrite.All`, `Files.ReadWrite.All`
- ✅ Admin consent granted

### 3. SharePoint Site Exists
- ✅ Site URL is accessible
- ✅ You have admin access to the site

---

## 🧪 Testing Steps

### **Test 1: Check Configuration on Startup**

1. **Start your backend server:**
```bash
npm start
# or
yarn start
# or
node dist/index.js
```

2. **Look for these success messages in the console:**
```
✓ SharePoint Service Principal configuration validated successfully
✓ SharePoint Service Principal Authentication Service initialized
```

**If you see errors:**
- ❌ "Missing required SharePoint configuration" → Check your `.env` file
- ❌ "Failed to acquire access token" → Check Azure AD app settings

---

### **Test 2: Test Authentication (Simple)**

Create a test file to verify authentication works:

**File: `test-sharepoint-auth.js`** (create in project root)

```javascript
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
        
        if (response && response.accessToken) {
            console.log('✅ SUCCESS! Access token acquired');
            console.log('Token expires at:', new Date(response.expiresOn).toISOString());
            console.log('Token type:', response.tokenType);
            console.log('');
            console.log('🎉 SharePoint authentication is working correctly!');
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
        return false;
    }
}

testAuth();
```

**Run the test:**
```bash
node test-sharepoint-auth.js
```

**Expected output:**
```
🔍 Testing SharePoint Service Principal Authentication...

Environment Variables:
- MICROSOFT_TENANT_ID: ✓ Set
- MICROSOFT_CLIENT_ID: ✓ Set
- MICROSOFT_CLIENT_SECRET: ✓ Set
- SHAREPOINT_SITE_URL: ✓ Set

🔐 Acquiring access token...
✅ SUCCESS! Access token acquired
Token expires at: 2026-01-06T16:30:00.000Z
Token type: Bearer

🎉 SharePoint authentication is working correctly!
```

---

### **Test 3: Test SharePoint Site Access**

Create another test to verify site access:

**File: `test-sharepoint-site.js`**

```javascript
require('dotenv').config();
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

async function testSiteAccess() {
    console.log('🔍 Testing SharePoint Site Access...\n');
    
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
        console.log('- Owner:', drive.owner?.user?.displayName || 'N/A');
        console.log('');
        
        console.log('🎉 SharePoint site is fully accessible!');
        console.log('');
        console.log('💡 TIP: Add this to your .env for better performance:');
        console.log(`SHAREPOINT_SITE_ID=${site.id}`);
        
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
        console.error('- Check SHAREPOINT_SITE_URL is correct');
        console.error('- Ensure the site exists and is accessible');
        console.error('- Verify app has Sites.ReadWrite.All permission');
        console.error('- Check admin consent was granted');
        return false;
    }
}

testSiteAccess();
```

**Run the test:**
```bash
node test-sharepoint-site.js
```

**Expected output:**
```
🔍 Testing SharePoint Site Access...

🔐 Acquiring access token...
✅ Access token acquired

📍 SharePoint Site URL: https://contoso.sharepoint.com/sites/cxonego-documents
   Hostname: contoso.sharepoint.com
   Site Path: /sites/cxonego-documents

🔍 Resolving SharePoint site...
✅ SUCCESS! SharePoint site found

Site Details:
- Site ID: contoso.sharepoint.com,abc-123,def-456
- Site Name: CxOneGo Documents
- Web URL: https://contoso.sharepoint.com/sites/cxonego-documents

🔍 Accessing site drive...
✅ SUCCESS! Site drive accessible

Drive Details:
- Drive ID: b!xyz789...
- Drive Type: documentLibrary
- Owner: SharePoint Admin

🎉 SharePoint site is fully accessible!

💡 TIP: Add this to your .env for better performance:
SHAREPOINT_SITE_ID=contoso.sharepoint.com,abc-123,def-456
```

---

### **Test 4: Test File Upload via API**

Now test the actual upload endpoint:

**Prerequisites:**
1. Your backend server is running
2. You have a valid JWT token for authentication
3. You have a contact ID to test with

**Using cURL:**

```bash
# Replace these values:
# - YOUR_JWT_TOKEN: Your authentication token
# - CONTACT_ID: A valid contact ID from your database
# - test.pdf: Path to a test file

curl -X POST http://localhost:8000/api/v1/sharepoint/upload/CONTACT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F "description=Test document upload" \
  -F "documentType=OTHER"
```

**Using Postman:**

1. **Method:** POST
2. **URL:** `http://localhost:8000/api/v1/sharepoint/upload/{contactId}`
3. **Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN`
4. **Body:** (form-data)
   - `file`: Select a file
   - `description`: "Test document"
   - `documentType`: "OTHER"

**Expected Response:**
```json
{
  "data": {
    "sharepointDocumentId": "uuid-here",
    "fileName": "test.pdf",
    "fileType": "application/pdf",
    "fileSize": 12345,
    "sharepointFileId": "file-id-from-sharepoint",
    "sharepointLink": "https://contoso.sharepoint.com/...",
    "description": "Test document upload",
    "documentType": "OTHER",
    "createdAt": "2026-01-06T10:20:30.000Z"
  },
  "message": "Document uploaded successfully",
  "success": true
}
```

**Check Server Logs:**
```
Uploading file to SharePoint site: CxOneGo Documents/Customer Name/test.pdf
✓ File uploaded to SharePoint site: file-id-123
✓ Document metadata saved to database
```

---

### **Test 5: Verify in SharePoint**

1. Go to your SharePoint site in browser:
   - URL: `https://yourtenant.sharepoint.com/sites/yoursite`

2. Navigate to: **Documents** → **CxOneGo Documents** → **[Customer Name]**

3. You should see your uploaded file!

---

## 🐛 Troubleshooting

### Error: "Missing required SharePoint configuration"

**Check:**
```bash
# Verify .env file exists and has all variables
cat .env | grep MICROSOFT
cat .env | grep SHAREPOINT
```

**Fix:** Add missing variables to `.env`

---

### Error: "Failed to acquire access token"

**Possible causes:**
1. Invalid client secret
2. Wrong tenant ID
3. Permissions not granted

**Test authentication:**
```bash
node test-sharepoint-auth.js
```

**Fix:**
- Verify client secret in Azure AD
- Check tenant ID matches
- Grant admin consent in Azure AD

---

### Error: "Failed to resolve SharePoint site"

**Possible causes:**
1. Wrong site URL
2. Site doesn't exist
3. App doesn't have permission

**Test site access:**
```bash
node test-sharepoint-site.js
```

**Fix:**
- Verify SHAREPOINT_SITE_URL is correct
- Ensure site exists
- Check app has Sites.ReadWrite.All permission

---

### Error: "Insufficient privileges"

**Fix:**
1. Go to Azure AD → App registrations → Your app
2. API permissions → Ensure you have:
   - `Sites.ReadWrite.All` (Application)
   - `Files.ReadWrite.All` (Application)
3. Click "Grant admin consent"
4. Wait 5-10 minutes for propagation

---

## 📋 Quick Test Checklist

- [ ] Environment variables set in `.env`
- [ ] Server starts without errors
- [ ] `test-sharepoint-auth.js` passes
- [ ] `test-sharepoint-site.js` passes
- [ ] File upload via API works
- [ ] File visible in SharePoint site

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Optional Performance Optimization:**
   - Copy the Site ID from test output
   - Add to `.env`: `SHAREPOINT_SITE_ID=your-site-id`

2. **Test with Real Data:**
   - Upload different file types
   - Test with multiple contacts
   - Verify search functionality

3. **Deploy to Production:**
   - Update production `.env`
   - Test in production environment
   - Monitor logs for any issues

---

## 📞 Need Help?

If tests fail, check:
1. Server logs for detailed error messages
2. Azure AD app registration settings
3. SharePoint site permissions
4. Network connectivity to Microsoft services

Good luck with testing! 🚀
