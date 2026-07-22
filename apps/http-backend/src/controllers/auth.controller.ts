import type { Request, Response } from "express";
import { SignupApiRequestSchema, SigninApiRequestSchema } from "@repo/types";
import prisma from "@repo/db-prisma";
import { config } from "../configs/config";
import jwt from "jsonwebtoken";

export const signupController = async (req: Request, res: Response) => {
  const result = SignupApiRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "invalid credentials",
    });
    return;
  }

  const { username, password, email } = result.data;

  try {
    const userExists = await prisma.user.findUnique({
      where: { username },
    });

    if (userExists) {
      res.status(400).json({
        message: "user already exists",
      });
      return;
    }

    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
    });

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });

    const token = jwt.sign({ id: newUser.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      message: "user created successfully",
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "internal server error",
    });
  }
};

export const signinController = async (req: Request, res: Response) => {
  const result = SigninApiRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "invalid credentials",
    });
    return;
  }

  const { username, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({
        message: "invalid username or password",
      });
      return;
    }

    const isPasswordValid = await Bun.password.verify(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "invalid username or password",
      });
      return;
    }

    const token = jwt.sign({ id: user.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      message: "signed in successfully",
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      message: "internal server error",
    });
  }
};
