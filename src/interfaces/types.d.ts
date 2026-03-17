export interface CustomResponse {
  data: any;
  error: any;
  message: string;
}

export interface CustomeSuccessResponse {
  data: any;
  message: string;
  success: boolean
}

export interface JwtPayload {
  id: number;
  isAdmin: boolean;
  collegeId?: number;
}

export type RequestContext = {
  auth?: JwtPayload;
  tenantCollegeId?: number;
};

interface userInfo {
  userId: string,
  email: string,
  emailVerified: boolean,
  role: Role[],
  auth_time: number,
  organizationId: string | null
}


import { Request } from 'express';
import { Role } from '../entity/Role';
export interface CustomRequest extends Request {
  user?: userInfo;
  apiKey?: {
    apiKeyId: string;
    organisationId: string;
    permissions: string[];
    name: string;
  };
}

// For routes that require authentication, use this type to guarantee user exists
export interface AuthenticatedRequest extends Request {
  user: userInfo; // Required, not optional
  apiKey?: {
    apiKeyId: string;
    organisationId: string;
    permissions: string[];
    name: string;
  };
}



export type VerificationQuery = {
  userId: string,
  date: string
}

