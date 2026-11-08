import test from 'node:test';
import assert from 'node:assert';
import { renderHomeScreenState } from '../screens/HomeScreen.js';
import { renderSettingsScreen, adjustPrayerTime } from '../screens/SettingsScreen.js';
import { formatWhatsAppSharePayload } from '../screens/ReportModal.js';
import { sensorService } from '../services/sensorService.js';
import { MobileApiClient } from '../services/apiClient.js';
import { PrayerRecord, NextPrayerInfo } from '@namaz-recorder/shared';

test('Mobile App State & Sensor Automation Suite', async (t) => {
  const dummyPrayers: PrayerRecord[] = [
    {
      id: 'p_1',
      userId: 'u1',
      prayerName: 'FAJR',
      date: '2026-11-08',
      scheduledJamaatTime: '2026-11-08T05:30:00Z',
      status: 'PRAYED',
      location: 'MASJID',
      trackingMethod: 'GEOFENCE',
      prayedAt: '2026-11-08T05:35:00Z',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'p_2',
      userId: 'u1',
      prayerName: 'ZUHR',
      date: '2026-11-08',
      scheduledJamaatTime: '2026-11-08T13:30:00Z',
      status: 'PENDING',
      location: 'HOME',
      trackingMethod: 'MANUAL',
      createdAt: '',
      updatedAt: ''
    }
  ];

  const dummyNextPrayer: NextPrayerInfo = {
    prayerName: 'ZUHR',
    scheduledTime: new Date('2026-11-08T13:30:00Z'),
    secondsRemaining: 1800,
    formattedRemaining: '00:30:00'
  };

  await t.test('1. Home Screen properly computes prominent next-prayer card & countdown', () => {
    const state = renderHomeScreenState({
      nextPrayer: dummyNextPrayer,
      prayers: dummyPrayers,
      isAutoSilentActive: false,
      qazaPendingCount: 0,
      promptPrayer: null,
      onSelectPrayerToEdit: () => {},
      onOpenReport: () => {},
      onResolvePrompt: () => {}
    });

    assert.strictEqual(state.prominentNextPrayerCard.prayerName, 'ZUHR');
    assert.strictEqual(state.prominentNextPrayerCard.countdown, '00:30:00');
    assert.strictEqual(state.prayerCards.length, 2);
    assert.strictEqual(state.prayerCards[0].trackingText, '📍 Masjid Zone Tracked');
  });

  await t.test('2. Settings Quick Adjuster adds and subtracts minutes with zero-padding', () => {
    assert.strictEqual(adjustPrayerTime('05:30', 5), '05:35');
    assert.strictEqual(adjustPrayerTime('05:30', -5), '05:25');
    assert.strictEqual(adjustPrayerTime('23:55', 10), '00:05'); // midnight wrap-around
    assert.strictEqual(adjustPrayerTime('00:05', -10), '23:55'); // negative wrap-around
  });

  await t.test('3. Auto-Silent toggle sound state transitions', () => {
    // Within jamaat window -> should activate silent
    const shouldBeSilent = sensorService.evaluateAutoSilent(true, true);
    assert.strictEqual(shouldBeSilent, true);
    assert.strictEqual(sensorService.getSilentStatus(), true);

    // After jamaat window -> should revert to normal
    const shouldBeNormal = sensorService.evaluateAutoSilent(false, true);
    assert.strictEqual(shouldBeNormal, false);
    assert.strictEqual(sensorService.getSilentStatus(), false);
  });

  await t.test('4. 1-Tap Fallback prompt threshold evaluation', () => {
    const pendingPrayer = dummyPrayers[1];
    // 5 minutes after jamaat -> too early for prompt
    assert.strictEqual(sensorService.shouldShow1TapPrompt(pendingPrayer, 5), false);

    // 25 minutes after jamaat -> should show prompt!
    assert.strictEqual(sensorService.shouldShow1TapPrompt(pendingPrayer, 25), true);

    // If already prayed -> should never show prompt
    assert.strictEqual(sensorService.shouldShow1TapPrompt(dummyPrayers[0], 25), false);
  });

  await t.test('5. WhatsApp Share payload formatting with full details', () => {
    const payload = formatWhatsAppSharePayload({
      dateStr: '2026-11-08',
      userName: 'Bilal Khan',
      prayers: dummyPrayers,
      svgContent: '<svg>mock</svg>'
    });

    assert.ok(payload.captionText.includes('Bilal Khan'));
    assert.ok(payload.captionText.includes('FAJR'));
    assert.ok(payload.captionText.includes('Masjid Tracked'));
    assert.strictEqual(payload.hasSvgImage, true);
  });

  await t.test('6. Offline Cache client works without network', async () => {
    const client = new MobileApiClient('http://localhost:9999');
    client.cacheDailyPrayers('2026-11-08', dummyPrayers);

    const result = await client.fetchDaily('2026-11-08');
    assert.strictEqual(result.prayers.length, 2);
    assert.strictEqual(result.prayers[0].prayerName, 'FAJR');
  });
});
