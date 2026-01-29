export interface LocalDishType {
    dishId?: number;
    nameTH: string;
    nameEN: string;
    description: string;
    origin: string;
    spicyLevel: number;
    isHalal: boolean;
    isVegetarian: boolean;
    isActive: boolean;
    images: LocalDishImageDto[];
}

export interface CreateLocalDishPayload {
    nameTH: string;
    nameEN: string;
    description: string;
    origin: string;
    spicyLevel: number;
    isHalal: boolean;
    isVegetarian: boolean;
    isActive: boolean;
}

export interface LocalDishImageDto {
  imageId: number;
  imageUrl: string;
  isCover: boolean;
}

export type PlaceForDishDto = {
  placeId: number;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;

  price?: number | null;
  isAvailable: boolean;

  averageRating?: number;
  reviewCount?: number;

  coverImageUrl?: string | null;
};