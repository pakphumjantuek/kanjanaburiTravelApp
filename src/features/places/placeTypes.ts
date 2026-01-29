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
  averageRating?: number;
  reviewCount?: number;

  categories: string[];
  tags: string[];
  images: PlaceImageDto[];

  distanceKm?: number | null;
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

export type UpsertPlaceDishPayload = {
  dishId: number;
  price?: number | null;
  isAvailable: boolean;
};

// รายการเมนูของร้าน (ตอนอ่านกลับ)
export type DishForPlaceDto = {
  dishId: number;
  nameTH: string;
  nameEN?: string | null;
  spicyLevel: number;
  isHalal: boolean;
  isVegetarian: boolean;
  price?: number | null;
  isAvailable: boolean;
  coverImageUrl?: string | null;
};
