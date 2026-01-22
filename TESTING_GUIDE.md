# 🧪 Testing Guide - Document Upload System

## Step 1: Add Environment Variables

Copy these to your `.env` file:

```bash
# ===================================
# DOCUMENT UPLOAD CONFIGURATION
# ===================================

# Upload Settings
UPLOAD_CHUNK_SIZE=5242880
TEMP_UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=20971520
UPLOAD_SESSION_EXPIRY_HOURS=72

# Public Upload URL (change to your domain)
PUBLIC_UPLOAD_BASE_URL=http://localhost:3000/upload

# Redis Configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Step 2: Register Entities in data-source.ts

Add these imports:
```typescript
import { UploadSession } from "./entity/UploadSession";
import { DocumentRequirement } from "./entity/DocumentRequirement";
import { DocumentUpload } from "./entity/DocumentUpload";
import { UploadChunk } from "./entity/UploadChunk";
```

Add to entities array:
```typescript
entities: [
  // ... existing entities ...
  UploadSession,
  DocumentRequirement,
  DocumentUpload,
  UploadChunk,
]
```

---

## Step 3: Run Database Migration

```bash
# Generate migration
npm run typeorm migration:generate -- -n AddUploadEntities

# Run migration
npm run typeorm migration:run
```

Or manually create tables using TypeORM sync (development only):
```typescript
// In data-source.ts
synchronize: true  // Only for development!
```

---

## Step 4: Create Upload Directory

```bash
mkdir -p /tmp/uploads
chmod 755 /tmp/uploads
```

Windows:
```powershell
New-Item -ItemType Directory -Path "C:\tmp\uploads" -Force
```

---

## Step 5: Start the Application

```bash
yarn run dev
```

Make sure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 6: Test API Endpoints

### Test 1: Create Upload Session (Admin)

```bash
curl -X POST http://localhost:8000/api/v1/upload-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "YOUR_OPPORTUNITY_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadSessionId": "uuid-here",
    "sessionToken": "abc123xyz...",
    "opportunityId": "OPP123",
    "expiresAt": "2026-01-16T14:00:00.000Z",
    "status": "ACTIVE",
    "publicUploadUrl": "http://localhost:3000/upload/abc123xyz..."
  }
}
```

**Save the `sessionToken` for next steps!**

---

### Test 2: Get Session Details (Public - No Auth)

```bash
curl http://localhost:8000/api/public/upload/SESSION_TOKEN_HERE
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadSessionId": "uuid",
    "sessionToken": "abc123",
    "opportunityId": "OPP123",
    "expiresAt": "2026-01-16T14:00:00.000Z",
    "status": "ACTIVE",
    "requirements": [
      {
        "requirementId": "REQ1",
        "documentName": "PAN Card",
        "documentType": "PAN",
        "isRequired": true,
        "allowedFileTypes": ["pdf", "jpg", "jpeg", "png"],
        "maxFileSize": 20971520
      }
    ]
  }
}
```

---

### Test 3: Initialize Upload

```bash
curl -X POST http://localhost:8081/api/public/upload/SESSION_TOKEN/init \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "pan_card.pdf",
    "fileSize": 10485760,
    "fileType": "application/pdf",
    "totalChunks": 2,
    "requirementId": "REQ_ID_FROM_STEP2"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "UPLOAD_UUID",
    "fileName": "pan_card.pdf",
    "totalChunks": 2,
    "uploadedChunks": 0
  }
}
```

**Save the `uploadId`!**

---

### Test 4: Upload Chunk

First, create a test chunk file:
```bash
# Create a 5MB test file
dd if=/dev/urandom of=test_chunk.bin bs=1M count=5

# Calculate hash
sha256sum test_chunk.bin
# Or on Windows: certutil -hashfile test_chunk.bin SHA256
```

Upload the chunk:
```bash
curl -X POST http://localhost:8081/api/public/upload/SESSION_TOKEN/chunk \
  -F "file=@test_chunk.bin" \
  -F "uploadId=UPLOAD_ID_FROM_STEP3" \
  -F "chunkIndex=0" \
  -F "chunkHash=HASH_FROM_SHA256SUM"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "chunkIndex": 0,
    "uploadedChunks": 1,
    "totalChunks": 2,
    "progress": 50,
    "isComplete": false
  }
}
```

---

### Test 5: Check Upload Progress

```bash
curl http://localhost:8081/api/public/upload/SESSION_TOKEN/progress/UPLOAD_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadedChunks": 1,
    "totalChunks": 2,
    "progress": 50,
    "status": "UPLOADING"
  }
}
```

---

### Test 6: Get Uploaded Chunks (Resume Support)

```bash
curl http://localhost:8081/api/public/upload/SESSION_TOKEN/chunks/UPLOAD_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "uploadedChunks": [0]
  }
}
```

---

## Step 7: Verify Files

Check temp directory:
```bash
ls -lh /tmp/uploads/
# Should see: UPLOAD_ID_chunk_0
```

Check database:
```sql
SELECT * FROM upload_session;
SELECT * FROM document_upload;
SELECT * FROM upload_chunk;
```

---

## Step 8: Complete Upload & Verify SharePoint

Upload remaining chunks, then check:

1. **BullMQ Queue:**
```bash
# Check Redis for queued jobs
redis-cli
> KEYS bull:sharepoint-upload:*
```

2. **Worker Logs:**
Watch console for:
```
Processing SharePoint upload for uploadId: xxx
✓ File uploaded to SharePoint site: xxx
SharePoint upload completed for uploadId: xxx
```

3. **SharePoint:**
Check your SharePoint site for the uploaded file in:
`CxOneGo Documents / [Opportunity Name] / [filename]`

---

## ✅ Success Criteria

- [x] Session created successfully
- [x] Requirements auto-populated from Bank
- [x] Chunks uploaded to `/tmp/uploads`
- [x] Hash verification passed
- [x] Progress tracking works
- [x] File assembled after all chunks uploaded
- [x] SharePoint upload queued
- [x] Worker processed job
- [x] File appears in SharePoint
- [x] Temp files cleaned up

---

## 🐛 Troubleshooting

**Redis connection error:**
```bash
# Start Redis
redis-server
```

**Upload directory permission error:**
```bash
sudo chmod 755 /tmp/uploads
```

**Hash mismatch error:**
- Ensure you're calculating SHA-256 hash correctly
- Use `sha256sum` on Linux or `certutil` on Windows

**Worker not processing:**
- Check if worker is imported in main server file
- Check Redis connection
- Check worker logs

---

**Done!** 🎉
