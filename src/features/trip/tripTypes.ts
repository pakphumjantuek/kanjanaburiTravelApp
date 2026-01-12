// ---- Types (แนะนำแยกไฟล์ tripTypes.ts ก็ได้) ----
export type TripDto = {
  tripId: number;
  userId: number;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  startLat?: number;
  startLng?: number;
  createdAt?: string;
  updatedAt?: string | null;
};

export type TripItemDto = {
  tripItemId: number;
  tripId: number;
  placeId: number;
  dayIndex: number;
  orderIndex: number;
  plannedArrivalTime?: string | null;
  plannedDurationMinutes?: number | null;
  notes?: string | null;
};

export type TripSegmentDto = {
  tripSegmentId: number;
  tripId: number;
  fromTripItemId: number;
  toTripItemId: number;
  distanceKm: number;
  travelMinutes: number;
  transportMode: string;
  routePolyline?: string | null;
};

export type TripDetailDto = TripDto & {
  items: TripItemDto[];
  segments: TripSegmentDto[];
};

// ---- Requests ----
export type CreateTripRequest = {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  startLat?: number;
  startLng?: number;
};

export type AddTripItemRequest = {
  placeId: number;
  dayIndex: number;
  orderIndex: number;
  plannedArrivalTime?: string | null;
  plannedDurationMinutes?: number | null;
  notes?: string | null;
};

export type UpdateTripItemRequest = {
  dayIndex: number;
  orderIndex: number;
  plannedArrivalTime?: string | null;
  plannedDurationMinutes?: number | null;
  notes?: string | null;
};

export type ReorderTripItemsRequest = {
  dayIndex: number;
  items: Array<{ tripItemId: number; orderIndex: number }>;
};

// ---- AutoTrip ----
export type TransportMode = "driving" | "walking" | "cycling";

export type AutoTripRequest = {
  startDateTime: string;
  days?: number;
  hoursPerDay?: number;
  startLat?: number | null;
  startLng?: number | null;
  transportMode?: TransportMode;

  // ✅ preference (ใหม่)
  preferredTagNames?: string[];   // เช่น ["เล่นน้ำ","น้ำตก"]
  relaxedPace?: number;           // 0..1
  budgetLevel?: number;           // 0..1
  withElderOrKids?: boolean;
};

// ถ้า backend คืน TripDto
export type AutoTripResponse = TripDto;

export type TripMapViewDto = {
  tripId: number;
  title: string;
  dayIndex: number;
  stops: Array<{
    tripItemId: number;
    placeId: number;
    orderIndex: number;
    name: string;
    latitude: number;
    longitude: number;
    type: "start" | "end" | "normal";
  }>;
  route?: {
    totalDistanceKm: number;
    totalTravelMinutes: number;
    polyline: number[][]; // [ [lng,lat], ... ]
  };
};