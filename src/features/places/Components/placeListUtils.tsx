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

function toAbsoluteUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // รองรับทั้ง "/uploads/..." และ "uploads/..."
  return path.startsWith("/") ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
}

export function getPlaceImageUrl(place: PlaceDto) {
  const cover = getCoverImage(place);
  const url = cover?.imageUrl ? toAbsoluteUrl(cover.imageUrl) : "";
  return url || "https://via.placeholder.com/400x300?text=No+Image";
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
