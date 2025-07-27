import axios from "axios";
import { authEndpoints } from "../apis";
import * as SecureStore from "expo-secure-store";

export const signup = async (name: string, email: string, password: string) => {
  try {
    const response = await axios.post(authEndpoints.REGISTER, {
      name,
      email,
      password,
    });

    const { token } = response.data;

    if (token) {
      await SecureStore.setItemAsync("token", token);
    }

    return response.data;
  } catch (error: unknown) {
    throw new Error(error as string);
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(authEndpoints.LOGIN, {
      email,
      password,
    });

    const { token } = response.data;

    if (token) {
      await SecureStore.setItemAsync("token", token);
    }

    return response.data;
  } catch (error: unknown) {
    throw new Error(error as string);
  }
};

export const getUser = async () => {
  try {
    const response = await axios.get(authEndpoints.FETCH_USER, {
      headers: {
        Authorization: `Bearer ${await SecureStore.getItemAsync("token")}`,
      },
    });

    return response.data.user;
  } catch (error: unknown) {
    throw new Error(error as string);
  }
};

export const logout = async () => {
  try {
    await SecureStore.deleteItemAsync("token");
  } catch (error: unknown) {
    throw new Error(error as string);
  }
};
