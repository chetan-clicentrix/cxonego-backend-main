import { ErrorRequestHandler } from "express";
import { ForbiddenError } from "../common/errors";
import { buildResponse } from "../common/utils";

const errorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.status(401).send("Invalid token");
  } else if (err instanceof ForbiddenError) {
    res.status(403).send(buildResponse(null, err.message, "failure"));
  } else if (err.name === "ZodError") {
    res.status(400).send(buildResponse(null, err.issues, "failure"));
  } else if (err.name === "OrganisationUnregisteredError") {
    res.status(404).send(buildResponse(null, err.message, "failure"));
  } else {
    console.error("[ERROR MIDDLEWARE] Unknown error:", err);
    res
      .status(500)
      .send(buildResponse(null, `Internal Server Error - ${err.message || err}`, "failure"));
  }
  next();
};

export default errorMiddleware;
