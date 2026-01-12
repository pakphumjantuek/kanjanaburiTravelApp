export type CreateBehaviorLogRequest = {
  placeId?: number | null;
  actionType: "VIEW" | "CLICK" | "ADD_TO_TRIP" | "FAVORITE" | "REVIEW" | "SEARCH";
  actionValue?: number | null;
  metaJson?: string | null;
  clientEventId?: string | null;
  anonymousId?: string | null;
};

export type RecommendStatusDto = {
  path: string;
  exists: boolean;
  lastWriteUtc?: string | null;
  lastTrainedAtUtc?: string | null;
};



