import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { PlaceReviewType, PlaceReviewCreateType } from "./PlaceReviewType";

export const placeReviewApi = createApi({
  reducerPath: "placeReviewApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["placeReview"],
  endpoints: (builder) => ({

    // GET: /placeReview/place/{placeId}?skip=0&take=20
    getReviewsByPlace: builder.query<
      PlaceReviewType[],
      { placeId: number; skip?: number; take?: number }
    >({
      query: ({ placeId, skip = 0, take = 20 }) => ({
        url: `/placeReview/place/${placeId}`,
        method: "GET",
        params: { skip, take },
      }),
      transformResponse: (response: ApiResponse<PlaceReviewType[]>) => {
        if (!response.isSuccess) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดรีวิวไม่สำเร็จ");
        }
        return response.result ?? [];
      },
      providesTags: (_res, _err, arg) => [{ type: "placeReview", id: arg.placeId }],
    }),

    // GET: /placeReview/my?placeId=123
    getMyReview: builder.query<PlaceReviewType | null, { placeId: number }>({
      query: ({ placeId }) => ({
        url: `/placeReview/my`,
        method: "GET",
        params: { placeId },
      }),
      transformResponse: (response: ApiResponse<PlaceReviewType | null>) => {
        if (!response.isSuccess) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดรีวิวของฉันไม่สำเร็จ");
        }
        return response.result ?? null;
      },
      providesTags: (_res, _err, arg) => [{ type: "placeReview", id: `my-${arg.placeId}` }],
    }),

    // POST: /placeReview/place/{placeId}
    // body: { rating, comment }
    upsertMyReview: builder.mutation<
      PlaceReviewType,
      { placeId: number; body: PlaceReviewCreateType }
    >({
      query: ({ placeId, body }) => ({
        url: `/placeReview/place/${placeId}`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<PlaceReviewType>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "บันทึกรีวิวไม่สำเร็จ");
        }
        return response.result;
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "placeReview", id: arg.placeId },
        { type: "placeReview", id: `my-${arg.placeId}` },
      ],
    }),

    // DELETE: /placeReview/place/{placeId}
    deleteMyReview: builder.mutation<
      string,
      { placeId: number }
    >({
      query: ({ placeId }) => ({
        url: `/placeReview/place/${placeId}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiResponse<string>) => {
        if (!response.isSuccess) {
          throw new Error(response.errorMessages?.[0] ?? "ลบรีวิวไม่สำเร็จ");
        }
        return response.result ?? "Deleted";
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: "placeReview", id: arg.placeId },
        { type: "placeReview", id: `my-${arg.placeId}` },
      ],
    }),
  }),
});

export const {
  useGetReviewsByPlaceQuery,
  useGetMyReviewQuery,
  useUpsertMyReviewMutation,
  useDeleteMyReviewMutation,
} = placeReviewApi;
