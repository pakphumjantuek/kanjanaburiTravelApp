export type RecommendStatus = {
  model: {
    path: string;
    exists: boolean;
    lastWriteUtc: string | null;
    lastTrainedAtUtc: string | null;
  };
  training?: {
    isTraining: boolean;
    lastAttemptUtc: string | null;
    lastSuccessUtc: string | null;
    lastRows: number | null;
    lastMessage: string | null;
  };
};

export type ActionCountDto = { actionType: string; count: number };

export type TopUserDto = { userId: number; displayName: string;  anonymousId ?: string | null; logs: number; uniquePlaces: number };

export type TopPlaceDto = {
  placeId: number;
  anonymousId ?: string | null;
  displayName : string;
  name?: string | null;
  logs: number;
  uniqueUsers: number;
};

export type DailyActions = {
  dateUtc: string;
  actionType: string;
  count : number;
};

export type Daily = {
  dateUtc: string;
  totalLogs: number;
  placeLogs : number;
  searchLogs : number;
  rowsTrainable : number;
};

export type TrainingStatsDto = {
  days: number;
  sinceUtc: string;
  totalLogs: number;
  placeLogs: number;
  searchLogs: number;
  uniqueUsers: number;
  uniquePlaces: number;
  rowsTrainable: number;
  actions: ActionCountDto[];
  topUsers: TopUserDto[];
  topPlaces: TopPlaceDto[];
  dailyActions: DailyActions[];
  daily: Daily[];
  trainableRate: number;
};
