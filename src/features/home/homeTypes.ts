
export type HomeSectionDto = {
  key: string;
  title: string;
  items: PlaceRecommendDto[];
};

export type HomeResponseDto = {
  isSuccess: boolean;
  sections: HomeSectionDto[];
};

export type PlaceRecommendDto = {
  placeId: number;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;

  placeType?: string | null;
  popularityScore: number;

  categoryName?: string | null;
  tags: string[];

  coverImageUrl?: string | null;

  score: number;
  reasonJson?: string | null;
};