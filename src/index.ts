import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Request, Response, NextFunction } from "express";

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as morgan from "morgan";

import logger from "./common/logger";
import * as dotenv from "dotenv";
import errorMiddleware from "./middlewares/error.middleware";
import router from "./routes/router";
import * as swaggerJSDoc from "swagger-jsdoc";
import * as swaggerUi from "swagger-ui-express";
import * as cookieParser from "cookie-parser";
import * as path from "path";
import options from "./common/swaggerOptions";
import { buildResponse } from "./common/utils";
import { authMiddleware } from "./middlewares/firebase.middleware";
import * as cron from "./common/cron";
import rateLimit from "express-rate-limit";

// Start SharePoint upload worker
import sharepointUploadWorker from "./workers/sharepointUpload.worker";
console.log("✓ SharePoint upload worker started");

// Start Email notification worker
import emailNotificationWorker from "./workers/emailNotification.worker";
console.log("✓ Email notification worker started");

dotenv.config();

morgan.token("host", function (req: express.Request, _res) {
  return req.hostname;
});

const app = express();

// Trust the first proxy (Nginx) so express-rate-limit can correctly
// identify real client IPs from the X-Forwarded-For header.
app.set("trust proxy", 1);


app.use(cookieParser());

const specs = swaggerJSDoc(options);

app.use("/api/v1/api-doc", swaggerUi.serve as any, swaggerUi.setup(specs) as any);

app.use(
  morgan(
    ":date[web] :remote-addr :method :host :url :status :res[content-length] - :response-time ms",
    {
      skip: function (req, _res) {
        return req.originalUrl === "/api/v1/health";
      },
    }
  )
);


const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://62.72.30.141',
  'http://72.62.226.176:5174',
  'https://cxonego.clicentrix.com',
  'https://api.clicentrix.com',
  'https://admin.clicentrix.com',
  'https://cx1.capital-assist.co.in',
  'https://api.capital-assist.co.in',
].filter(Boolean);

// General CORS for all other routes
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      console.log('Request with no origin - allowing');
      return callback(null, true);
    }

    console.log(`Received request with origin: ${origin}`);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`Origin ${origin} is allowed`);
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // Allow all origins in development
      console.log(`Development mode - allowing origin: ${origin}`);
      callback(null, true);
    } else {
      // Block in production
      console.log(`Origin ${origin} NOT allowed by CORS`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));


// Add security headers (non-CORS related)
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});


// body-parser configuration - IMPORTANT: Skip multipart/form-data (handled by multer)
app.use((req, _res, next) => {
  if (req.is('multipart/form-data')) {
    // Skip body-parser for multipart requests (multer will handle them)
    return next();
  }
  next();
});

app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.json({ type: "application/json", limit: '50mb' }));

app.use(
  authMiddleware().unless({
    path: [
      /**
       * ! mention path where you dont wanna check token in following format RegExp("/api/v1/user/auth"),
       *  */
      RegExp("^/api/v1/cron/markUpcomingToActive"),
      RegExp("/api/v1/document/auth/google/callback"),
      RegExp("/api/v1/document/auth/google"),
      RegExp("/api/v1/document/google/connection"),
      RegExp("/api/v1/document/auth/google/connection"),
      RegExp("/api/v1/document/auth/google/reconnect"),
      RegExp("/api/v1/document/debug/connection"),
      // SharePoint OAuth routes - no auth required
      RegExp("/api/v1/sharepoint/auth"),
      RegExp("/api/v1/sharepoint/auth/callback"),
      RegExp("/api/v1/sharepoint/connection"),
      RegExp("/api/v1/sharepoint/status"),
      RegExp("/api/v1/email-poc/"),
      RegExp("/api/v1/users/invite"),
      RegExp("^/api/v1/users/update/"),
      RegExp("/api/v1/health"),
      RegExp("/api/v1/users/role"),
      RegExp("/api/v1/users/isInvitationRevoked"),
      RegExp("/api/v1/users/isUserOnboarded"),
      RegExp("/api/v1/organization/"),
      RegExp("/api/v1/organization/create-organization"),
      RegExp("/api/v1/plan/getAllPlans"),
      RegExp("^/api/v1/customPlanRequest"),
      RegExp("/api/v1/subscription/update-payment-status"),
      RegExp("^/api/v1/audit/subscription"),
      RegExp("^/api/v1/cron/expiryReminder"),
      RegExp("^/api/v1/cron/updateSubscriptionStatus"),
      RegExp("^/api/v1/cron/sendMonthlyReport"),
      RegExp("^/api/v1/cron/checkActivity"),
      RegExp("^/api/v1/cron/markUpcomingToActive"),
      RegExp("^/api/v1/cron/checkOverdueActivityPlans"),
      RegExp("/api/v1/api-doc"),
      // Public upload routes - no auth required
      RegExp("^/api/v1/public/upload"),
      RegExp("/api/v1/api-doc/.*"),
      // API routes - use API key auth instead of Firebase
      RegExp("^/api/v1/api/"),
      // User signup/upsert endpoint - must be public or handled without org check
      RegExp("^/api/v1/users/?$"),
    ],
  })
);

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.name === "UnauthorizedError") {
    res.status(403).send(buildResponse("", "invalid token", err));
  } else {
    next(err);
  }
});

const port = process.env.PORT || 80;

// Define the rate limit rule
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    msg: "Too many requests from this IP, please try again after 60 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


app.use("/api", limiter);

// Serve exported Excel files statically
app.use("/temp_exports", express.static(path.join(process.cwd(), "temp_exports")));

app.use("/api/v1", router);

app.use(errorMiddleware);
const gracefulShutdown = async () => {
  logger.info("Initiating graceful shutdown...");
  try {
    if (sharepointUploadWorker) {
      await sharepointUploadWorker.close();
    }
    if (emailNotificationWorker) {
      await emailNotificationWorker.close();
    }
    logger.info("Workers stopped gracefully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

app.listen(port, async () => {
  logger.info("App Started on port", { port });
  console.log(`Server running at http://localhost:${port}`);

  // Database connection with better error handling
  try {
    // Log database connection parameters (without password)
    console.log("Attempting database connection with:", {
      host: process.env.DATABASE_HOST,
      port: Number.parseInt(process.env.DATABASE_PORT ?? "3306"),
      username: process.env.DATABASE_USER_NAME,
      database: process.env.DATABASE_NAME,
    });

    // Initialize database connection
    await AppDataSource.initialize();

    logger.info("Database connection successful...");
  } catch (error) {
    logger.error("Database connection error:", error);
    console.error("Failed to connect to database. Details:", {
      message: error.message,
      code: error.code,
      errno: error.errno,
      stack: error.stack,
    });

    // Don't crash the server on database connection failure
    // This allows the server to start and serve routes that don't require database
  }
});

cron;
