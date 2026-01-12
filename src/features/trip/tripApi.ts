import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "../../api/ApiResponse";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { PagedResult } from "../../interfaces/PagedResult";
import type {
  AddTripItemRequest,
  CreateTripRequest,
  ReorderTripItemsRequest,
  TripDetailDto,
  TripDto,
  TripItemDto,
  TripSegmentDto,
  UpdateTripItemRequest,
  AutoTripRequest,
  AutoTripResponse,
  TripMapViewDto,
} from "./tripTypes";

// --------------------------------------------------

export const tripApi = createApi({
  reducerPath: "tripApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["trip"],
  endpoints: (builder) => ({
    // ===== Trips =====
    getAllTrips: builder.query<
      PagedResult<TripDto>,
      { page: number; pageSize: number; search?: string }
    >({
      query: ({ page, pageSize, search }) => ({
        url: "/trip",
        method: "GET",
        params: { page, pageSize, search },
      }),
      transformResponse: (response: ApiResponse<PagedResult<TripDto>>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดทริปไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["trip"],
    }),

    getTripById: builder.query<TripDto, number>({
      query: (id) => ({
        url: `/trip/${id}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<TripDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "โหลดทริปไม่สำเร็จ");
        }
        return response.result;
      },
      providesTags: ["trip"],
    }),

    getTripDetail: builder.query<TripDetailDto, number>({
      query: (id) => ({
        url: `/trip/${id}/detail`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<TripDetailDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "โหลดรายละเอียดทริปไม่สำเร็จ"
          );
        }
        return response.result;
      },
      providesTags: ["trip"],
    }),

    createTrip: builder.mutation<TripDto, CreateTripRequest>({
      query: (body) => ({
        url: "/trip",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<TripDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "สร้างทริปไม่สำเร็จ");
        }
        return response.result;
      },
      invalidatesTags: ["trip"],
    }),

    updateTrip: builder.mutation<
      TripDto,
      { id: number; body: CreateTripRequest }
    >({
      query: ({ id, body }) => ({
        url: `/trip/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<TripDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(response.errorMessages?.[0] ?? "แก้ไขทริปไม่สำเร็จ");
        }
        return response.result;
      },
      invalidatesTags: ["trip"],
    }),

    deleteTrip: builder.mutation<void, number>({
      query: (id) => ({
        url: `/trip/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["trip"],
    }),

    // ===== TripItems =====
    addTripItem: builder.mutation<
      TripItemDto,
      { tripId: number; body: AddTripItemRequest }
    >({
      query: ({ tripId, body }) => ({
        url: `/trip/${tripId}/items`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<TripItemDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "เพิ่มสถานที่ลงทริปไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["trip"],
    }),

    updateTripItem: builder.mutation<
      TripItemDto,
      { tripId: number; tripItemId: number; body: UpdateTripItemRequest }
    >({
      query: ({ tripId, tripItemId, body }) => ({
        url: `/trip/${tripId}/items/${tripItemId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<TripItemDto>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "แก้ไขรายการทริปไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["trip"],
    }),

    deleteTripItem: builder.mutation<
      void,
      { tripId: number; tripItemId: number }
    >({
      query: ({ tripId, tripItemId }) => ({
        url: `/trip/${tripId}/items/${tripItemId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["trip"],
    }),

    reorderTripItems: builder.mutation<
      void,
      { tripId: number; body: ReorderTripItemsRequest }
    >({
      query: ({ tripId, body }) => ({
        url: `/trip/${tripId}/reorder`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["trip"],
    }),
    getTripSegments: builder.query<
      TripSegmentDto[],
      { tripId: number; dayIndex: number }
    >({
      query: ({ tripId, dayIndex }) => ({
        url: `/trip/${tripId}/segments`,
        method: "GET",
        params: { dayIndex },
      }),
      transformResponse: (res: ApiResponse<TripSegmentDto[]>) => {
        if (!res.isSuccess || !res.result) {
          throw new Error(
            res.errorMessages?.[0] ?? "โหลดเส้นทางของวันไม่สำเร็จ"
          );
        }
        return res.result;
      },
      providesTags: ["trip"],
    }),

    saveRoute: builder.mutation<
      void,
      {
        tripId: number;
        body: {
          dayIndex: number;
          transportMode: string;
          totalDistanceKm: number;
          totalTravelMinutes: number;
          polyline?: number[][];
        };
      }
    >({
      query: ({ tripId, body }) => ({
        url: `/trip/${tripId}/save-route`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["trip"],
    }),
    generateAutoTrip: builder.mutation<AutoTripResponse, AutoTripRequest>({
      query: (body) => ({
        url: "/trip/generate",
        method: "POST",
        body: {
          startDateTime: body.startDateTime,
          days: body.days ?? 1,
          hoursPerDay: body.hoursPerDay ?? 8,
          startLat: body.startLat ?? null,
          startLng: body.startLng ?? null,
          transportMode: body.transportMode ?? "driving",

          // ✅ ส่ง preference
          preferredTagNames: body.preferredTagNames ?? [],
          relaxedPace: body.relaxedPace ?? 0.5,
          budgetLevel: body.budgetLevel ?? 0.5,
          withElderOrKids: body.withElderOrKids ?? false,
        },
      }),
      transformResponse: (response: ApiResponse<AutoTripResponse>) => {
        if (!response.isSuccess || !response.result) {
          throw new Error(
            response.errorMessages?.[0] ?? "สร้างทริปอัตโนมัติไม่สำเร็จ"
          );
        }
        return response.result;
      },
      invalidatesTags: ["trip"],
    }),
    getTripMap: builder.query<
      TripMapViewDto,
      { tripId: number; dayIndex: number; transportMode?: string }
    >({
      query: ({ tripId, dayIndex, transportMode = "driving" }) => ({
        url: `/Trip/${tripId}/map?dayIndex=${dayIndex}&transportMode=${transportMode}`,
        method: "GET",
      }),
      transformResponse: (response: any) => {
        // ของคุณเป็น ApiResponse
        if (!response?.isSuccess || !response?.result) {
          throw new Error(
            response?.errorMessages?.[0] ?? "โหลดแผนที่ไม่สำเร็จ"
          );
        }
        return response.result as TripMapViewDto;
      },
    }),
  }),
});

export const {
  useGetAllTripsQuery,
  useGetTripByIdQuery,
  useGetTripDetailQuery,

  useCreateTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation,

  useAddTripItemMutation,
  useUpdateTripItemMutation,
  useDeleteTripItemMutation,
  useReorderTripItemsMutation,

  useGetTripSegmentsQuery,
  useSaveRouteMutation,
  useGenerateAutoTripMutation,
  useGetTripMapQuery,
} = tripApi;
