import test from 'node:test';
import assert from 'node:assert';
import {
  calculateHaversineDistanceMeters,
  isInsideMasjidZone,
  calculateSunset,
  getNextPrayer,
  formatCountdown,
  PrayerMotionStateMachine,
  PrayerTimeConfig
} from './index.js';

test('Haversine distance and geofencing calculation', () => {
  // Badshahi Mosque Lahore coordinates
  const masjidLat = 31.5882;
  const masjidLon = 74.3094;

  // Exact location -> distance should be ~0
  const distSelf = calculateHaversineDistanceMeters(masjidLat, masjidLon, masjidLat, masjidLon);
  assert.strictEqual(Math.round(distSelf), 0);

  // User 50 meters away (roughly 0.00045 deg lat)
  const userLatInside = masjidLat + 0.0003;
  const userLonInside = masjidLon;
  const inside = isInsideMasjidZone(userLatInside, userLonInside, masjidLat, masjidLon, 75);
  assert.strictEqual(inside, true, 'User should be inside 75m masjid zone');

  // User 1 km away
  const userLatFar = masjidLat + 0.01;
  const userLonFar = masjidLon;
  const far = isInsideMasjidZone(userLatFar, userLonFar, masjidLat, masjidLon, 75);
  assert.strictEqual(far, false, 'User should be outside masjid zone');
});

test('Solar sunset calculation returns valid time', () => {
  const date = new Date('2026-05-15T12:00:00Z');
  const sunset = calculateSunset(date, 31.5204, 74.3587); // Lahore
  assert.ok(sunset instanceof Date);
  assert.ok(!isNaN(sunset.getTime()));
  // In May in Lahore, sunset is roughly between 13:30 and 14:30 UTC (~18:30 to 19:30 PKT)
  assert.ok(sunset.getUTCHours() >= 13 && sunset.getUTCHours() <= 15);
});

test('Next prayer countdown calculation and Friday Jumuah shift', () => {
  const config: PrayerTimeConfig = {
    fajr: '05:00',
    zuhr: '13:30',
    asr: '17:00',
    maghribOffsetMinutes: 3,
    isha: '20:30',
    jumuahKhutbah: '12:45',
    jumuahJamaat: '13:15'
  };

  // Test normal Thursday 10:00 AM -> next should be Zuhr
  const thursday = new Date('2026-11-05T10:00:00'); // Note: local time
  const nextThurs = getNextPrayer(thursday, config, 31.52, 74.35);
  assert.strictEqual(nextThurs.prayerName, 'ZUHR');

  // Test Friday 10:00 AM -> next should be JUMUAH
  const friday = new Date('2026-11-06T10:00:00');
  const nextFri = getNextPrayer(friday, config, 31.52, 74.35);
  assert.strictEqual(nextFri.prayerName, 'JUMUAH');

  // Test countdown formatting
  assert.strictEqual(formatCountdown(3665), '01:01:05');
  assert.strictEqual(formatCountdown(0), '00:00:00');
});

test('Pocket Motion State Machine detects 2 Rakat Prayer flow', () => {
  const machine = new PrayerMotionStateMachine(2);
  let time = 1000;

  // 1. Stand in Qiyam (pitch ~80 deg, upright)
  machine.processReading({ timestampMs: time, pitchDegrees: 80, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'QIYAM');

  // 2. Bow to Ruku after 3 seconds
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 40, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'RUKU');

  // 3. Stand back to Qiyam after 3 seconds
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 80, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'QIYAM_AFTER_RUKU');

  // 4. Prostrate to Sujood 1
  time += 2000;
  machine.processReading({ timestampMs: time, pitchDegrees: 10, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'SUJOOD_1');

  // 5. Sit in Jalsa
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 50, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'JALSA');

  // 6. Prostrate to Sujood 2
  time += 2000;
  machine.processReading({ timestampMs: time, pitchDegrees: 10, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getState(), 'SUJOOD_2');

  // Finish Rakat 1 -> loops back to QIYAM
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 80, accelerationMagnitude: 9.8 });
  assert.strictEqual(machine.getRakatCount(), 1);
  assert.strictEqual(machine.getState(), 'QIYAM');

  // Repeat for Rakat 2
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 40, accelerationMagnitude: 9.8 }); // Ruku
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 80, accelerationMagnitude: 9.8 }); // Stand
  time += 2000;
  machine.processReading({ timestampMs: time, pitchDegrees: 10, accelerationMagnitude: 9.8 }); // Sujood 1
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 50, accelerationMagnitude: 9.8 }); // Jalsa
  time += 2000;
  machine.processReading({ timestampMs: time, pitchDegrees: 10, accelerationMagnitude: 9.8 }); // Sujood 2
  time += 3000;
  machine.processReading({ timestampMs: time, pitchDegrees: 80, accelerationMagnitude: 9.8 }); // Done

  assert.strictEqual(machine.getRakatCount(), 2);
  assert.strictEqual(machine.isComplete(), true);
  assert.strictEqual(machine.getState(), 'COMPLETED');
});
