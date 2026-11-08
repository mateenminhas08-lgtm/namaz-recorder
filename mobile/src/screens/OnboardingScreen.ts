import { PrayerTimeConfig, MasjidCoordinates } from '@namaz-recorder/shared';

export interface OnboardingState {
  step: 1 | 2 | 3;
  timings: PrayerTimeConfig;
  coords: MasjidCoordinates;
  permissionsGranted: {
    location: boolean;
    physicalActivity: boolean;
    doNotDisturb: boolean;
    notifications: boolean;
  };
}

export function createInitialOnboarding(): OnboardingState {
  return {
    step: 1,
    timings: {
      fajr: '05:30',
      zuhr: '13:30',
      asr: '16:45',
      maghribOffsetMinutes: 3,
      isha: '20:00',
      jumuahKhutbah: '12:45',
      jumuahJamaat: '13:15'
    },
    coords: {
      latitude: 31.5204,
      longitude: 74.3587,
      radiusMeters: 75,
      name: 'Muhallay ki Masjid'
    },
    permissionsGranted: {
      location: false,
      physicalActivity: false,
      doNotDisturb: false,
      notifications: false
    }
  };
}

export function advanceOnboardingStep(state: OnboardingState): OnboardingState {
  if (state.step < 3) {
    return { ...state, step: (state.step + 1) as any };
  }
  return state;
}
