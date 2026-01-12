import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type {
  CreateDefaultOpeningHoursDto,
  UpsertOpeningHourDto,
  UpsertWeeklyOpeningHoursDto,
  PlaceType,
} from "./placetype";

export const placeOpenApi = createApi({
  reducerPath: "placeOpenApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["placeOpen"],
  endpoints: (builder) => ({
    // ✅ GET /placeOpening/{placeId}
    getPlaceOpening: builder.query<PlaceType[], number>({
      query: (placeId) => ({
        url: `/placeOpening/${placeId}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<PlaceType[]>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลดเวลาเปิด-ปิดไม่สำเร็จ"
          );
        }
        return response.result;
      },
    }),
    // ✅ POST /placeOpening/{placeId}  (สร้าง default 7 วัน)
    createDefaultOpening: builder.mutation<
      void,
      { placeId: number; body: CreateDefaultOpeningHoursDto }
    >({
      query: ({ placeId, body }) => ({
        url: `/placeOpening/${placeId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _err, { placeId }) => [
        { type: "placeOpen", id: placeId },
      ],
    }),

    // ✅ PUT /placeOpening/{placeId}/day  (แก้รายวัน)
    upsertOpeningDay: builder.mutation<
      void,
      { placeId: number; body: UpsertOpeningHourDto }
    >({
      query: ({ placeId, body }) => ({
        url: `/placeOpening/${placeId}/day`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, { placeId }) => [
        { type: "placeOpen", id: placeId },
      ],
    }),

    // ✅ PUT /placeOpening/{placeId} (แก้ทั้งสัปดาห์)
    upsertOpeningWeekly: builder.mutation<
      void,
      { placeId: number; body: UpsertWeeklyOpeningHoursDto }
    >({
      query: ({ placeId, body }) => ({
        url: `/placeOpening/${placeId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, { placeId }) => [
        { type: "placeOpen", id: placeId },
      ],
    }),

    // ✅ DELETE /placeOpening/{placeId} (ลบ/รีเซ็ต)
    deleteOpeningByPlace: builder.mutation<void, number>({
      query: (placeId) => ({
        url: `/placeOpening/${placeId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, placeId) => [
        { type: "placeOpen", id: placeId },
      ],
    }),
  }),
});

export const {
  useGetPlaceOpeningQuery,
  useLazyGetPlaceOpeningQuery,
  useCreateDefaultOpeningMutation,
  useUpsertOpeningDayMutation,
  useUpsertOpeningWeeklyMutation,
  useDeleteOpeningByPlaceMutation,
} = placeOpenApi;
