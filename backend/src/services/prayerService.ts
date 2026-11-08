import {
  PrayerRecord,
  PrayerName,
  PrayerStatus,
  DailySummary,
  isInsideMasjidZone,
  getDailyPrayerSchedule
} from '@namaz-recorder/shared';
import { db, UserEntity } from '../db/db.js';

export class PrayerService {
  /**
   * Initializes or fetches all 5 daily prayers for a user for a given date.
   */
  public async getOrCreateDailyPrayers(user: UserEntity, dateStr: string): Promise<PrayerRecord[]> {
    const existing = await db.getPrayersByDate(user.id, dateStr);
    if (existing.length >= 5) {
      return existing;
    }

    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const schedule = getDailyPrayerSchedule(
      dateObj,
      user.masjidConfig,
      user.masjidCoords.latitude,
      user.masjidCoords.longitude
    );

    const records: PrayerRecord[] = [];
    const nowIso = new Date().toISOString();

    for (const item of schedule) {
      const prayerId = `${user.id}_${dateStr}_${item.name}`;
      const found = existing.find(r => r.prayerName === item.name);

      if (found) {
        records.push(found);
      } else {
        const newRecord: PrayerRecord = {
          id: prayerId,
          userId: user.id,
          prayerName: item.name,
          date: dateStr,
          scheduledJamaatTime: item.time.toISOString(),
          status: 'PENDING',
          location: 'HOME',
          trackingMethod: 'MANUAL',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        await db.upsertPrayerRecord(newRecord);
        records.push(newRecord);
      }
    }

    return records;
  }

  /**
   * Automatically marks a prayer as PRAYED via Geofence tracking if user is inside Masjid zone.
   */
  public async processGeofencePing(
    user: UserEntity,
    prayerName: PrayerName,
    dateStr: string,
    userLat: number,
    userLon: number
  ): Promise<{ recorded: boolean; reason: string; record?: PrayerRecord }> {
    const isInside = isInsideMasjidZone(
      userLat,
      userLon,
      user.masjidCoords.latitude,
      user.masjidCoords.longitude,
      user.masjidCoords.radiusMeters
    );

    if (!isInside) {
      return { recorded: false, reason: 'User is outside Masjid geofence zone' };
    }

    const prayerId = `${user.id}_${dateStr}_${prayerName}`;
    const record = await db.getPrayerById(prayerId);

    // If already marked as Prayed at Masjid, do not duplicate
    if (record && record.status === 'PRAYED' && record.location === 'MASJID') {
      return { recorded: true, reason: 'Already recorded at Masjid', record };
    }

    const updated: PrayerRecord = {
      ...(record || {
        id: prayerId,
        userId: user.id,
        prayerName,
        date: dateStr,
        scheduledJamaatTime: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }),
      status: 'PRAYED',
      location: 'MASJID',
      trackingMethod: 'GEOFENCE',
      prayedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.upsertPrayerRecord(updated);
    return { recorded: true, reason: 'Successfully tracked at Masjid via Geofence', record: updated };
  }

  /**
   * Automatically marks prayer as PRAYED via Pocket Motion sensor detection.
   */
  public async processMotionCompleted(
    user: UserEntity,
    prayerName: PrayerName,
    dateStr: string
  ): Promise<PrayerRecord> {
    const prayerId = `${user.id}_${dateStr}_${prayerName}`;
    const record = await db.getPrayerById(prayerId);

    // If already recorded at Masjid, keep Masjid priority as specified in PRD section 13.3
    if (record && record.status === 'PRAYED' && record.location === 'MASJID') {
      return record;
    }

    const updated: PrayerRecord = {
      ...(record || {
        id: prayerId,
        userId: user.id,
        prayerName,
        date: dateStr,
        scheduledJamaatTime: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }),
      status: 'PRAYED',
      location: 'HOME',
      trackingMethod: 'MOTION',
      prayedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await db.upsertPrayerRecord(updated);
  }

  /**
   * Resolves prayer status from 1-Tap Prompt or user Manual Edit.
   */
  public async updatePrayerStatus(
    userId: string,
    prayerId: string,
    status: PrayerStatus,
    location: 'MASJID' | 'HOME' | 'OFFICE' | 'TRAVEL',
    trackingMethod: 'MANUAL' | 'GEOFENCE' | 'MOTION' | 'PROMPT_FALLBACK' = 'MANUAL'
  ): Promise<PrayerRecord> {
    const record = await db.getPrayerById(prayerId);
    if (!record || record.userId !== userId) {
      throw new Error('Prayer record not found');
    }

    const updated: PrayerRecord = {
      ...record,
      status,
      location,
      trackingMethod,
      prayedAt: status === 'PRAYED' ? (record.prayedAt || new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString()
    };

    return await db.upsertPrayerRecord(updated);
  }

  /**
   * Checks expired prayer windows and automatically transitions unrecorded prayers to MISSED (Qaza Bank).
   */
  public async sweepExpiredPrayersToQaza(user: UserEntity, dateStr: string): Promise<PrayerRecord[]> {
    const prayers = await this.getOrCreateDailyPrayers(user, dateStr);
    const now = new Date();
    const updatedPrayers: PrayerRecord[] = [];

    for (const p of prayers) {
      if (p.status === 'PENDING') {
        const scheduledTime = new Date(p.scheduledJamaatTime);
        // If scheduled time + 2 hours passed with no record
        const expiryTime = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);
        if (now > expiryTime) {
          const missed: PrayerRecord = {
            ...p,
            status: 'MISSED',
            updatedAt: now.toISOString()
          };
          await db.upsertPrayerRecord(missed);
          updatedPrayers.push(missed);
        }
      }
    }

    return updatedPrayers;
  }

  /**
   * Recovers a missed prayer in the Qaza Bank.
   */
  public async recoverQaza(userId: string, prayerId: string): Promise<PrayerRecord> {
    const record = await db.getPrayerById(prayerId);
    if (!record || record.userId !== userId) {
      throw new Error('Prayer record not found');
    }

    if (record.status !== 'MISSED') {
      throw new Error('Only missed prayers can be recovered');
    }

    const updated: PrayerRecord = {
      ...record,
      status: 'RECOVERED',
      qazaRecoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await db.upsertPrayerRecord(updated);
  }

  /**
   * Returns list of all pending Qaza prayers.
   */
  public async getQazaBank(userId: string): Promise<{ totalQaza: number; prayers: PrayerRecord[] }> {
    const missed = await db.getPrayersByStatus(userId, 'MISSED');
    return {
      totalQaza: missed.length,
      prayers: missed
    };
  }

  /**
   * Returns Monthly history aggregation for the Calendar view.
   */
  public async getMonthlyCalendar(userId: string, yearMonth: string): Promise<Record<string, DailySummary>> {
    const all = await db.getAllPrayers(userId);
    const calendar: Record<string, DailySummary> = {};

    for (const p of all) {
      if (p.date.startsWith(yearMonth)) {
        if (!calendar[p.date]) {
          calendar[p.date] = {
            date: p.date,
            totalPrayed: 0,
            totalMissed: 0,
            totalPending: 0,
            prayedAtMasjidCount: 0,
            prayers: []
          };
        }
        const day = calendar[p.date];
        day.prayers.push(p);
        if (p.status === 'PRAYED' || p.status === 'RECOVERED') day.totalPrayed++;
        if (p.status === 'MISSED') day.totalMissed++;
        if (p.status === 'PENDING') day.totalPending++;
        if (p.location === 'MASJID' && (p.status === 'PRAYED' || p.status === 'RECOVERED')) {
          day.prayedAtMasjidCount++;
        }
      }
    }

    return calendar;
  }

  /**
   * Generates comprehensive user insights (prayers prayed, missed, masjid ratio, streaks).
   */
  public async getInsights(userId: string): Promise<{
    totalPrayed: number;
    totalMissed: number;
    totalRecovered: number;
    masjidPercentage: number;
    mostMissedPrayer: string;
  }> {
    const all = await db.getAllPrayers(userId);
    let totalPrayed = 0;
    let totalMissed = 0;
    let totalRecovered = 0;
    let masjidCount = 0;
    const missCountByPrayer: Record<string, number> = {};

    for (const p of all) {
      if (p.status === 'PRAYED') totalPrayed++;
      if (p.status === 'MISSED') {
        totalMissed++;
        missCountByPrayer[p.prayerName] = (missCountByPrayer[p.prayerName] || 0) + 1;
      }
      if (p.status === 'RECOVERED') totalRecovered++;
      if (p.location === 'MASJID' && (p.status === 'PRAYED' || p.status === 'RECOVERED')) {
        masjidCount++;
      }
    }

    let mostMissedPrayer = 'None';
    let maxMiss = 0;
    for (const [name, count] of Object.entries(missCountByPrayer)) {
      if (count > maxMiss) {
        maxMiss = count;
        mostMissedPrayer = name;
      }
    }

    const totalValid = totalPrayed + totalRecovered;
    const masjidPercentage = totalValid > 0 ? Math.round((masjidCount / totalValid) * 100) : 0;

    return {
      totalPrayed,
      totalMissed,
      totalRecovered,
      masjidPercentage,
      mostMissedPrayer
    };
  }
}

export const prayerService = new PrayerService();
