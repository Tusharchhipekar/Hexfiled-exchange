import { Router } from "express";
import {
  signinController,
  signupController,
} from "../controllers/auth.controller";

export const authRoutes = Router();

authRoutes.post("/signup", signupController);

authRoutes.post("/signin", signinController);
