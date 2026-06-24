import { Request, Response, NextFunction } from "express";
import ApiError from "../errors/ApiError.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Something went wrong!";
  let errorSources: Array<{ path: string | number; message: string }> = [];

  // Handle our Custom API Errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle standard JavaScript Errors
  else if (err instanceof Error) {
    message = err.message;
  }

  console.error("❌ Backend Error Context:", err);

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  });
};
