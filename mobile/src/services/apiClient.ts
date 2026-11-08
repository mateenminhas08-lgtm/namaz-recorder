import { PrayerRecord, PrayerTimeConfig, MasjidCoordinates, UserPreferences, NextPrayerInfo } from '@namaz-recorder/shared';

export interface MobileSession {
  token: string | null;
  userId: string | null;
  userName: string;
  isLoggedIn: boolean;
  masjidConfig: PrayerTimeConfig;
  masjidCoords: MasjidCoordinates;
  preferences: UserPreferences;
}

export class MobileApiClient {
  private baseUrl: string;
  private session: MobileSession;
  private offlinePrayerCache: Map<string, PrayerRecord[]> = new Map();

  constructor(baseUrl: string = 'http://10.0.2.2:4000/api') {
    this.baseUrl = baseUrl;
    this.session = {
      token: null,
      userId: null,
      userName: 'Namaz Bhai',
      isLoggedIn: false,
      masjidConfig: {
        fajr: '05:30',
        zuhr: '13:30',
        asr: '16:45',
        maghribOffsetMinutes: 3,
        isha: '20:00',
        jumuahKhutbah: '12:45',
        jumuahJamaat: '13:15'
      },
      masjidCoords: {
        latitude: 31.5204,
        longitude: 74.3587,
        radiusMeters: 75,
        name: 'Muhallay ki Masjid'
      },
      preferences: {
        userId: 'local_user',
        autoSilentEnabled: true,
        autoSilentDurationMinutes: 18,
        masjidGeofenceEnabled: true,
        pocketMotionEnabled: true,
        promptFallbackEnabled: true,
        language: 'both'
      }
    };
  }

  public getSession(): MobileSession {
    return this.session;
  }

  public setSession(session: Partial<MobileSession>): void {
    this.session = { ...this.session, ...session };
  }

  public cacheDailyPrayers(dateStr: string, prayers: PrayerRecord[]): void {
    this.offlinePrayerCache.set(dateStr, prayers);
  }

  public getCachedDailyPrayers(dateStr: string): PrayerRecord[] | null {
    return this.offlinePrayerCache.get(dateStr) || null;
  }

  public async fetchDaily(dateStr: string): Promise<{ nextPrayer?: NextPrayerInfo; prayers: PrayerRecord[] }> {
    // If offline or no token, return cached or fallback records
    const cached = this.getCachedDailyPrayers(dateStr);
    if (!this.session.token) {
      if (cached) return { prayers: cached };
      return { prayers: [] };
    }

    try {
      const res = await fetch(`${this.baseUrl}/prayers/daily?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${this.session.token}` }
      });
      const data: any = await res.json();
      if (data.success) {
        this.cacheDailyPrayers(dateStr, data.data.prayers);
        return data.data;
      }
    } catch (e) {
      // Return cached in offline mode gracefully
      if (cached) return { prayers: cached };
    }
    return { prayers: cached || [] };
  }

  public async sendGeofencePing(prayerName: string, dateStr: string, lat: number, lon: number): Promise<boolean> {
    if (!this.session.token) return false;
    try {
      const res = await fetch(`${this.baseUrl}/prayers/geofence-ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ prayerName, date: dateStr, latitude: lat, longitude: lon })
      });
      const data: any = await res.json();
      return !!data.success && !!data.data.recorded;
    } catch {
      return false;
    }
  }

  public async sendMotionCompleted(prayerName: string, dateStr: string): Promise<boolean> {
    if (!this.session.token) return false;
    try {
      const res = await fetch(`${this.baseUrl}/prayers/motion-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ prayerName, date: dateStr })
      });
      const data: any = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  public async updatePrayerManual(
    prayerId: string,
    status: 'PENDING' | 'PRAYED' | 'MISSED' | 'RECOVERED',
    location: 'MASJID' | 'HOME' | 'OFFICE' | 'TRAVEL',
    method: 'MANUAL' | 'PROMPT_FALLBACK' = 'MANUAL'
  ): Promise<boolean> {
    if (!this.session.token) return false;
    try {
      const res = await fetch(`${this.baseUrl}/prayers/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ prayerId, status, location, trackingMethod: method })
      });
      const data: any = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  public async recoverQaza(prayerId: string): Promise<boolean> {
    if (!this.session.token) return false;
    try {
      const res = await fetch(`${this.baseUrl}/qaza/recover/${prayerId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.session.token}` }
      });
      const data: any = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }
}

export const mobileApi = new MobileApiClient();
