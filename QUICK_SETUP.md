# 🔧 Quick Setup & Fixes

## Missing Dependencies - INSTALL THESE FIRST!

```bash
npm install multer @types/multer file-type@16.5.4
```

Already installed:
- ✅ bullmq
- ✅ ioredis  
- ✅ @types/mime-types

---

## Environment Variables

Copy to your `.env` file:

```bash
# Document Upload Configuration
UPLOAD_CHUNK_SIZE=5242880
TEMP_UPLOAD_DIR=C:/tmp/uploads
MAX_FILE_SIZE=20971520
UPLOAD_SESSION_EXPIRY_HOURS=72
PUBLIC_UPLOAD_BASE_URL=http://localhost:3000/upload

# Redis (already configured)
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Note for Windows:** Use `C:/tmp/uploads` instead of `/tmp/uploads`

---

## Register Entities in data-source.ts

Add these imports at the top:
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
],
```

---

## Start Worker in index.ts

Add this import to start the background worker:
```typescript
// At the top of src/index.ts
import "./workers/sharepointUpload.worker";
```

This starts the BullMQ worker automatically.

---

## Create Upload Directory (Windows)

```powershell
New-Item -ItemType Directory -Path "C:\tmp\uploads" -Force
```

---

## Test Server Start

```bash
yarn run dev
```

Should see:
```
✓ SharePoint Service Principal configuration validated successfully
✓ SharePoint Service Principal Authentication Service initialized
2026-01-13 14:03:26 info: App Started on port {"port":"8000"}
Server running at http://localhost:8000
2026-01-13 14:03:26 info: Database connection successful...
```

---

## Quick Test

```bash
# Test health endpoint
curl http://localhost:8081/api/health
```

---

**All set!** Follow `TESTING_GUIDE.md` for full testing steps.
