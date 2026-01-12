import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";
import type { RootState } from "../redux/store";
import { persistAuth, persistClearAuth } from "../features/auth/authSlice";
import { getRefreshToken, setAccessToken, setRefreshToken } from "../utils/tokenStorage";

// ✅ API base url
const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ??
  "http://10.103.0.17/cs67/reactnative/boat/api";

// รูปแบบ response ของคุณ
type ApiResponse<T> = {
  isSuccess: boolean;
  result?: T;
  errorMessages: string[];
};

type LoginResult = {
  auth: {
    accessToken: string;
    expiresAt: string;
    user: any; // ใส่ type UserProfile ก็ได้
  };
  refreshToken: string;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;

    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    return headers;
  },
});

let refreshingPromise: Promise<any> | null = null;

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === "string" ? args : (args.url ?? "");

    // กันลูป refresh เอง
    if (url.includes("/auth/refresh")) {
      api.dispatch(persistClearAuth() as any);
      return result;
    }

    // ✅ lock กันยิง refresh ซ้อน
    if (!refreshingPromise) {
      refreshingPromise = (async () => {
        const refreshToken =
          (api.getState() as RootState).auth.refreshToken ?? (await getRefreshToken());

        if (!refreshToken) return { ok: false };

        const refreshRes = await rawBaseQuery(
          {
            url: "/auth/refresh",
            method: "POST",
            body: { refreshToken }, // ✅ ให้ตรงกับ API ของคุณ
          },
          api,
          extraOptions
        );

        const data = refreshRes.data as ApiResponse<LoginResult> | undefined;

        if (data?.isSuccess && data.result) {
          const newAccessToken = data.result.auth.accessToken;
          const newRefreshToken = data.result.refreshToken;

          // update store + storage
          await Promise.all([setAccessToken(newAccessToken), setRefreshToken(newRefreshToken)]);
          api.dispatch(
            persistAuth({
              user: data.result.auth.user,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            }) as any
          );

          return { ok: true };
        }

        return { ok: false };
      })().finally(() => {
        refreshingPromise = null;
      });
    }

    const refreshOk = await refreshingPromise;

    if (refreshOk?.ok) {
      // retry request เดิม
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(persistClearAuth() as any);
    }
  }

  return result;
};
