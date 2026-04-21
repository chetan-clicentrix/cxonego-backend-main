import { buildResponse } from "../common/utils";
import { AnyZodObject } from "zod";
import { NextFunction, Request, Response } from "express";

export const bodySchemaValidator = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      res.status(400).send(buildResponse(null, "failure", error.issues));
    }
  };
};

export const queryParamsValidator = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.query);
      return next();
    } catch (error) {
      res.status(400).send(buildResponse(null, "failure", error.issues));
    }
  };
};
