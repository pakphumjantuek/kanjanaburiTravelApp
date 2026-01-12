export interface UserInterestDto {
  interestKey: string; // "food" | "culture" | ...
  weight: number; // 0..1
  displayName: string; // ✅ ใหม่
}

export interface UpdateUserInterestsRequest {
  items: Array<Pick<UserInterestDto, "interestKey" | "weight">>;
}

export type UserInterestItemDto = {
  interestKey: string;
  weight: number;
  updatedAtUtc: string;
  displayName: string; // ✅ ใหม่
};

export type UserInterestDetailsDto = {
  userId: number;
  days: number;
  sinceUtc: string;
  topInterests: UserInterestItemDto[];
  actionCounts: Record<string, number>;
  topPlaceIds: number[];
  topPlaces: TopPlace[]; // ✅ camelCase
};

export interface TopPlace {
  placeId: number; 
  name: string; 
  categoryName: string;
  coverImageUrl?: string;
  score?: number;
}