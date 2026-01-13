# CXOneGo Backend - Complete Architecture Analysis

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Pattern](#architecture-pattern)
4. [Directory Structure](#directory-structure)
5. [Core Components](#core-components)
6. [Database Architecture](#database-architecture)
7. [API Modules](#api-modules)
8. [Security & Authentication](#security--authentication)
9. [Data Flow](#data-flow)
10. [Key Features](#key-features)
11. [Deployment](#deployment)
12. [Environment Configuration](#environment-configuration)

---

## 🎯 Project Overview

**CXOneGo Backend** is a comprehensive **CRM (Customer Relationship Management)** and **Customer Service Management** platform built with Node.js, TypeScript, and TypeORM. It provides a complete solution for managing:

- **Sales Pipeline**: Leads, Contacts, Accounts, Opportunities
- **Customer Service**: Case/Ticket Management, Technician Assignment
- **Activity Management**: Tasks, Appointments, Reminders
- **Document Management**: Google Drive & SharePoint Integration
- **Subscription Management**: Plans, Payments, Trials
- **Analytics**: Dashboards, Reports, Audit Logs

---

## 🛠 Technology Stack

### Core Technologies
- **Runtime**: Node.js v18.16.0
- **Language**: TypeScript 5.2.2
- **Framework**: Express.js 4.18.2
- **ORM**: TypeORM 0.3.17
- **Database**: MySQL 3.9.1

### Key Dependencies

#### Authentication & Security
- `firebase-admin` - Firebase authentication
- `bcrypt` - Password hashing
- `crypto` - Data encryption (AES-128-CBC)
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `cors` - CORS management

#### Cloud Services
- `@aws-sdk/client-s3` - AWS S3 file storage
- `@aws-sdk/client-ses` - AWS SES email service
- `@microsoft/microsoft-graph-client` - Microsoft Graph API
- `@azure/msal-node` - Microsoft authentication
- `googleapis` - Google Drive integration

#### Payment & Notifications
- `razorpay` - Payment processing
- `fcm-node` - Firebase Cloud Messaging
- `nodemailer` - Email sending

#### Utilities
- `moment` & `moment-timezone` - Date/time handling
- `winston` - Logging
- `morgan` - HTTP request logging
- `swagger-jsdoc` & `swagger-ui-express` - API documentation
- `node-cron` - Scheduled tasks
- `xlsx` - Excel file processing
- `zod` - Schema validation

---

## 🏗 Architecture Pattern

The backend follows a **3-Layer Architecture**:

```
┌─────────────────────────────────────────┐
│         Routes Layer                    │
│  (HTTP Endpoints & Request Routing)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       Controllers Layer                 │
│  (Request Validation & Response)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        Services Layer                   │
│  (Business Logic & Data Processing)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Data Access Layer (TypeORM)        │
│  (Database Operations & Entities)       │
└─────────────────────────────────────────┘
```

### Additional Layers
- **Middlewares**: Authentication, validation, error handling
- **Schemas**: Zod validation schemas
- **Entities**: TypeORM database models
- **Common**: Utilities, constants, helpers

---

## 📁 Directory Structure

```
cxonego-backend-main/
│
├── src/
│   ├── common/              # Shared utilities
│   │   ├── constants.ts     # Application constants
│   │   ├── cron.ts          # Cron job definitions
│   │   ├── errors.ts        # Error definitions
│   │   ├── logger.ts        # Winston logger config
│   │   ├── permissions.ts   # Permission definitions
│   │   ├── swaggerOptions.ts # Swagger configuration
│   │   └── utils.ts         # Utility functions
│   │
│   ├── config/              # Configuration files
│   │
│   ├── controllers/         # Request handlers (32 files)
│   │   ├── lead.controller.ts
│   │   ├── contact.controller.ts
│   │   ├── account.controller.ts
│   │   ├── opportunity.controller.ts
│   │   ├── activity.controller.ts
│   │   ├── case.controller.ts
│   │   ├── user.controller.ts
│   │   └── ... (25+ more)
│   │
│   ├── entity/              # TypeORM entities (35 files)
│   │   ├── Lead.ts
│   │   ├── Contact.ts
│   │   ├── Account.ts
│   │   ├── User.ts
│   │   ├── Opportunity.ts
│   │   ├── Activity.ts
│   │   ├── Case.ts
│   │   ├── Subscription.ts
│   │   └── ... (27+ more)
│   │
│   ├── interfaces/          # TypeScript interfaces
│   │
│   ├── middlewares/         # Express middlewares (5 files)
│   │   ├── firebase.middleware.ts    # JWT token verification
│   │   ├── error.middleware.ts       # Error handling
│   │   ├── permission.middleware.ts  # Role-based access
│   │   ├── schema.validator.ts       # Request validation
│   │   └── file.middleware.ts        # File upload handling
│   │
│   ├── migration/           # Database migrations
│   │
│   ├── routes/              # API route definitions (32 files)
│   │   ├── router.ts        # Main router
│   │   ├── lead.routes.ts
│   │   ├── contact.routes.ts
│   │   └── ... (30+ more)
│   │
│   ├── schemas/             # Zod validation schemas (28 files)
│   │   ├── lead.schemas.ts
│   │   ├── contact.schema.ts
│   │   └── ... (26+ more)
│   │
│   ├── services/            # Business logic (41 files)
│   │   ├── lead.service.ts
│   │   ├── contact.service.ts
│   │   ├── account.service.ts
│   │   ├── activity.service.ts
│   │   ├── subscription.service.ts
│   │   └── ... (36+ more)
│   │
│   ├── types/               # Type definitions
│   │
│   ├── data-source.ts       # TypeORM configuration
│   ├── index.ts             # Application entry point
│   └── tenantDbManager.ts   # Multi-tenancy support
│
├── .env                     # Environment variables
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── Dockerfile               # Docker configuration
├── ecosystem.config.js      # PM2 process manager
└── README.md                # Documentation
```

---

## 🔧 Core Components

### 1. **Entry Point (`index.ts`)**

The main application file that:
- Initializes Express server
- Configures middlewares (CORS, body-parser, rate limiting)
- Sets up Firebase authentication
- Connects to MySQL database
- Registers API routes
- Starts cron jobs
- Configures Swagger documentation

**Key Configuration:**
```typescript
- Port: 8000 (default)
- Rate Limit: 500 requests per 5 minutes
- CORS: Configured for multiple origins
- Base URL: /api/v1
```

### 2. **Database Configuration (`data-source.ts`)**

TypeORM DataSource configuration:
- **Type**: MySQL
- **Synchronize**: Controlled by environment
- **Entities**: Auto-loaded from `src/entity/*.ts`
- **Migrations**: Development only
- **Timezone**: UTC (Z)
- **Logging**: Error level
- **Subscribers**: IST Date Subscriber for timezone handling

### 3. **Authentication Middleware (`firebase.middleware.ts`)**

Firebase-based JWT authentication:
1. Extracts Bearer token from Authorization header
2. Verifies token with Firebase Admin SDK
3. Fetches/creates user in database
4. Validates organization registration
5. Attaches user info to request object

**Protected Routes**: All routes except:
- Health check
- User invitation
- Organization creation
- Cron jobs
- OAuth callbacks
- Swagger docs

### 4. **Encryption System (`utils.ts`)**

**AES-128-CBC Encryption** for sensitive data:
- **Algorithm**: AES-128-CBC
- **Key**: 32-byte hex key
- **IV**: 32-byte static IV
- **Encoding**: Base64

**Encrypted Fields**:
- Personal information (names, emails, phones)
- Addresses (country, state, city)
- Financial data (prices)
- Descriptions and notes

---

## 🗄 Database Architecture

### Entity Relationships

```
Organisation (Multi-tenant)
    ↓
    ├── Users
    │   ├── Roles (Many-to-Many)
    │   ├── Leads (One-to-Many)
    │   ├── Contacts (One-to-Many)
    │   ├── Accounts (One-to-Many)
    │   ├── Opportunities (One-to-Many)
    │   ├── Activities (One-to-Many)
    │   ├── Cases (One-to-Many)
    │   ├── Notes (One-to-Many)
    │   ├── Documents (One-to-Many)
    │   └── Subscriptions (One-to-Many)
    │
    ├── Leads
    │   ├── Contact (Many-to-One)
    │   ├── Account (Many-to-One)
    │   ├── Activities (One-to-Many)
    │   └── Notes (One-to-Many)
    │
    ├── Contacts
    │   ├── Account (Many-to-One)
    │   ├── Leads (One-to-Many)
    │   ├── Opportunities (One-to-Many)
    │   └── Activities (One-to-Many)
    │
    ├── Accounts
    │   ├── Contacts (One-to-Many)
    │   ├── Leads (One-to-Many)
    │   └── Opportunities (One-to-Many)
    │
    ├── Opportunities
    │   ├── Account (Many-to-One)
    │   ├── Contact (Many-to-One)
    │   └── Activities (One-to-Many)
    │
    ├── Cases (Tickets)
    │   ├── Assignments (One-to-Many)
    │   ├── StatusHistory (One-to-Many)
    │   └── Technician (Many-to-One)
    │
    └── Subscriptions
        └── Payments (One-to-Many)
```

### Key Entities

#### **Lead Entity**
- Primary sales entity
- Fields: firstName, lastName, email, phone, title, company, status, rating
- Relationships: User (owner), Contact, Account, Activities, Notes
- Encryption: All PII fields encrypted
- Audit: Automatic audit logging on insert/update

#### **User Entity**
- Authentication and authorization
- Fields: userId, email, firstName, lastName, roles, organisation
- OAuth tokens: Google Drive, SharePoint
- FCM tokens: Web and Android push notifications
- Soft delete support

#### **Contact Entity**
- Customer/prospect information
- Similar structure to Lead
- Can be linked to multiple Leads and Opportunities

#### **Account Entity**
- Company/organization records
- Parent-child relationships for hierarchies
- Linked to Contacts, Leads, Opportunities

#### **Opportunity Entity**
- Sales pipeline management
- Fields: stage, probability, amount, closeDate, forecastCategory
- Win/Loss tracking with reasons

#### **Activity Entity**
- Tasks, appointments, calls, emails
- Fields: type, status, priority, dueDate, subject, description
- Reminder system with notifications
- Linked to Leads, Contacts, Opportunities, Accounts

#### **Case Entity**
- Customer service tickets
- Fields: status, priority, category, warrantyStatus
- Assignment to technicians
- Status history tracking

---

## 🌐 API Modules

### Base URL: `http://localhost:8000/api/v1`

### Module Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| **Authentication** | `/auth` | User authentication |
| **Users** | `/users` | User management |
| **Roles** | `/users/role` | Role management |
| **Organizations** | `/organization` | Organization CRUD |
| **Leads** | `/lead` | Lead management |
| **Contacts** | `/contact` | Contact management |
| **Accounts** | `/account` | Account management |
| **Opportunities** | `/opportunity` | Opportunity pipeline |
| **Activities** | `/activity` | Activity tracking |
| **Cases** | `/cases` | Ticket management |
| **Technicians** | `/technicians` | Technician management |
| **Assignments** | `/assignments` | Ticket assignments |
| **Notes** | `/note` | Notes on records |
| **Calendar** | `/calender` | Calendar events |
| **Dashboard** | `/dashboard` | Analytics & reports |
| **Audit** | `/audit` | Audit logs |
| **Documents** | `/document` | Google Drive integration |
| **SharePoint** | `/sharepoint` | SharePoint integration |
| **Subscriptions** | `/subscription` | Subscription management |
| **Plans** | `/plan` | Pricing plans |
| **Payments** | `/subscription/update-payment-status` | Razorpay webhooks |
| **Referrals** | `/refer` | Referral system |
| **Skills** | `/skills` | Technician skills |
| **Lead Routing** | `/leadRoutingConfig` | Auto-assignment rules |
| **Lead Assignment** | `/leadAssignment` | Manual assignment |
| **Mood Tracking** | `/moodimage` | User mood tracking |
| **Health Check** | `/health` | Server health |
| **Cron Jobs** | `/cron` | Manual cron triggers |
| **Super Admin** | `/superAdmin` | Admin operations |
| **Custom Plans** | `/customPlanRequest` | Custom plan requests |
| **Email POC** | `/email-poc` | Email testing |

### API Documentation
- **Swagger UI**: `http://localhost:8000/api/v1/api-doc`
- Auto-generated from JSDoc comments

---

## 🔐 Security & Authentication

### Authentication Flow

1. **Client** sends Firebase ID token in Authorization header
2. **Middleware** verifies token with Firebase Admin SDK
3. **System** fetches/creates user in database
4. **Validation** checks organization registration
5. **Request** proceeds with user context attached

### Security Features

#### 1. **Firebase Authentication**
- JWT token verification
- Email verification support
- Session management

#### 2. **Data Encryption**
- AES-128-CBC encryption for PII
- Encrypted at rest in database
- Decrypted on retrieval

#### 3. **Rate Limiting**
- 500 requests per 5 minutes per IP
- Prevents DDoS attacks

#### 4. **CORS Protection**
- Whitelist of allowed origins
- Credentials support
- Preflight handling

#### 5. **Role-Based Access Control (RBAC)**
- Roles: ADMIN, SALESMANAGER, SALESPERSON
- Permission middleware
- Route-level protection

#### 6. **Input Validation**
- Zod schema validation
- Type safety
- SQL injection prevention (TypeORM)

#### 7. **Security Headers**
- Helmet.js integration
- Referrer-Policy: strict-origin-when-cross-origin

#### 8. **Audit Logging**
- All CRUD operations logged
- User tracking
- Change history

---

## 🔄 Data Flow

### Example: Creating a Lead

```
1. Client Request
   POST /api/v1/lead
   Headers: { Authorization: "Bearer <firebase-token>" }
   Body: { firstName, lastName, email, phone, ... }
   
2. Middleware Chain
   ├── CORS validation
   ├── Rate limit check
   ├── Firebase authentication
   ├── Organization validation
   └── Schema validation
   
3. Controller (lead.controller.ts)
   ├── Extract request data
   ├── Call service method
   └── Format response
   
4. Service (lead.service.ts)
   ├── Business logic validation
   ├── Auto-assignment (if configured)
   ├── Encrypt sensitive data
   ├── Create database transaction
   ├── Save lead entity
   ├── Create audit log
   ├── Send notifications
   └── Return result
   
5. Database (TypeORM)
   ├── Execute INSERT query
   ├── Trigger @BeforeInsert hooks
   ├── Encrypt fields
   ├── Save to MySQL
   └── Return saved entity
   
6. Response
   {
     success: true,
     message: "Lead created successfully",
     data: { leadId, ... }
   }
```

---

## ✨ Key Features

### 1. **Multi-Tenancy**
- Organization-based data isolation
- Tenant-specific database connections
- User-organization relationships

### 2. **Lead Routing & Assignment**
- Rule-based auto-assignment
- Criteria: phone, email, location, source, etc.
- Operators: EQUALS, CONTAINS, IN, STARTS_WITH
- Assign to users or roles

### 3. **Activity Reminders**
- Cron job checks every 30 minutes
- Push notifications (FCM)
- Email reminders
- Scheduled notifications

### 4. **Document Management**
- **Google Drive Integration**
  - OAuth 2.0 authentication
  - File upload/download
  - Folder management
  
- **SharePoint Integration**
  - Microsoft Graph API
  - Document libraries
  - Permission management

### 5. **India Mart Integration**
- Automated lead import
- Cron job runs every 60 minutes
- Deduplication
- Auto-assignment

### 6. **Subscription Management**
- Trial periods
- Razorpay payment integration
- Subscription lifecycle (Active, Upcoming, Expired, Cancelled)
- Payment webhooks
- Expiry reminders
- Monthly reports

### 7. **Case Management (Ticketing)**
- Ticket creation and tracking
- Technician assignment
- Skill-based routing
- Status history
- Warranty tracking
- Priority management

### 8. **Dashboard & Analytics**
- Sales pipeline metrics
- Activity reports
- Lead conversion rates
- Revenue forecasting
- User performance

### 9. **Audit System**
- Complete change tracking
- Before/after values
- User attribution
- Timestamp tracking
- Subscription audit trail

### 10. **Bulk Operations**
- Excel import/export
- Bulk delete
- Batch processing

---

## 🚀 Deployment

### Development Mode

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build TypeScript
yarn build
```

### Production Deployment

#### **Option 1: PM2 (Process Manager)**

```bash
# Build the application
yarn build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs cxonego-backend-main
```

**PM2 Configuration** (`ecosystem.config.js`):
- **Cluster Mode**: Uses all CPU cores
- **Auto-restart**: On crashes
- **Memory Limit**: 1GB per instance
- **Log Rotation**: Enabled
- **Graceful Shutdown**: 5-second timeout

#### **Option 2: Docker**

```bash
# Build Docker image
docker build -t cxonego-backend .

# Run container
docker run -p 8000:8000 --env-file .env cxonego-backend

# Or use docker-compose
docker-compose up -d
```

**Dockerfile**:
- Base: Node.js 18.16.0 Alpine
- Multi-stage build
- Production optimized

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure `JWT_SECRET`
- [ ] Configure AWS credentials
- [ ] Set up Firebase credentials
- [ ] Configure CORS origins
- [ ] Enable SSL/TLS
- [ ] Set up monitoring (PM2/CloudWatch)
- [ ] Configure log rotation
- [ ] Set up backup strategy

---

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8000

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=cxonego_db
DATABASE_USER_NAME=root
DATABASE_PASSWORD=your_password

# JWT & Security
JWT_SECRET=your_jwt_secret_key

# AWS Configuration
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_SES_SENDER=noreply@yourdomain.com

# Firebase Configuration
PROJECT_ID=your_project_id
PRIVATE_KEY_ID=your_private_key_id
PRIVATE_KEY=your_private_key
CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
CLIENT_ID=your_client_id
AUTH_URI=https://accounts.google.com/o/oauth2/auth
TOKEN_URI=https://oauth2.googleapis.com/token
AUTH_PROVIDER_x509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
CLIENT_x509_CERT_URL=your_cert_url
UNIVERSE_DOMAIN=googleapis.com
FIREBASE_SERVER_KEY=your_server_key

# Payment Gateway
RAZORPAY_API_KEY=your_razorpay_key
RAZORPAY_API_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Captcha
CAPTCHA_SECRET_KEY=your_captcha_secret

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_NAME=Admin Name

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Cookies
COOKIES_DOMAIN=.yourdomain.com
SUBDOMAIN_OFFSET=2
```

---

## 📊 Cron Jobs

### Active Cron Jobs

1. **Activity Reminders** (Commented out - manual trigger)
   - Frequency: Every 30 minutes
   - Function: `checkActivityCronJob()`
   - Purpose: Send push notifications and emails for upcoming activities

2. **India Mart Lead Import**
   - Frequency: Every 60 minutes
   - Function: `indiaMartService.processAndSaveLeads()`
   - Purpose: Fetch and import leads from India Mart

3. **Subscription Expiry Reminder** (Endpoint-triggered)
   - Endpoint: `/api/v1/cron/expiryReminder`
   - Purpose: Send expiry notifications

4. **Update Subscription Status** (Endpoint-triggered)
   - Endpoint: `/api/v1/cron/updateSubscriptionStatus`
   - Purpose: Mark expired subscriptions as inactive

5. **Monthly Reports** (Endpoint-triggered)
   - Endpoint: `/api/v1/cron/sendMonthlyReport`
   - Purpose: Send monthly usage reports

6. **Mark Upcoming Subscriptions Active** (Endpoint-triggered)
   - Endpoint: `/api/v1/cron/markUpcomingToActive`
   - Purpose: Activate upcoming subscriptions

---

## 🧪 Testing & Debugging

### Health Check
```bash
GET /api/v1/health
```

### Logging
- **Winston** for application logs
- **Morgan** for HTTP request logs
- Log levels: error, warn, info, debug
- Logs include: timestamp, hostname, method, URL, status, response time

### Error Handling
- Global error middleware
- Structured error responses
- Stack traces in development
- Error logging

---

## 📈 Performance Optimizations

1. **Database Indexing**: Primary keys, foreign keys
2. **Eager Loading**: Related entities loaded efficiently
3. **Connection Pooling**: MySQL connection pool
4. **Caching**: (Can be implemented with Redis)
5. **Pagination**: Limit/offset for large datasets
6. **Cluster Mode**: PM2 multi-instance
7. **Compression**: (Can be added with compression middleware)

---

## 🔮 Future Enhancements

1. **Redis Caching**: For frequently accessed data
2. **WebSocket Support**: Real-time notifications
3. **GraphQL API**: Alternative to REST
4. **Microservices**: Split into smaller services
5. **Message Queue**: RabbitMQ/SQS for async tasks
6. **Advanced Analytics**: Machine learning for predictions
7. **Mobile SDK**: Native mobile app support
8. **API Versioning**: v2, v3 endpoints
9. **Rate Limiting per User**: Not just IP-based
10. **Two-Factor Authentication**: Enhanced security

---

## 📝 Summary

**CXOneGo Backend** is a **production-ready, enterprise-grade CRM and Customer Service platform** with:

✅ **Comprehensive Features**: Sales, Service, Analytics, Documents
✅ **Secure Architecture**: Firebase auth, encryption, RBAC
✅ **Scalable Design**: Multi-tenancy, clustering, efficient DB queries
✅ **Third-Party Integrations**: AWS, Google, Microsoft, Razorpay, India Mart
✅ **Developer-Friendly**: TypeScript, clear structure, Swagger docs
✅ **Production-Ready**: PM2, Docker, logging, error handling

The codebase is well-organized, follows best practices, and is ready for deployment and scaling.

---

**Generated on**: January 12, 2026
**Version**: 1.0.0
**Analyzed by**: AI Architecture Assistant
