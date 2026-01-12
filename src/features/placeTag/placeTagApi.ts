import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { PlaceTagDto } from "./placeTagTypes";
import { PagedResult } from "../../interfaces/PagedResult";


export const placeTagApi = createApi({
  reducerPath: "placeTagApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["placeTag"],
  endpoints: (builder) => ({
    getAllPlaceTag : builder.query<
      PagedResult<PlaceTagDto>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/placeTag",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<PlaceTagDto>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["placeTag"],
    }),
    getById: builder.query<PlaceTagDto, number>({
      query: (id) => ({
        url: `/placeTag/${id}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<PlaceTagDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["placeTag"],
    }),
    createPlaceTag: builder.mutation<void, PlaceTagDto>({
      query: (body) => ({
        url: "/placeTag",
        method: "POST",
        body,
      }),
      invalidatesTags: ["placeTag"],
    }),
    updatePlaceTag: builder.mutation<void, { id: number; body: PlaceTagDto }>({
      query: ({ id, body }) => ({
        url: `/placeTag/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["placeTag"],
    }),
    deletePlaceTag: builder.mutation<void, number>({
      query: (id) => ({
        url: `/placeTag/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["placeTag"],
    }),
  }),
});

export const {
  useGetAllPlaceTagQuery,
  useCreatePlaceTagMutation,
  useUpdatePlaceTagMutation,
  useDeletePlaceTagMutation,
} = placeTagApi;