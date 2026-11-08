import { PrayerTimeConfig, UserPreferences } from '@namaz-recorder/shared';

export interface SettingsScreenState {
  timings: PrayerTimeConfig;
  preferences: UserPreferences;
}

export function adjustPrayerTime(timeStr: string, deltaMinutes: number): string {
  const [hStr, mStr] = timeStr.split(':');
  let totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + deltaMinutes;
  if (totalMins < 0) totalMins += 24 * 60;
  totalMins = totalMins % (24 * 60);

  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

export function renderSettingsScreen(state: SettingsScreenState) {
  const { timings, preferences } = state;

  return {
    sections: [
      {
        title: 'Masjid Jamaat Auqat (Quick +/- 5 min Adjuster)',
        prayers: [
          { name: 'Fajr', time: timings.fajr, canAdjust: true },
          { name: 'Zuhr', time: timings.zuhr, canAdjust: true },
          { name: 'Asr', time: timings.asr, canAdjust: true },
          { name: 'Maghrib (Auto-Sunset)', time: `Sunset + ${timings.maghribOffsetMinutes} min`, canAdjust: false },
          { name: 'Isha', time: timings.isha, canAdjust: true },
          { name: 'Jumu\'ah Khutbah', time: timings.jumuahKhutbah, canAdjust: true },
          { name: 'Jumu\'ah Jamaat', time: timings.jumuahJamaat, canAdjust: true }
        ]
      },
      {
        title: 'Smart Khud-kaar Features (Sensors & Audio)',
        toggles: [
          {
            key: 'autoSilentEnabled',
            label: 'Jamaat ke waqt Phone Auto-Silent karein',
            description: `${preferences.autoSilentDurationMinutes} minute baad wapas normal sound ho jayega`,
            enabled: preferences.autoSilentEnabled
          },
          {
            key: 'masjidGeofenceEnabled',
            label: 'Masjid Location Zone Auto-Tracking',
            description: 'Masjid pohanchne par bina hath lagaye namaz record karein',
            enabled: preferences.masjidGeofenceEnabled
          },
          {
            key: 'pocketMotionEnabled',
            label: 'Pocket Motion Mode (Ruku / Sujood sensor)',
            description: 'Ghar/Daftar mein jeb mein phone rakh kar parhein to auto-detect ho',
            enabled: preferences.pocketMotionEnabled
          }
        ]
      }
    ]
  };
}
