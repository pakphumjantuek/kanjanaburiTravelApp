import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { PagedResult } from "../../interfaces/PagedResult";
import type { roleDto } from "./roleTypes";

export const roleApi = createApi({
  reducerPath: "roleApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Role"],
  endpoints: (builder) => ({
    getAllRole: builder.query<
      PagedResult<roleDto>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/role",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<roleDto>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดสิทธิ์ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["Role"],
    }),
    createRole: builder.mutation<void, roleDto>({
      query: (body) => ({
        url: "/role",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Role"],
    }),
    updateRole: builder.mutation<void, { id: number; body: roleDto }>({
      query: ({ id, body }) => ({
        url: `/role/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Role"],
    }),
    deleteRole: builder.mutation<void, number>({
      query: (id) => ({
        url: `/role/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),
  }),
});

export const {
  useGetAllRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi;
