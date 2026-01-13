# Document Upload System - Environment Variables

Add these variables to your `.env` file:

```bash
# ===================================
# DOCUMENT UPLOAD CONFIGURATION
# ===================================

# Upload Storage
UPLOAD_CHUNK_SIZE=5242880  # 5MB chunks for streaming
TEMP_UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=20971520  # 20MB max per file
UPLOAD_SESSION_EXPIRY_HOURS=72

# Public Upload URL
PUBLIC_UPLOAD_BASE_URL=https://cxonego.com/upload

# Redis Configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Note: File cleanup handled by Linux cron job
# Note: Database cleanup runs daily at 3 AM via application cron
```

## Instructions

1. Copy the above configuration to your `.env` file
2. Adjust `PUBLIC_UPLOAD_BASE_URL` to match your domain
3. Ensure Redis is running on the specified host/port
4. Create the upload directory: `mkdir -p /tmp/uploads`
