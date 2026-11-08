import { PrayerRecord } from '@namaz-recorder/shared';

export interface ReportModalState {
  dateStr: string;
  userName: string;
  prayers: PrayerRecord[];
  svgContent: string;
}

export function formatWhatsAppSharePayload(state: ReportModalState): {
  captionText: string;
  hasSvgImage: boolean;
} {
  const { dateStr, userName, prayers } = state;

  const lines = [
    `*Namaz Recorder - Rozana Report* 🕌`,
    `Tareekh: ${dateStr}`,
    `Namazi: ${userName}`,
    `-----------------------------`
  ];

  for (const p of prayers) {
    const statusEmoji = p.status === 'PRAYED' ? '✅' : p.status === 'RECOVERED' ? '🔄' : p.status === 'MISSED' ? '❌' : '⏳';
    const loc = p.location === 'MASJID' ? 'Masjid' : 'Ghar/Office';
    const time = p.prayedAt ? new Date(p.prayedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const track = p.trackingMethod === 'GEOFENCE' ? 'Masjid Tracked' : p.trackingMethod === 'MOTION' ? 'Motion Tracked' : 'Manual';

    lines.push(`${statusEmoji} *${p.prayerName}*: ${p.status} (${loc}) | ${track} @ ${time}`);
  }

  lines.push(`-----------------------------`);
  lines.push(`_Namaz Recorder: Apni Masjid ke mutabiq smart tracker_`);

  return {
    captionText: lines.join('\n'),
    hasSvgImage: !!state.svgContent
  };
}
