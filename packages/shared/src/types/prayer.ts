export type PrayerName = 'FAJR' | 'ZUHR' | 'ASR' | 'MAGHRIB' | 'ISHA' | 'JUMUAH';

export type PrayerStatus = 'PENDING' | 'PRAYED' | 'MISSED' | 'RECOVERED';

export type PrayerLocation = 'MASJID' | 'HOME' | 'OFFICE' | 'TRAVEL';

export type TrackingMethod = 'MANUAL' | 'GEOFENCE' | 'MOTION' | 'PROMPT_FALLBACK';

export interface PrayerTimeConfig {
  fajr: string; // HH:mm format, e.g. "05:30"
  zuhr: string; // "13:30"
  asr: string;  // "16:45"
  maghribOffsetMinutes: number; // e.g. +3 mins after sunset
  isha: string; // "20:00"
  jumuahKhutbah: string; // "13:00"
  jumuahJamaat: string;  // "13:30"
}

export interface MasjidCoordinates {
  latitude: number;
  longitude: number;
  radiusMeters: number; // default e.g. 75 meters
  name: string;
}

export interface PrayerRecord {
  id: string;
  userId: string;
  prayerName: PrayerName;
  date: string; // YYYY-MM-DD
  scheduledJamaatTime: string; // ISO string
  status: PrayerStatus;
  location: PrayerLocation;
  trackingMethod: TrackingMethod;
  prayedAt?: string; // ISO string
  qazaRecoveredAt?: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  autoSilentEnabled: boolean;
  autoSilentDurationMinutes: number;
  masjidGeofenceEnabled: boolean;
  pocketMotionEnabled: boolean;
  promptFallbackEnabled: boolean;
  language: 'en' | 'roman_urdu' | 'both';
}

export interface DailySummary {
  date: string;
  totalPrayed: number;
  totalMissed: number;
  totalPending: number;
  prayedAtMasjidCount: number;
  prayers: PrayerRecord[];
}
