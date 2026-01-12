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
