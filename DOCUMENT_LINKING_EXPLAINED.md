# 📊 SharePoint Document Linking Explained

## 🔗 Database Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    SharePointDocument                           │
├─────────────────────────────────────────────────────────────────┤
│ sharepointDocumentId (PK)                                       │
│ fileName: "contract.pdf"                                        │
│ sharepointLink: "https://sharepoint.com/..."                    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ contactId (FK) ──────────────────────────────────────┐  │   │
│ │ uploadedById (FK) ────────────────────────────────┐  │  │   │
│ │ organizationId (FK) ──────────────────────────┐   │  │  │   │
│ └──────────────────────────────────────────────│───│──│──┘   │
└────────────────────────────────────────────────│───│──│──────┘
                                                 │   │  │
                                                 │   │  │
                    ┌────────────────────────────┘   │  │
                    │                                │  │
                    ▼                                │  │
          ┌──────────────────┐                      │  │
          │   Organisation   │                      │  │
          ├──────────────────┤                      │  │
          │ organizationId   │                      │  │
          │ name             │                      │  │
          └──────────────────┘                      │  │
                                                    │  │
                               ┌────────────────────┘  │
                               │                       │
                               ▼                       ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │      User        │    │     Contact      │
                     ├──────────────────┤    ├──────────────────┤
                     │ userId           │    │ contactId        │
                     │ firstName        │    │ firstName        │
                     │ lastName         │    │ lastName         │
                     │ email            │    │ email            │
                     └──────────────────┘    │ company          │
                                             │ industry         │
                                             └──────────────────┘
                                                      │
                                                      │ sharepointDocuments[]
                                                      │ (One-to-Many)
                                                      ▼
                                             Multiple Documents
