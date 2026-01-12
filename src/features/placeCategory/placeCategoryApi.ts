import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { PlaceCategory } from "./placeCategoryTypes";
import { PagedResult } from "../../interfaces/PagedResult";

export const placeCategoryApi = createApi({
  reducerPath: "placeCategoryApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["PlaceCategory"],
  endpoints: (builder) => ({
    getAllPlaceCategory : builder.query<
      PagedResult<PlaceCategory>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/placeCategories",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<PlaceCategory>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["PlaceCategory"],
    }),
    getById: builder.query<PlaceCategory, number>({
      query: (id) => ({
        url: `/placeCategories/${id}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<PlaceCategory>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["PlaceCategory"],
    }),
    createPlaceCategory: builder.mutation<void, PlaceCategory>({
      query: (body) => ({
        url: "/placeCategories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PlaceCategory"],
    }),
    updatePlaceCategory: builder.mutation<void, { id: number; body: PlaceCategory }>({
      query: ({ id, body }) => ({
        url: `/placeCategories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PlaceCategory"],
    }),
    deletePlaceCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `/placeCategories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PlaceCategory"],
    }),
  }),
});

export const {
  useGetAllPlaceCategoryQuery,
  useCreatePlaceCategoryMutation,
  useUpdatePlaceCategoryMutation,
  useDeletePlaceCategoryMutation,
} = placeCategoryApi;