# ✅ Your SharePoint Configuration

## 🔧 Environment Variables (.env)

Add these to your `.env` file:

```env
# SharePoint Service Principal Configuration
MICROSOFT_TENANT_ID=your-tenant-id-here
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here

# Your SharePoint Site URL
SHAREPOINT_SITE_URL=https://clicentrix0.sharepoint.com/sites/CX-One-Go
```

---

## 📁 Folder Structure

### **Your SharePoint Site:**
```
https://clicentrix0.sharepoint.com/sites/CX-One-Go
└── Documents/
    └── cx1/                              ← Your existing folder (ROOT)
        ├── (your existing files)         ← Untouched
        │
        └── [Contact folders will be created here]
            ├── John Smith/               ← Contact 1
            │   ├── contract.pdf
            │   └── invoice.pdf
            │
            ├── Acme Corporation/         ← Contact 2
            │   └── agreement.pdf
            │
            └── Tech Solutions/           ← Contact 3
                └── proposal.docx
```

### **File Path Example:**

When you upload a file for contact "John Smith":
- **Full path**: `cx1/John Smith/contract.pdf`
- **SharePoint URL**: `https://clicentrix0.sharepoint.com/sites/CX-One-Go/Documents/cx1/John Smith/contract.pdf`

---

## 🚀 Testing Your Setup

### **Step 1: Test Authentication**

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
🎉 SharePoint authentication is working correctly!
```

---

### **Step 2: Test Site Access**

```bash
node test-sharepoint-site.js
```

**Expected output:**
```
🔍 Testing SharePoint Site Access...

📍 SharePoint Site URL: https://clicentrix0.sharepoint.com/sites/CX-One-Go
   Hostname: clicentrix0.sharepoint.com
   Site Path: /sites/CX-One-Go

🔍 Resolving SharePoint site...
✅ SUCCESS! SharePoint site found

Site Details:
- Site ID: clicentrix0.sharepoint.com,xxx-xxx,yyy-yyy
- Site Name: CX-One-Go
- Web URL: https://clicentrix0.sharepoint.com/sites/CX-One-Go

🔍 Accessing site drive...
✅ SUCCESS! Site drive accessible

🔍 Listing drive contents...
✅ Drive contents accessible
Found X items in root
Sample items:
  - cx1 (folder)          ← Your existing folder!
  - ...

🎉 SharePoint site is fully accessible!
```

---

### **Step 3: Upload a Test File**

**Using cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/sharepoint/upload/YOUR_CONTACT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F "description=Test document" \
  -F "documentType=OTHER"
```

**Using Postman:**
1. **Method**: POST
2. **URL**: `http://localhost:8000/api/v1/sharepoint/upload/{contactId}`
3. **Headers**: `Authorization: Bearer YOUR_JWT_TOKEN`
4. **Body** (form-data):
   - `file`: [Select file]
   - `description`: "Test document"
   - `documentType`: "OTHER"

---

### **Step 4: Verify in SharePoint**

1. Go to: https://clicentrix0.sharepoint.com/sites/CX-One-Go
2. Navigate to: **Documents** → **cx1** → **[Contact Name]**
3. You should see your uploaded file! 🎉

---

## 📊 What Changed

✅ **Updated Configuration:**
- Root folder changed from `"CxOneGo Documents"` to `"cx1"`
- Files will now be uploaded to your existing `cx1` folder
- Contact subfolders will be created inside `cx1`

---

## 🎯 Quick Reference

| Setting | Value |
|---------|-------|
| **Site URL** | `https://clicentrix0.sharepoint.com/sites/CX-One-Go` |
| **Root Folder** | `cx1` |
| **Upload Endpoint** | `POST /api/v1/sharepoint/upload/:contactId` |
| **File Path Format** | `cx1/[Contact Name]/[filename]` |

---

## 🔍 Example Upload Flow

1. **Contact in database:**
   ```json
   {
     "contactId": "contact-123",
     "firstName": "John",
     "lastName": "Smith"
   }
   ```

2. **Upload file:**
   ```bash
   POST /api/v1/sharepoint/upload/contact-123
   File: contract.pdf
   ```

3. **Result:**
   - **Database**: Document record linked to `contact-123`
   - **SharePoint**: File stored at `cx1/John Smith/contract.pdf`
   - **Full URL**: `https://clicentrix0.sharepoint.com/sites/CX-One-Go/Documents/cx1/John Smith/contract.pdf`

---

## ✅ Configuration Complete!

Your SharePoint integration is configured to use:
- ✅ Site: `https://clicentrix0.sharepoint.com/sites/CX-One-Go`
- ✅ Root folder: `cx1` (your existing folder)
- ✅ Service Principal authentication
- ✅ Automatic folder creation per contact

**Next step:** Run the test scripts to verify everything works!

```bash
# Test 1: Authentication
node test-sharepoint-auth.js

# Test 2: Site Access
node test-sharepoint-site.js

# Test 3: Start server and upload a file
npm start
```

Good luck! 🚀
