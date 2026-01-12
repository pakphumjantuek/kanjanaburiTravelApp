import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type {
  UpdateUserInterestsRequest,
  UserInterestDetailsDto,
  UserInterestDto,
} from "./interestTypes";

export const interestApi = createApi({
  reducerPath: "interestApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Interests"],
  endpoints: (builder) => ({
    // ✅ GET /users/interests/me  (ของฉัน)
    getMyInterests: builder.query<UserInterestDto[], void>({
      query: () => ({
        url: "/users/interests/me",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<UserInterestDto[]>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลด interests ไม่สำเร็จ"
          );
        }
        return response.result;
      },
      providesTags: ["Interests"],
    }),

    // ✅ PUT /users/interests (แทนทั้งชุด)
    replaceMyInterests: builder.mutation<UserInterestDto[], UpdateUserInterestsRequest>({
      query: (body) => ({
        url: "/users/interests",
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<UserInterestDto[]>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "บันทึก interests ไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["Interests"],
    }),

    // ✅ POST /users/interests (upsert ทีละตัว)
    upsertMyInterest: builder.mutation<UserInterestDto, UserInterestDto>({
      query: (body) => ({
        url: "/users/interests",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<UserInterestDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "อัปเดต interest ไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["Interests"],
    }),

    // ✅ DELETE /users/interests/{interestKey}
    deleteMyInterest: builder.mutation<void, string>({
      query: (interestKey) => ({
        url: `/users/interests/${encodeURIComponent(interestKey)}`,
        method: "DELETE",
      }),
      transformResponse: () => undefined,
      invalidatesTags: ["Interests"],
    }),

    // ✅ GET /users/interests/{userId}?days=90&top=20  (เจาะรายคน)
    getUserInterestDetails: builder.query<
      UserInterestDetailsDto,
      { userId: number; days?: number; top?: number }
    >({
      query: ({ userId, days = 90, top = 20 }) => ({
        url: `/users/interests/${userId}?days=${days}&top=${top}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<UserInterestDetailsDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลดรายละเอียดความสนใจไม่สำเร็จ"
          );
        }
        return response.result;
      },
      providesTags: (_res, _err, arg) => [{ type: "Interests", id: arg.userId }],
    }),
  }),
});

export const {
  useGetMyInterestsQuery,
  useReplaceMyInterestsMutation,
  useUpsertMyInterestMutation,
  useDeleteMyInterestMutation,
  useGetUserInterestDetailsQuery, // ✅ เพิ่ม export
} = interestApi;
