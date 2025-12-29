# SharePoint Integration Setup Guide

## Overview
This guide will help you set up SharePoint/OneDrive integration for document management using Microsoft Graph API.

---

## Prerequisites

1. **Azure AD Account** - You need access to Azure Active Directory
2. **Node.js Dependencies** - Already installed:
   - `@microsoft/microsoft-graph-client` - Microsoft Graph API client
   - `@azure/msal-node` - Microsoft Authentication Library

---

## Step 1: Azure AD App Registration

### 1.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **+ New registration**
4. Fill in the details:
   - **Name**: `CxOneGo SharePoint Integration` (or your preferred name)
   - **Supported account types**: Choose based on your needs
     - Single tenant (recommended for internal apps)
     - Multi-tenant (for public apps)
   - **Redirect URI**: 
     - Platform: Web
     - URL: `http://localhost:3000/api/v1/sharepoint/auth/callback`
5. Click **Register**

### 1.2 Note Your Credentials

After registration, you'll see the **Overview** page. Copy these values:

- **Application (client) ID** → This is your `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** → This is your `MICROSOFT_TENANT_ID`

### 1.3 Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Add a description (e.g., "CxOneGo Backend")
4. Choose expiration period (recommendation: 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately → This is your `MICROSOFT_CLIENT_SECRET`
   - You can only see this value once! Store it securely.

---

## Step 2: Configure API Permissions

### 2.1 Add Microsoft Graph Permissions

1. In your app registration, go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `Files.ReadWrite.All` - Read and write user files
   - `Sites.ReadWrite.All` - Read and write SharePoint sites
   - `User.Read` - Read user profile
   - `offline_access` - Maintain access to data (refresh token)

### 2.2 Grant Admin Consent

1. After adding permissions, click **Grant admin consent for [Your Org]**
2. Confirm the action
3. All permissions should show a green checkmark under "Status"

---

## Step 3: Configure Redirect URIs

### 3.1 Add Callback URL

1. Go to **Authentication** in your app registration
2. Under **Platform configurations** > **Web**, verify the redirect URI exists:
   - `http://localhost:3000/api/v1/sharepoint/auth/callback`
3. For production, add your production URL:
   - `https://yourdomain.com/api/v1/sharepoint/auth/callback`

### 3.2 Configure Token Settings

1. Under **Authentication** > **Implicit grant and hybrid flows**:
   - Ensure **Access tokens** and **ID tokens** are unchecked (we use authorization code flow)
2. Under **Advanced settings**:
   - **Allow public client flows**: No

---

## Step 4: Environment Configuration

### 4.1 Update .env File

Add the following variables to your `.env` file with the values from Azure:

```env
# SharePoint / Microsoft Graph Configuration
MICROSOFT_TENANT_ID=your-tenant-id-from-azure
MICROSOFT_CLIENT_ID=your-client-id-from-azure
MICROSOFT_CLIENT_SECRET=your-client-secret-from-azure
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/v1/sharepoint/auth/callback
```

### 4.2 Verify Configuration

You can reference `.env.sharepoint` for a template with detailed instructions.

---

## Step 5: Files Created

The following configuration and authentication files have been created:

### Configuration
- **`src/config/sharepoint.config.ts`**
  - OAuth configuration
  - Microsoft Graph API endpoints
  - Scope definitions
  - Configuration validation

### Authentication Service
- **`src/services/sharepointAuth.service.ts`**
  - OAuth 2.0 flow implementation
  - Token exchange and refresh
  - User token management
  - Connection status checking

### Environment Template
- **`.env.sharepoint`**
  - Environment variable template
  - Setup instructions

---

## Step 6: Testing Configuration

### 6.1 Start Your Server

```bash
npm run dev
```

### 6.2 Verify Configuration

The SharePoint configuration will validate on startup. You should see:
```
✓ SharePoint configuration validated successfully
✓ SharePoint Authentication Service initialized
```

If you see errors, check that all environment variables are set correctly.

---

## Architecture Overview

```
┌─────────────┐
│   User      │
│   Browser   │
└──────┬──────┘
       │ 1. Request auth URL
       ▼
┌─────────────────────────┐
│  SharePoint Auth API    │
└──────┬──────────────────┘
       │ 2. Redirect to Microsoft
       ▼
┌─────────────────────────┐
│  Microsoft Login Page   │
│  (login.microsoft.com)  │
└──────┬──────────────────┘
       │ 3. User logs in & consents
       │ 4. Redirect with auth code
       ▼
┌─────────────────────────┐
│  Callback Endpoint      │
│  (Your backend)         │
└──────┬──────────────────┘
       │ 5. Exchange code for tokens
       ▼
┌─────────────────────────┐
│  MSAL (Microsoft Auth)  │
└──────┬──────────────────┘
       │ 6. Return access & refresh tokens
       ▼
┌─────────────────────────┐
│  Save to User DB        │
│  (sharepointTokens)     │
└─────────────────────────┘
```

---

## Next Steps

After completing this setup:

1. ✅ **Configuration Done** - OAuth credentials configured
2. ✅ **Authentication Module Ready** - MSAL integration complete
3. ⏳ **Next**: Update database entities
4. ⏳ **Next**: Create SharePoint service for file operations
5. ⏳ **Next**: Build API endpoints

---

## Troubleshooting

### Error: "Missing required SharePoint configuration"
- **Solution**: Ensure all environment variables are set in `.env` file

### Error: "AADSTS7000218: The request body must contain the following parameter: 'client_assertion'"
- **Solution**: Make sure you're using client secret, not certificate

### Error: "AADSTS65001: The user or administrator has not consented"
- **Solution**: Grant admin consent for API permissions in Azure portal

### Error: "No refresh token received"
- **Solution**: Ensure `offline_access` scope is added and `prompt=consent` is used

---

## Security Notes

⚠️ **NEVER commit your `.env` file to version control**
⚠️ **Store client secret securely**
⚠️ **Use HTTPS in production**
⚠️ **Rotate client secrets periodically**
⚠️ **Monitor token usage and refresh patterns**

---

## Support & Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
