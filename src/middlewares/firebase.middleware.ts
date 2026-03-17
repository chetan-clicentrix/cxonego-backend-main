import { Request, Response, NextFunction, RequestHandler } from "express";
import { unless } from "express-unless";
import * as admin from "firebase-admin";
import { error } from "console";
import { CustomRequest } from "../interfaces/types";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import verifier from "../services/firbaseAuth.service";
import UserServices from "../services/user.service";
import { User } from "../entity/User";

const _usersService = new UserServices();
const verifyToken = async (
  request: CustomRequest,
  _response: Response,
  next: NextFunction
) => {
  if (!request.headers.authorization) {
    // console.error("Missing Authorization header");
    return next({ name: "UnauthorizedError", message: "Missing Authorization header" });
  }

  const parts = request.headers.authorization.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    // console.error("Invalid Authorization header format:", request.headers.authorization);
    return next({ name: "UnauthorizedError", message: "Invalid Authorization header format" });
  }

  const tokenBearer = parts[1].trim();

  if (!tokenBearer || tokenBearer.length < 10) {
    // console.error("Token is empty or too short");
    return next({ name: "UnauthorizedError", message: "Invalid token format" });
  }

  // Check if it looks like a JWT (has 2 dots)
  if ((tokenBearer.match(/\./g) || []).length !== 2) {
    // console.error("Token doesn't appear to be a valid JWT (missing dots)");
    return next({ name: "UnauthorizedError", message: "Malformed token" });
  }
  try {
    const token: DecodedIdToken = await verifier.verifyIdToken(tokenBearer);

    const user = await _usersService.updateSertUser(
      { userId: token.user_id, email: token.email } as User,
      ""
    );

    if (user?.organisation?.organisationId == null) {
      next({
        name: "OrganisationUnregisteredError",
        message:
          "Please complete your onboarding, Organisation is not registered.",
      });
      return;
    } else {
      request.user = {
        userId: token?.user_id as string,
        email: token?.email as string,
        emailVerified: token?.email_verified as boolean,
        role: user?.roles,
        auth_time: token?.auth_time,
        organizationId: user?.organisation?.organisationId,
      };
    }
    next();
  } catch (err: any) {
    console.error("🔴 Firebase token verification failed:", err?.code, err?.message);
    next({ name: "UnauthorizedError", message: "Invalid token" });
  }
};

verifyToken.unless = unless;
export const authMiddleware = () => verifyToken;
