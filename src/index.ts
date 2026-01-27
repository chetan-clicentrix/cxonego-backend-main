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
import options from "./common/swaggerOptions";
import { buildResponse } from "./common/utils";
import { authMiddleware } from "./middlewares/firebase.middleware";
import * as cron from "./common/cron";
import rateLimit from "express-rate-limit";

// Start SharePoint upload worker
import "./workers/sharepointUpload.worker";
console.log("✓ SharePoint upload worker started");

// Start Email notification worker
import "./workers/emailNotification.worker";
console.log("✓ Email notification worker started");

dotenv.config();

morgan.token("host", function (req: express.Request, _res) {
  return req.hostname;
});

const app = express();

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

// IMPORTANT: Special route for captcha verification - must come BEFORE general CORS
// This ensures the captcha endpoint gets its own CORS rules applied first
app.options('/api/v1/superAdmin/verifyCaptcha', cors());  // Enable preflight for the captcha endpoint
app.use('/api/v1/superAdmin/verifyCaptcha', cors({
  origin: true, // Allow the request's origin
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://62.72.30.141',
  'https://cxonego.clicentrix.com',
  'https://api.clicentrix.com',
  'https://admin.clicentrix.com',

  '',
  undefined // This will match requests without an origin header
].filter(Boolean) as (string | undefined)[];

// General CORS for all other routes
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {

    if (!origin) return callback(null, true);


    console.log(`Received request with origin: ${origin}`);


    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // In production, still allow all origins for now
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add security headers
// Add security headers
app.use((req, res, next) => {
  // Add Access-Control-Allow-Origin header to every response
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Handle OPTIONS requests manually for all routes
app.options('*', (req, res) => {
  // Get the origin from the request header
  const origin = req.headers.origin;

  // Log the origin for debugging
  console.log(`OPTIONS request received from origin: ${origin}`);

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Respond with 204 No Content
  res.status(204).end();
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
      RegExp("/api/v1/users/update"),
      RegExp("/api/v1/health"),
      RegExp("/api/v1/users/role"),
      RegExp("/api/v1/users/isInvitationRevoked"),
      RegExp("/api/v1/organization/"),
      RegExp("/api/v1/users/"),
      RegExp("/api/v1/organization/create-organization"),
      RegExp("/api/v1/plan/getAllPlans"),
      RegExp("^/api/v1/customPlanRequest"),
      RegExp("^/api/v1/superAdmin/verifyCaptcha"),
      RegExp("/api/v1/subscription/update-payment-status"),
      RegExp("^/api/v1/audit/subscription"),
      RegExp("^/api/v1/cron/expiryReminder"),
      RegExp("^/api/v1/cron/updateSubscriptionStatus"),
      RegExp("^/api/v1/cron/sendMonthlyReport"),
      RegExp("^/api/v1/cron/checkActivity"),
      RegExp("^/api/v1/cron/markUpcomingToActive"),
      RegExp("/api/v1/api-doc"),
      // Public upload routes - no auth required
      RegExp("^/api/v1/public/upload"),
      RegExp("/api/v1/api-doc/.*"),
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

app.use("/api/v1", router);

app.use(errorMiddleware);

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
