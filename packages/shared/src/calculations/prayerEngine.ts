import { PrayerName, PrayerTimeConfig } from '../types/prayer.js';
import { calculateSunset } from './geoSolar.js';

export interface NextPrayerInfo {
  prayerName: PrayerName;
  scheduledTime: Date;
  secondsRemaining: number;
  formattedRemaining: string;
}

export function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function getDailyPrayerSchedule(
  date: Date,
  config: PrayerTimeConfig,
  latitude: number,
  longitude: number
): { name: PrayerName; time: Date }[] {
  const isFriday = date.getDay() === 5;
  const sunset = calculateSunset(date, latitude, longitude);
  const maghribTime = new Date(sunset.getTime() + config.maghribOffsetMinutes * 60 * 1000);

  const fajrTime = parseTimeToDate(config.fajr, date);
  const zuhrOrJumuahTime = isFriday 
    ? parseTimeToDate(config.jumuahJamaat, date)
    : parseTimeToDate(config.zuhr, date);
  const asrTime = parseTimeToDate(config.asr, date);
  const ishaTime = parseTimeToDate(config.isha, date);

  const schedule: { name: PrayerName; time: Date }[] = [
    { name: 'FAJR', time: fajrTime },
    { name: isFriday ? 'JUMUAH' : 'ZUHR', time: zuhrOrJumuahTime },
    { name: 'ASR', time: asrTime },
    { name: 'MAGHRIB', time: maghribTime },
    { name: 'ISHA', time: ishaTime }
  ];

  return schedule;
}

export function getNextPrayer(
  now: Date,
  config: PrayerTimeConfig,
  latitude: number,
  longitude: number
): NextPrayerInfo {
  const schedule = getDailyPrayerSchedule(now, config, latitude, longitude);

  for (const item of schedule) {
    const diff = Math.floor((item.time.getTime() - now.getTime()) / 1000);
    if (diff > 0) {
      return {
        prayerName: item.name,
        scheduledTime: item.time,
        secondsRemaining: diff,
        formattedRemaining: formatCountdown(diff)
      };
    }
  }

  // If all prayers today passed, next is tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFajr = parseTimeToDate(config.fajr, tomorrow);
  const diff = Math.floor((tomorrowFajr.getTime() - now.getTime()) / 1000);

  return {
    prayerName: 'FAJR',
    scheduledTime: tomorrowFajr,
    secondsRemaining: diff,
    formattedRemaining: formatCountdown(diff)
  };
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
