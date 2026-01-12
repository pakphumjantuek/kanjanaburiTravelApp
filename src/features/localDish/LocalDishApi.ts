import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { CreateLocalDishPayload, LocalDishType } from "./LocalDishType";
import { PagedResult } from "../../interfaces/PagedResult";

export type RNFile = {
  uri: string;
  name: string;
  type: string;
};

export const localDishApi = createApi({
  reducerPath: "localDishApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["LocalDish"],
  endpoints: (builder) => ({
    getAllLocalDish: builder.query<
      PagedResult<LocalDishType>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/localDish",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<LocalDishType>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ"
          );
        }
        return response.result;
        },
        providesTags: ["LocalDish"],
    }),

    getById: builder.query<LocalDishType, number>({
      query: (id) => ({ url: `/localDish/${id}`, method: "GET" }),
      transformResponse: (response: ApiResponse<LocalDishType>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลดสถานที่ไม่สำเร็จ"
          );
        }
        return response.result;
      },
      providesTags: ["LocalDish"],
    }),

    // ✅ แนะนำให้ create คืน PlaceDto เพื่อเอา placeId ไปอัปโหลดรูป
    createLocalDish: builder.mutation<LocalDishType, CreateLocalDishPayload>({
      query: (body) => ({ url: "/localDish", method: "POST", body }),
      transformResponse: (response: ApiResponse<LocalDishType>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "เพิ่มอาหารพื้นถิ่นไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["LocalDish"],
    }),

    updateLocalDish: builder.mutation<
      void,
      { dishId: number; body: CreateLocalDishPayload }
    >({
      query: ({ dishId, body }) => ({ url: `/localDish/${dishId}`, method: "PUT", body }),
      invalidatesTags: ["LocalDish"],
    }),

    deleteLocalDish: builder.mutation<void, number>({
      query: (dishId) => ({ url: `/localDish/${dishId}`, method: "DELETE" }),
      invalidatesTags: ["LocalDish"],
    }),

    UploadLocalDishImagesBatch: builder.mutation<
      void,
      {
        dishId: number;
        files: RNFile[];
        coverIndex: number;
        replaceOld: boolean;
      }
    >({
      query: ({ dishId, files, coverIndex, replaceOld }) => {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f as any));
        formData.append("coverIndex", String(coverIndex));
        formData.append("replaceOld", String(replaceOld));

        return {
          url: `/localDish/${dishId}/images/batch`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["LocalDish"],
    }),

    // ✅ Delete image
    DeleteLocalDishImage: builder.mutation<
      void,
      { dishId: number; imageId: number }
    >({
      query: ({ dishId, imageId }) => ({
        url: `/localDish/${dishId}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LocalDish"],
    }),
  }),
});

export const {
  useGetAllLocalDishQuery,
  useGetByIdQuery,
  useCreateLocalDishMutation,
  useUpdateLocalDishMutation,
  useDeleteLocalDishMutation,
  useUploadLocalDishImagesBatchMutation,
  useDeleteLocalDishImageMutation,
} = localDishApi;
