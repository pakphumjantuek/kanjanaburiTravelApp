// import { type PlaceCategory } from "./../placeCategory/placeCategoryTypes";
export interface PlaceDto {
  placeId: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;

  avgVisitMinutes?: number;
  priceRange?: number;
  popularityScore: number;
  categoryId?: number;
  categoryName?: string;
  isActive?: boolean;

  categories: string[];
  tags: string[];
  images: PlaceImageDto[];
}

export interface CreatePlaceRequest {
  placeId?: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;

  avgVisitMinutes?: number;
  priceRange?: number;
  isActive?: boolean;
  categoryId?: number;
  tagIds?: number[];
}

export interface PlaceImageDto {
  imageId: number;
  imageUrl: string;
  isCover: boolean;
}
