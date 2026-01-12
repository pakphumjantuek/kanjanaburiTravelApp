// type PlaceLite = {
//   placeId: number;
//   name: string;
//   openTime?: string | null;   // "08:00:00" หรือ "08:00"
//   closeTime?: string | null;
//   avgVisitMinutes?: number | null;
// };

// type TripItemLite = {
//   tripItemId: number;
//   placeId: number;
//   dayIndex: number;
//   orderIndex: number;
// };

// type SegmentLite = {
//   fromTripItemId: number;
//   toTripItemId: number;
//   travelMinutes: number;
//   distanceKm: number;
// };

// export type TimelineRow = {
//   tripItemId: number;
//   placeId: number;
//   name: string;

//   arriveAt: Date;
//   departAt: Date;

//   stayMinutes: number;
//   travelFromPrevMinutes: number;

//   openAt?: Date;
//   closeAt?: Date;

//   status: "ok" | "arrive_before_open" | "arrive_after_close";
// };

// const toHHMM = (t?: string | null) => {
//   if (!t) return null;
//   // "08:00:00" -> "08:00"
//   return t.length >= 5 ? t.substring(0, 5) : t;
// };

// const atDayTime = (day: Date, hhmm: string) => {
//   const [hh, mm] = hhmm.split(":").map(Number);
//   const d = new Date(day);
//   d.setHours(hh || 0, mm || 0, 0, 0);
//   return d;
// };

// // date ของ “Day N” (ใช้วันนี้เป็น base หรือวันเริ่มทริปถ้ามี)
// export function buildTimeline(params: {
//   dayBaseDate: Date; // วันที่ของ day ที่เลือก
//   startTimeHHMM?: string; // เวลาออกเริ่มต้น เช่น "09:00"
//   items: TripItemLite[];
//   places: Map<number, PlaceLite>;
//   segments: SegmentLite[]; // ถ้ามีจาก backend; ถ้าไม่มีจะใช้ 0
// }) {
//   const {
//     dayBaseDate,
//     startTimeHHMM = "09:00",
//     items,
//     places,
//     segments,
//   } = params;

//   const segMap = new Map<string, SegmentLite>();
//   for (const s of segments) {
//     segMap.set(`${s.fromTripItemId}->${s.toTripItemId}`, s);
//   }

//   const startAt = atDayTime(dayBaseDate, startTimeHHMM);
//   let cursor = new Date(startAt);

//   const rows: TimelineRow[] = [];

//   for (let i = 0; i < items.length; i++) {
//     const it = items[i];
//     const p = places.get(it.placeId);

//     const prev = items[i - 1];
//     let travelMin = 0;

//     if (prev) {
//       const seg = segMap.get(`${prev.tripItemId}->${it.tripItemId}`);
//       travelMin = seg?.travelMinutes ?? 0;
//       cursor = new Date(cursor.getTime() + travelMin * 60 * 1000);
//     }

//     const arriveAt = new Date(cursor);

//     const stayMinutes = Math.max(10, p?.avgVisitMinutes ?? 60); // default 60 นาที
//     const departAt = new Date(arriveAt.getTime() + stayMinutes * 60 * 1000);

//     const openHHMM = toHHMM(p?.openTime);
//     const closeHHMM = toHHMM(p?.closeTime);

//     const openAt = openHHMM ? atDayTime(dayBaseDate, openHHMM) : undefined;
//     const closeAt = closeHHMM ? atDayTime(dayBaseDate, closeHHMM) : undefined;

//     let status: TimelineRow["status"] = "ok";
//     if (openAt && arriveAt < openAt) status = "arrive_before_open";
//     if (closeAt && arriveAt > closeAt) status = "arrive_after_close";

//     rows.push({
//       tripItemId: it.tripItemId,
//       placeId: it.placeId,
//       name: p?.name ?? `Place #${it.placeId}`,
//       arriveAt,
//       departAt,
//       stayMinutes,
//       travelFromPrevMinutes: travelMin,
//       openAt,
//       closeAt,
//       status,
//     });

//     cursor = new Date(departAt);
//   }

//   const totalStay = rows.reduce((a, r) => a + r.stayMinutes, 0);
//   const totalTravel = rows.reduce((a, r) => a + r.travelFromPrevMinutes, 0);

//   return { rows, totalStay, totalTravel, startAt };
// }

// export const fmtHHMM = (d: Date) =>
//   d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
