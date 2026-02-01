
import { BASE_URL } from "../config/env";

const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export function toAbsoluteUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return joinUrl(BASE_URL, path);
}

export function getCoverUrl(dish: any) {
  const cover = dish?.images?.find((x: any) => x.isCover) ?? dish?.images?.[0];
  const p = cover?.imageUrl;
  if (!p) return "";
  return p.startsWith("http") ? p : joinUrl(BASE_URL, p);
}