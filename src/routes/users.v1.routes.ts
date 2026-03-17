import { Router } from "express";
import UserController from "../controllers/user.controller";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import {
  profileSchema,
  inviteUserSchema,
  addRoleToUserSchema,
  deleteRoleSchema,
  updateUserRoleSchema,
  updateUserProfileSchema,
  isIinvitationRevokedSchema,
  createUserDirectlySchema,
} from "../schemas/user.schemas";
const userRouter = Router();
const userController = new UserController();


userRouter.post(
  "/create",
  bodySchemaValidator(createUserDirectlySchema),
  userController.createUserDirectly
);

userRouter.get("/", userController.getUsers);
userRouter.get("/getUsersSubscriptions", userController.getUsersSubscriptions);

userRouter.post("/isUserOnboarded", userController.isUserOnboarded);
userRouter.post(
  "/isInvitationRevoked",
  bodySchemaValidator(isIinvitationRevokedSchema),
  userController.isInvitationRevoked
);
userRouter.get("/:userId", userController.getUserById);

userRouter.post(
  ["/", ""],
  //bodySchemaValidator(UpdateProfileSchema),
  userController.updateSertUser
);

userRouter.post(
  "/invite",
  bodySchemaValidator(inviteUserSchema),
  userController.inviteUser
);

userRouter.put(
  "/update/:userId",
  bodySchemaValidator(profileSchema),
  userController.updateProfile
);

userRouter.post(
  "/add-role",
  bodySchemaValidator(addRoleToUserSchema),
  userController.addUserRole
);

userRouter.post(
  "/remove-role",
  bodySchemaValidator(deleteRoleSchema),
  userController.deleteUserRole
);

userRouter.patch("/update/:userId", userController.partiallyUpadateUser);

//get users for dropdown on dashboards
userRouter.get(
  "/organization/userslist/:userId",
  userController.getAllUserDataOrgnizationWise
);

userRouter.post("/adduser", userController.addUserDetails);

userRouter.post(
  "/updateUserRole",
  bodySchemaValidator(updateUserRoleSchema),
  userController.updateUserRole
);

userRouter.post(
  "/updateUserProfile/:userId",
  bodySchemaValidator(updateUserProfileSchema),
  userController.updateUserProfile
);

export default userRouter;
