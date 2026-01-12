import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { CreateBehaviorLogRequest } from "./behaviorTypes";
import type { RootState } from "../../redux/store";

export const behaviorApi = createApi({
  reducerPath: "behaviorApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Recommendation", "Behavior", "ModelStatus"],
  endpoints: (builder) => ({
    logBehavior: builder.mutation<
      { isSuccess: boolean; duplicated?: boolean },
      CreateBehaviorLogRequest
    >({
      query: (body) => ({
        url: "/behavior",
        method: "POST",
        body,
      }),

      // ✅ RN: ไม่ใช้ localStorage
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          await queryFulfilled;
          const state = getState() as unknown as RootState;
          const hasToken = !!state.auth.accessToken;

          if (hasToken) {
            dispatch(
              behaviorApi.util.invalidateTags(["Behavior", "Recommendation"])
            );
          }
        } catch {
        }
      },
    }),
  }),
});

export const { useLogBehaviorMutation } = behaviorApi;
