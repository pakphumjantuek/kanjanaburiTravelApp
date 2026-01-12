import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQuery";
import type { HomeResponseDto } from "./homeTypes";

export const homeApi = createApi({
  reducerPath: "homeApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Home"],
  endpoints: (builder) => ({
   
      getHome: builder.query<HomeResponseDto, { topN?: number; lat?: number; lng?: number } | void>({
      query: (arg) => {
        const p = arg ?? {};
        const qs = new URLSearchParams();
        if (p.topN) qs.set("topN", String(p.topN));
        if (p.lat != null) qs.set("lat", String(p.lat));
        if (p.lng != null) qs.set("lng", String(p.lng));

        return { url: `/home${qs.toString() ? `?${qs}` : ""}`, method: "GET" };
      },
      providesTags: ["Home"],
    }),

   
  }),
});

export const {
    useGetHomeQuery,
} = homeApi;
    