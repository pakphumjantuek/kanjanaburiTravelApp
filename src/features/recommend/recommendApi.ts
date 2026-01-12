import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { RecommendStatus, TrainingStatsDto } from "./recommendTypes";

export const recommendApi = createApi({
  reducerPath: "recommendApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["RecommendStatus", "TrainingStats"],
  endpoints: (builder) => ({
    // GET /api/recommend/status
    getRecommendStatus: builder.query<RecommendStatus, void>({
      query: () => ({
        url: "/recommend/status",
        method: "GET",
      }),
      transformResponse: (res: any) => {
        if (!res?.isSuccess)
          throw new Error(res?.message ?? "โหลดสถานะโมเดลไม่สำเร็จ");
        return res as RecommendStatus;
      },
      providesTags: ["RecommendStatus"],
    }),

    // GET /api/recommend/training-stats?days=90
    getTrainingStats: builder.query<TrainingStatsDto, { days?: number } | void>(
      {
        query: (q) => ({
          url: "/recommend/training-stats",
          method: "GET",
          params: { days: q?.days ?? 90 },
        }),
        transformResponse: (res: any) => {
          if (!res?.isSuccess || !res?.stats)
            throw new Error(res?.message ?? "โหลดสถิติเทรนไม่สำเร็จ");
          return res.stats as TrainingStatsDto;
        },
        providesTags: ["TrainingStats"],
      }
    ),

    // POST /api/recommend/retrain?days=90&minRows=20
    retrainNow: builder.mutation<
      { rows: number },
      { days?: number; minRows?: number }
    >({
      query: (q) => ({
        url: "/recommend/retrain",
        method: "POST",
        params: { days: q.days ?? 90, minRows: q.minRows ?? 20 },
      }),
      transformResponse: (res: any) => {
        if (!res?.isSuccess) {
          throw new Error(res?.message ?? "เทรนโมเดลไม่สำเร็จ");
        }
        return { rows: res.rows ?? 0 };
      },
      invalidatesTags: ["RecommendStatus", "TrainingStats"],
    }),
  }),
});

export const {
  useGetRecommendStatusQuery,
  useGetTrainingStatsQuery,
  useRetrainNowMutation,
} = recommendApi;