```

---

## 📝 **How Documents are Linked to Contacts**

### **Line 173 in Contact.ts:**
```typescript
@OneToMany(() => SharePointDocument, (doc) => doc.contact)
sharepointDocuments: SharePointDocument[];
```

This means:
- ✅ **One Contact** can have **Many SharePoint Documents**
- ✅ Each document is linked to exactly **one Contact**
- ✅ You can access all documents for a contact via `contact.sharepointDocuments`

---

## 🎯 **Real-World Example**

### **Scenario: Uploading a Contract for "Acme Corporation"**

1. **You have a Contact:**
   ```json
   {
     "contactId": "contact-abc-123",
     "firstName": "John",
     "lastName": "Smith",
     "company": "Acme Corporation",
     "email": "john@acme.com"
   }
   ```

2. **Upload a document:**
   ```bash
   POST /api/v1/sharepoint/upload/contact-abc-123
   
   Body:
   - file: contract.pdf
   - description: "Annual Service Contract"
   - documentType: "MSA"
   ```

3. **What happens:**

   **A. Database Record Created:**
   ```json
   {
     "sharepointDocumentId": "doc-xyz-789",
     "fileName": "contract.pdf",
     "contactId": "contact-abc-123",        // ← Linked to Contact
     "uploadedById": "user-current",        // ← You
     "organizationId": "org-your-org",      // ← Your org
     "sharepointLink": "https://...",
     "description": "Annual Service Contract",
     "documentType": "MSA"
   }
   ```

   **B. File Stored in SharePoint:**
   ```
   SharePoint Site
   └── CxOneGo Documents/
       └── John Smith/              ← Folder name from contact.getDisplayName()
           └── contract.pdf         ← Your file
   ```

---

## 🔍 **How to Query Documents**

### **1. Get All Documents for a Contact**

**API Call:**
```bash
GET /api/v1/sharepoint/contact/contact-abc-123
```

**SQL Query (behind the scenes):**
```sql
SELECT * FROM sharepoint_document 
WHERE contactId = 'contact-abc-123'
ORDER BY createdAt DESC
```

**Response:**
```json
{
  "data": [
    {
      "sharepointDocumentId": "doc-xyz-789",
      "fileName": "contract.pdf",
      "contactId": "contact-abc-123",
      "uploadedBy": {
        "userId": "user-current",
        "firstName": "Jane",
        "lastName": "Doe"
      },
      "sharepointLink": "https://sharepoint.com/...",
      "createdAt": "2026-01-06T10:00:00Z"
    },
    {
      "sharepointDocumentId": "doc-xyz-790",
      "fileName": "invoice.pdf",
      "contactId": "contact-abc-123",
      "uploadedBy": {...},
      "createdAt": "2026-01-05T15:30:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

### **2. Get All Documents Uploaded by You**

**API Call:**
```bash
GET /api/v1/sharepoint/user
```

**SQL Query:**
```sql
SELECT * FROM sharepoint_document 
WHERE uploadedById = 'your-user-id'
ORDER BY createdAt DESC
```

### **3. Get All Documents (Admin)**

**API Call:**
```bash
GET /api/v1/sharepoint/admin
```

**SQL Query:**
```sql
SELECT * FROM sharepoint_document 
ORDER BY createdAt DESC
```

---

## 📂 **Folder Structure in SharePoint**

### **How Folder Names are Generated:**

**From Contact.ts (Line 180-197):**
```typescript
getDisplayName(): string {
    let displayName = '';
    
    if (this.firstName) {
        displayName += this.firstName;
    }
    
    if (this.lastName) {
        if (displayName) displayName += ' ';
        displayName += this.lastName;
    }
    
    if (!displayName.trim()) {
        displayName = `Contact-${this.contactId}`;
    }
    
    return displayName;
}
```

**Examples:**
- Contact: `firstName="John"`, `lastName="Smith"` → Folder: `"John Smith"`
- Contact: `firstName="Acme"`, `lastName=""` → Folder: `"Acme"`
- Contact: `firstName=""`, `lastName=""` → Folder: `"Contact-abc-123"`

### **Full Path Example:**

```
SharePoint Site: https://contoso.sharepoint.com/sites/cxonego
└── Documents/
    └── CxOneGo Documents/
        ├── John Smith/                    ← Contact 1
        │   ├── contract.pdf
        │   ├── invoice_jan.pdf
        │   └── nda_2026.docx
        │
        ├── Acme Corporation/              ← Contact 2
        │   ├── msa_agreement.pdf
        │   └── sow_project_a.docx
        │
        └── Contact-abc-123/               ← Contact 3 (no name)
            └── document.pdf
```

---

## 🎯 **Summary**

| Aspect | Details |
|--------|---------|
| **Link Type** | One Contact → Many Documents |
| **Required Field** | `contactId` (must provide when uploading) |
| **Folder Name** | Based on `contact.getDisplayName()` |
| **Storage** | Centralized SharePoint site |
| **Database** | `SharePointDocument` table with FK to `Contact` |
| **Retrieval** | By contact, by user, or all (admin) |

---

## 💡 **Key Points**

1. ✅ **Every document MUST be linked to a Contact**
   - You provide `contactId` in the upload URL
   - Cannot upload without a contact

2. ✅ **Documents are organized by Contact**
   - Each contact gets their own folder in SharePoint
   - Folder name = Contact's display name

3. ✅ **Multiple ways to retrieve documents:**
   - By specific contact
   - By who uploaded them
   - All documents (admin only)

4. ✅ **Metadata stored in database:**
   - File info, links, descriptions
   - Relationships to contact, user, organization

5. ✅ **Physical files in SharePoint:**
   - Centralized storage
   - Organized folder structure
   - Shareable links

---

## 🚀 **Testing Example**

```bash
# 1. Upload a document for contact "contact-123"
POST /api/v1/sharepoint/upload/contact-123
Body: file=contract.pdf

# 2. Get all documents for that contact
GET /api/v1/sharepoint/contact/contact-123

# 3. File will be in SharePoint at:
# CxOneGo Documents/[Contact Name]/contract.pdf
```

That's how the linking works! 🎉
