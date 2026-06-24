import { Response } from "express";

type IMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPage?: number;
};

type ApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: IMeta;
  data?: T | null;
};

const sendResponse = <T>(res: Response, responseData: ApiResponse<T>): void => {
  res.status(responseData.statusCode).json({
    success: responseData.success,
    message: responseData.message || "Request handled successfully.",
    meta: responseData.meta || null || undefined,
    data: responseData.data || null,
  });
};

export default sendResponse;
