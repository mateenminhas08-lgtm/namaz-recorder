import { isInsideMasjidZone, PrayerMotionStateMachine, SensorReading, PrayerRecord } from '@namaz-recorder/shared';
import { mobileApi } from './apiClient.js';

export class DeviceSensorService {
  private motionMachine: PrayerMotionStateMachine;
  private isAutoSilentActive: boolean = false;
  private originalRingerMode: string = 'NORMAL';

  constructor() {
    this.motionMachine = new PrayerMotionStateMachine(2); // 2 rakats detection threshold
  }

  /**
   * Evaluates phone sound mode and triggers Auto-Silent if within Masjid Jamaat window.
   */
  public evaluateAutoSilent(isWithinJamaatWindow: boolean, userPrefEnabled: boolean): boolean {
    if (!userPrefEnabled) return false;

    if (isWithinJamaatWindow && !this.isAutoSilentActive) {
      // Simulate DND/Silent activation on Android
      this.isAutoSilentActive = true;
      this.originalRingerMode = 'SILENT';
      return true;
    } else if (!isWithinJamaatWindow && this.isAutoSilentActive) {
      // Revert to normal
      this.isAutoSilentActive = false;
      this.originalRingerMode = 'NORMAL';
      return false;
    }
    return this.isAutoSilentActive;
  }

  public getSilentStatus(): boolean {
    return this.isAutoSilentActive;
  }

  /**
   * Feeds raw accelerometer/gyro readings into state machine.
   * When complete, triggers automatic background sync.
   */
  public feedMotionReading(reading: SensorReading, currentPrayer: string, dateStr: string): boolean {
    this.motionMachine.processReading(reading);
    if (this.motionMachine.isComplete()) {
      // Completed full namaz motions
      mobileApi.sendMotionCompleted(currentPrayer, dateStr);
      this.motionMachine.reset();
      return true;
    }
    return false;
  }

  /**
   * Checks if user entered Masjid Geofence and triggers automatic prayer sync.
   */
  public checkAndSyncGeofence(
    userLat: number,
    userLon: number,
    currentPrayer: string,
    dateStr: string
  ): boolean {
    const session = mobileApi.getSession();
    const isInside = isInsideMasjidZone(
      userLat,
      userLon,
      session.masjidCoords.latitude,
      session.masjidCoords.longitude,
      session.masjidCoords.radiusMeters
    );

    if (isInside) {
      mobileApi.sendGeofencePing(currentPrayer, dateStr, userLat, userLon);
      return true;
    }
    return false;
  }

  /**
   * Determines if a 1-Tap fallback prompt should be shown.
   */
  public shouldShow1TapPrompt(
    prayer: PrayerRecord,
    minutesSinceJamaat: number
  ): boolean {
    // If jamaat passed between 15 to 45 mins and prayer is still PENDING
    if (prayer.status === 'PENDING' && minutesSinceJamaat >= 15 && minutesSinceJamaat <= 60) {
      return true;
    }
    return false;
  }
}

export const sensorService = new DeviceSensorService();
