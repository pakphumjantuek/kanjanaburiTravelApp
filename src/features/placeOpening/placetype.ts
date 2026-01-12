export interface PlaceType {
  openingHourId: number;
  placeId: number;
  dayOfWeek: number;   // 0 = Sunday, 6 = Saturday
  openTime: string;    // "09:00:00"
  closeTime: string;   // "18:00:00"
  isClosed: boolean;
}

export interface CreateDefaultOpeningHoursDto {
  openTime: string;   // "09:00"
  closeTime: string;  // "18:00"
}

export interface UpsertOpeningHourDto {
  dayOfWeek: number;  // 0-6
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface UpsertWeeklyOpeningHoursDto {
  items: UpsertOpeningHourDto[];
}

export const dayNames: Record<number, string> = {
  0: "อาทิตย์",
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัส",
  5: "ศุกร์",
  6: "เสาร์",
};
