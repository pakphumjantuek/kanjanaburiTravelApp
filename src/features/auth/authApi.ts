import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { LoginRequest, RegisterRequest, UserProfile } from "./authTypes";
import type { ApiResponse } from "../../api/ApiResponse";
import { persistAuth, persistClearAuth } from "./authSlice";
import { PagedResult } from "../../interfaces/PagedResult";

type AuthResponse = {
  accessToken: string;
  expiresAt: string;
  user: UserProfile;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Profile"],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<AuthResponse>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "Login failed");
        }
        return response.result; // ✅ result = { accessToken, expiresAt, user }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled; 
          dispatch(
            persistAuth({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: null, 
            }) as any
          );
        } catch {}
      },
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<AuthResponse>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "Register failed");
        }
        return response.result;
      },
     async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // ✅ เซ็ต token/user ก่อน
          await dispatch(
            persistAuth({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: null,
            }) as any
          );
          dispatch(authApi.util.resetApiState());    
        } catch {}
      },
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(persistClearAuth() as any);
          dispatch(authApi.util.resetApiState());
        }
      },
    }),

    getProfile: builder.query<UserProfile, { userid?: number } | void>({
      query: (arg) => ({
        url: arg?.userid
          ? `/users/profile?userid=${arg.userid}`
          : "/users/profile",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<UserProfile>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดโปรไฟล์ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["Profile"],
    }),
    getAllUser: builder.query<
      PagedResult<UserProfile>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/users",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<UserProfile>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดผู้ใช้ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["Profile"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useGetAllUserQuery,
} = authApi;
