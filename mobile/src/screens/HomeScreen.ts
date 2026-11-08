import { PrayerRecord, NextPrayerInfo } from '@namaz-recorder/shared';
import { Colors } from '../theme/colors.js';

export interface HomeScreenProps {
  nextPrayer: NextPrayerInfo;
  prayers: PrayerRecord[];
  isAutoSilentActive: boolean;
  qazaPendingCount: number;
  promptPrayer?: PrayerRecord | null;
  onSelectPrayerToEdit: (prayer: PrayerRecord) => void;
  onOpenReport: () => void;
  onResolvePrompt: (prayer: PrayerRecord, status: 'PRAYED' | 'MISSED', location: 'MASJID' | 'HOME') => void;
}

/**
 * Screen 2: Smart Home Screen (PRD Section 7.1 & 12)
 * Renders next prayer bold & prominent with live countdown,
 * 5 prayer list with soft-green status badges, and 1-tap fallback card when active.
 */
export function renderHomeScreenState(props: HomeScreenProps) {
  const {
    nextPrayer,
    prayers,
    isAutoSilentActive,
    qazaPendingCount,
    promptPrayer
  } = props;

  return {
    header: {
      appName: 'NAMAZ RECORDER',
      tagline: 'Apni Masjid ke Waqt ke Mutabiq Smart Namaz Tracker',
      autoSilentBadge: isAutoSilentActive ? '🔕 Phone Auto-Silent Active (Jamaat Waqt)' : '🔔 Normal Sound'
    },
    prominentNextPrayerCard: {
      title: 'AGLI NAMAZ (NEXT PRAYER)',
      prayerName: nextPrayer.prayerName,
      countdown: nextPrayer.formattedRemaining,
      scheduledTime: nextPrayer.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      highlightStyle: {
        backgroundColor: Colors.surfaceSoftGreen,
        borderColor: Colors.highlightCardBorder,
        borderWidth: 2,
        isBold: true
      }
    },
    promptCard: promptPrayer ? {
      visible: true,
      title: `${promptPrayer.prayerName} Jamaat guzar gayi — Kya aap ne namaz parh li?`,
      options: [
        { label: 'Haan, Masjid mein parhi', action: 'MASJID_PRAYED' },
        { label: 'Ghar par parhi', action: 'HOME_PRAYED' },
        { label: 'Nahi parhi (Qaza)', action: 'MISSED' }
      ]
    } : null,
    prayerCards: prayers.map((p) => {
      const isNext = p.prayerName === nextPrayer.prayerName;
      let statusColor = Colors.statusPending;
      let statusBg = Colors.statusPendingBg;
      let statusLabel = 'Pending (Intezar)';

      if (p.status === 'PRAYED') {
        statusColor = Colors.statusPrayed;
        statusBg = Colors.statusPrayedBg;
        statusLabel = p.location === 'MASJID' ? 'Masjid mein parhi' : 'Ghar par parhi';
      } else if (p.status === 'RECOVERED') {
        statusColor = Colors.statusRecovered;
        statusBg = Colors.statusRecoveredBg;
        statusLabel = 'Qaza Ada ho gayi';
      } else if (p.status === 'MISSED') {
        statusColor = Colors.statusMissed;
        statusBg = Colors.statusMissedBg;
        statusLabel = 'Chhoot gayi (Qaza Bank)';
      }

      const trackingText = p.trackingMethod === 'GEOFENCE'
        ? '📍 Masjid Zone Tracked'
        : p.trackingMethod === 'MOTION'
        ? '📱 Pocket Motion Tracked'
        : p.trackingMethod === 'PROMPT_FALLBACK'
        ? '👆 1-Tap Prompt'
        : '✍️ Manual';

      return {
        id: p.id,
        name: p.prayerName,
        isNext,
        status: p.status,
        statusLabel,
        trackingText,
        timeDisplay: p.prayedAt 
          ? new Date(p.prayedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--',
        colors: { text: statusColor, bg: statusBg }
      };
    }),
    footer: {
      todaysReportButton: '📊 Today\'s Report (WhatsApp Image)',
      qazaBadge: qazaPendingCount > 0 ? `⚠️ ${qazaPendingCount} Qaza Pending` : '✅ Sab Namazein Ada'
    }
  };
}
