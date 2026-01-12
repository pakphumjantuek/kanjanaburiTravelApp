import type { TripDto } from "../tripTypes";

type DayOption = { dayIndex: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;

  placeName: string;

  // Trip list
  trips: TripDto[];
  isTripListLoading: boolean;
  selectedTripId: number | "";
  setSelectedTripId: (v: number | "") => void;

  // Trip detail/day options
  dayIndex: number;
  setDayIndex: (v: number) => void;
  dayOptions: DayOption[];
  isTripDetailLoading: boolean;
  hasTripDates: boolean;
  tripIdNum: number | null;

  // Submit
  isAddingToTrip: boolean;
  onSubmit: () => void;

  // Create trip
  onCreateTrip: () => void;
};

export default function AddToTripModal({
  open,
  onClose,
  placeName,
  trips,
  isTripListLoading,
  selectedTripId,
  setSelectedTripId,
  dayIndex,
  setDayIndex,
  dayOptions,
  isTripDetailLoading,
  hasTripDates,
  tripIdNum,
  isAddingToTrip,
  onSubmit,
  onCreateTrip,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">เพิ่มเข้าทริป</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            ปิด
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          สถานที่: <span className="font-medium text-gray-900">{placeName}</span>
        </div>

        <div className="grid gap-3">
          {/* Trip */}
          <div>
            <label className="text-sm text-gray-700">เลือกทริป</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedTripId === "" ? "" : String(selectedTripId)}
              onChange={(e) =>
                setSelectedTripId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">-- เลือกทริป --</option>
              {isTripListLoading ? (
                <option value="" disabled>
                  กำลังโหลด...
                </option>
              ) : (
                trips.map((t) => (
                  <option key={t.tripId} value={t.tripId}>
                    {t.title}
                  </option>
                ))
              )}
            </select>

            <div className="mt-2 text-xs text-gray-500">
              ยังไม่มีทริป?{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={onCreateTrip}
              >
                สร้างทริปใหม่
              </button>
            </div>
          </div>

          {/* Day */}
          <div>
            <label className="text-sm text-gray-700">เลือกวัน</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={dayIndex}
              onChange={(e) => setDayIndex(Number(e.target.value))}
              disabled={!tripIdNum || dayOptions.length === 0}
            >
              {!tripIdNum && <option value={1}>เลือกทริปก่อน</option>}

              {tripIdNum && dayOptions.length === 0 && (
                <option value={1}>
                  {isTripDetailLoading ? "กำลังโหลด..." : "ทริปนี้ไม่มีช่วงวันที่"}
                </option>
              )}

              {dayOptions.map((d) => (
                <option key={d.dayIndex} value={d.dayIndex}>
                  {d.label}
                </option>
              ))}
            </select>

            {tripIdNum && !isTripDetailLoading && !hasTripDates && (
              <div className="mt-1 text-xs text-amber-600">
                * ทริปนี้ยังไม่ได้ตั้งวันเริ่ม/วันจบ
              </div>
            )}
          </div>

          <button
            disabled={isAddingToTrip || !tripIdNum}
            onClick={onSubmit}
            className="w-full px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {isAddingToTrip ? "กำลังเพิ่ม..." : "เพิ่มเข้าทริป"}
          </button>
        </div>
      </div>
    </div>
  );
}
