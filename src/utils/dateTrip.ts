// src/utils/dateTrip.ts
export const parseIso = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysInclusive = (start: Date, end: Date) => {
  const ms = sod(end).getTime() - sod(start).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 86400000) + 1;
};

export const thDate = (d: Date) =>
  d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

export const buildDayOptions = (start: Date, end: Date) => {
  const total = daysInclusive(start, end);
  return Array.from({ length: total }, (_, i) => {
    const di = i + 1;
    const date = addDays(sod(start), i);
    return { dayIndex: di, label: `วันที่ ${di} • ${thDate(date)}` };
  });
};
