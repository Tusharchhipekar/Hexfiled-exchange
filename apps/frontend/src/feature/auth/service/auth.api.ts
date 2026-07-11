import axios from "axios";
import type { AuthResponse } from "../../shared/types";

const authApiInstance = axios.create({
  baseURL: "/api/v1/auth",
  withCredentials: true,
});

export const signin = async (payload: {
  username: string;
  password: string;
}) => {
  try {
    const response = await authApiInstance.post<AuthResponse>(
      "/signin",
      payload,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error.response?.data;
    }
    throw error;
  }
};

export const signup = async (payload: {
  name?: string;
  username: string;
  password: string;
}) => {
  try {
    const response = await authApiInstance.post<AuthResponse>(
      "/signup",
      payload,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error.response?.data;
    }
    throw error;
  }
};
