import { RequestHandler, Request, Response } from "express";
import AuthService from "../services/auth.service";
import { makeResponse } from "../common/utils";
import { ValidationFailedError, errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";

class AuthController {
  _authService = new AuthService();

  disableFirebaseUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await this._authService.disableFirebaseUser(
        req.body.userId,
        req.body.isBlocked,
        req.user
      );
      makeResponse(res, 200, true, `User ${req.body.isBlocked ? "blocked" : "unblocked"} successfully`, user);
    } catch (error) {
      errorHandler(res, error);
    }
  };
}

export default AuthController;
