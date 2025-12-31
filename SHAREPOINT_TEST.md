# SharePoint Test API Endpoints

## Quick Test Guide

These APIs allow you to test the SharePoint OAuth authentication flow.

---

## Setup First!

Before testing, add these to your `.env` file:

```env
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/v1/sharepoint/auth/callback
```

---

## Available Test Endpoints

### 1. Get Authorization URL
**Purpose:** Get the Microsoft login URL to start OAuth flow

```bash
GET http://localhost:3000/api/v1/sharepoint/auth?userId=test-user-123
```

**Response:**
```json
{
  "data": {
    "authUrl": "https://login.microsoftonline.com/..."
  },
  "message": "SharePoint auth URL generated successfully for user test-user-123"
}
```

**Next Step:** Copy the `authUrl` and open it in your browser

---

### 2. OAuth Callback (Automatic)
**Purpose:** Microsoft redirects here after user logs in

```
GET http://localhost:3000/api/v1/sharepoint/auth/callback?code=xxx&state=test-user-123
```

This happens automatically after you log in through the auth URL.

**Response:**
- If `FRONTEND_URL` is set → Redirects to frontend
- Otherwise → Returns JSON with success message

---

### 3. Check Connection Status
**Purpose:** Verify if a user is connected to SharePoint

```bash
GET http://localhost:3000/api/v1/sharepoint/connection?userId=test-user-123
```

**Response:**
```json
{
  "data": {
    "connected": true
  },
  "message": "User is connected to SharePoint"
}
```

---

### 4. Get Detailed Status
**Purpose:** Get detailed token information

```bash
GET http://localhost:3000/api/v1/sharepoint/status?userId=test-user-123
```

**Response:**
```json
{
  "data": {
    "userId": "test-user-123",
    "connected": true,
    "hasTokens": true,
    "hasAccessToken": true,
    "hasRefreshToken": true,
    "tokenExpiry": "2025-12-19T14:30:00.000Z",
    "isExpired": false,
    "willRefresh": false
  },
  "message": "SharePoint connection status retrieved"
}
```

---

### 5. Disconnect
**Purpose:** Remove SharePoint connection

```bash
DELETE http://localhost:3000/api/v1/sharepoint/connection
Headers: Authorization: Bearer <your-token>
```

**Response:**
```json
{
  "data": {
    "userId": "test-user-123"
  },
  "message": "SharePoint connection removed successfully"
}
```

---

## Testing Flow

### Step 1: Start Server
```bash
npm run dev
# or
yarn dev
```

### Step 2: Get Auth URL
```bash
curl "http://localhost:3000/api/v1/sharepoint/auth?userId=test-user-123"
```

### Step 3: Login via Browser
1. Copy the `authUrl` from the response
2. Open it in your browser
3. Log in with your Microsoft account
4. Grant permissions when asked
5. You'll be redirected to the callback URL

### Step 4: Verify Connection
```bash
curl "http://localhost:3000/api/v1/sharepoint/connection?userId=test-user-123"
```

You should see `"connected": true`

### Step 5: Check Detailed Status
```bash
curl "http://localhost:3000/api/v1/sharepoint/status?userId=test-user-123"
```

---

## Testing with Postman

1. **Create Collection:** "SharePoint Auth Test"

2. **Add Requests:**
   - GET Auth URL
   - GET Check Connection
   - GET Status
   - DELETE Disconnect

3. **Set Variable:** `baseUrl` = `http://localhost:3000/api/v1`

4. **Test Sequence:**
   ```
   1. GET {{baseUrl}}/sharepoint/auth?userId=test-123
   2. [Open authUrl in browser and login]
   3. GET {{baseUrl}}/sharepoint/connection?userId=test-123
   4. GET {{baseUrl}}/sharepoint/status?userId=test-123
   ```

---

## Expected Results

✅ **Success:**
- Auth URL generated
- Browser redirects after login
- Connection check returns `connected: true`
- Tokens saved in database (User.sharepointTokens)

❌ **If it fails:**
- Check `.env` has all required variables
- Verify Azure AD app permissions are granted
- Check redirect URI matches in Azure AD
- Look at server console logs for errors

---

## What These APIs Do

1. **`/auth`** → Generates Microsoft login URL
2. **`/auth/callback`** → Exchanges code for tokens, saves to DB
3. **`/connection`** → Checks if user has valid tokens
4. **`/status`** → Shows detailed token info
5. **DELETE /connection`** → Removes tokens

---

## Next Steps After Testing

Once authentication works:
1. ✅ OAuth flow confirmed
2. ⏳ Create SharePoint document service
3. ⏳ Add file upload/read/delete endpoints
4. ⏳ Create SharePointDocument entity
5. ⏳ Add visibility controls

---

## Troubleshooting

**Error: "Missing required SharePoint configuration"**
- Add environment variables to `.env`

**Error: "AADSTS65001: The user or administrator has not consented"**
- Grant admin consent in Azure AD portal

**Callback fails**
- Check redirect URI in Azure AD matches exactly
- Verify it's added to Authentication → Web → Redirect URIs

**No refresh token**
- Ensure `offline_access` scope is in Azure permissions
- Check `prompt: 'consent'` is forcing consent screen
