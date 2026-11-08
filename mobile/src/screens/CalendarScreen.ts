import { DailySummary, PrayerRecord } from '@namaz-recorder/shared';

export interface CalendarScreenState {
  currentMonth: string; // YYYY-MM
  selectedDate: string; // YYYY-MM-DD
  days: Record<string, DailySummary>;
  selectedDayPrayers: PrayerRecord[];
}

export function renderCalendarScreenState(state: CalendarScreenState) {
  const selectedDaySummary = state.days[state.selectedDate];

  return {
    monthTitle: state.currentMonth,
    selectedDate: state.selectedDate,
    selectedDayScore: selectedDaySummary ? `${selectedDaySummary.totalPrayed}/5 Ada huin` : '0/5',
    emptyStateMessage: !selectedDaySummary 
      ? 'Aaj se aap ka Namaz safar shuru ho raha hai — pehli namaz ke baad yahan record nazar aayega.'
      : null,
    prayers: state.selectedDayPrayers
  };
}
