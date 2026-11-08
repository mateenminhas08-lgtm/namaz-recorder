import { PrayerRecord } from '@namaz-recorder/shared';

export interface InsightsData {
  totalPrayed: number;
  totalMissed: number;
  totalRecovered: number;
  masjidPercentage: number;
  mostMissedPrayer: string;
}

export interface QazaBankState {
  totalQazaCount: number;
  missedPrayers: PrayerRecord[];
}

export function renderInsightsQazaScreen(insights: InsightsData, qaza: QazaBankState) {
  return {
    insightsSection: {
      title: 'Namaz Tajziya (Insights)',
      cards: [
        { label: 'Ada Shuda Namazein', value: insights.totalPrayed.toString(), icon: '🕌' },
        { label: 'Masjid Jamaat Ratio', value: `${insights.masjidPercentage}%`, icon: '📍' },
        { label: 'Qaza Recovered', value: insights.totalRecovered.toString(), icon: '🔄' },
        { label: 'Aksar Miss Hone Wali Namaz', value: insights.mostMissedPrayer, icon: '⚠️' }
      ]
    },
    qazaBankSection: {
      title: 'Qaza Bank (Missed Prayers)',
      badge: qaza.totalQazaCount > 0 ? `${qaza.totalQazaCount} Pending` : 'Alhamdulillah Sab Ada Hain',
      items: qaza.missedPrayers.map(p => ({
        id: p.id,
        prayerName: p.prayerName,
        missedDate: p.date,
        recoverButtonText: 'Ada Karein (Recover)'
      }))
    }
  };
}
