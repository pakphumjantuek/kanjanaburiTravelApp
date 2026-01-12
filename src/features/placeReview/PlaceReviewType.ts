export interface PlaceReviewType {
  placeReviewId: number;
  placeId: number;
  userId: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PlaceReviewCreateType {
  rating: number;
  comment?: string | null;
}
