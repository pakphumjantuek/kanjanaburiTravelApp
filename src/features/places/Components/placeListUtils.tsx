import type { PlaceDto } from "../placeTypes";
import { BASE_URL } from "../../../config/env";



export function getCoverImage(place: PlaceDto) {
  const coverImage = place.images?.find((img) => img.isCover);
  const firstImage = place.images?.[0];
  return coverImage || firstImage;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}


export function buildUniqueCategories(places: PlaceDto[]) {
  return [...new Set(places.map((p) => p.categoryName).filter(isNonEmptyString))];
}

export function buildUniqueTags(places: PlaceDto[]) {
  return [...new Set(places.flatMap((p) => p.tags || []))];
}

export function filterPlaces(
  places: PlaceDto[],
  selectedCategory: string | null,
) {
  return places.filter((place) => {
    const categoryMatch = !selectedCategory || place.categoryName === selectedCategory;
    return categoryMatch ;
  });
}
