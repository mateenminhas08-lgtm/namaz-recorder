process.env.NODE_ENV = 'test';
process.env.IS_TEST = 'true';

import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db/db.js';

test('Comprehensive Backend API End-to-End Suite', async (t) => {
  let authToken = '';
  let userId = '';

  t.after(() => {
    db.clear();
  });

  await t.test('1. Register new user with input validation and password hashing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bilal@test.com',
        password: 'Password123!',
        name: 'Bilal Khan',
        masjidConfig: {
          fajr: '05:15',
          zuhr: '13:30',
          asr: '16:45',
          maghribOffsetMinutes: 3,
          isha: '20:15',
          jumuahKhutbah: '12:45',
          jumuahJamaat: '13:15'
        },
        masjidCoords: {
          latitude: 31.5882,
          longitude: 74.3094,
          radiusMeters: 75,
          name: 'Badshahi Masjid'
        }
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.email, 'bilal@test.com');
    authToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  await t.test('2. Login with valid credentials returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bilal@test.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
  });

  await t.test('3. Fetch daily prayers for today returns all 5 prayers and countdown info', async () => {
    const todayStr = '2026-11-08';
    const res = await request(app)
      .get(`/api/prayers/daily?date=${todayStr}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.prayers.length, 5);
    assert.ok(res.body.data.nextPrayer);
    assert.ok(res.body.data.nextPrayer.secondsRemaining !== undefined);
  });

  await t.test('4. Process Geofence ping when user reaches Masjid zone (Auto-Track)', async () => {
    const res = await request(app)
      .post('/api/prayers/geofence-ping')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prayerName: 'ZUHR',
        date: '2026-11-08',
        latitude: 31.5882,
        longitude: 74.3094
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.recorded, true);
    assert.strictEqual(res.body.data.record.status, 'PRAYED');
    assert.strictEqual(res.body.data.record.location, 'MASJID');
    assert.strictEqual(res.body.data.record.trackingMethod, 'GEOFENCE');
  });

  await t.test('5. Process Pocket Motion completed for Asr prayer', async () => {
    const res = await request(app)
      .post('/api/prayers/motion-completed')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prayerName: 'ASR',
        date: '2026-11-08'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'PRAYED');
    assert.strictEqual(res.body.data.trackingMethod, 'MOTION');
  });

  await t.test('6. Mark Missed prayer, view in Qaza Bank, and Recover it', async () => {
    // Initial Qaza count (some past prayers may have been auto-swept to Qaza)
    const initialBank = await request(app)
      .get('/api/qaza/bank')
      .set('Authorization', `Bearer ${authToken}`);
    const initialCount = initialBank.body.data.totalQaza;

    // Pick a prayer and explicitly ensure it's in Qaza
    const fajrId = `${userId}_2026-11-08_FAJR`;
    const patchRes = await request(app)
      .patch('/api/prayers/update')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prayerId: fajrId,
        status: 'MISSED',
        location: 'HOME',
        trackingMethod: 'MANUAL'
      });
    assert.strictEqual(patchRes.status, 200);

    // Check Qaza Bank
    const bankRes = await request(app)
      .get('/api/qaza/bank')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(bankRes.status, 200);
    assert.ok(bankRes.body.data.totalQaza >= 1);
    const countBeforeRecover = bankRes.body.data.totalQaza;

    // Recover Fajr
    const recoverRes = await request(app)
      .post(`/api/qaza/recover/${fajrId}`)
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(recoverRes.status, 200);
    assert.strictEqual(recoverRes.body.data.status, 'RECOVERED');

    // Qaza bank should now be reduced by 1
    const bankAfter = await request(app)
      .get('/api/qaza/bank')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(bankAfter.status, 200);
    assert.strictEqual(bankAfter.body.data.totalQaza, countBeforeRecover - 1);
  });

  await t.test('7. Monthly Calendar and Insights aggregation', async () => {
    const calRes = await request(app)
      .get('/api/calendar?month=2026-11')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(calRes.status, 200);
    assert.ok(calRes.body.data['2026-11-08']);

    const insRes = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(insRes.status, 200);
    assert.ok(insRes.body.data.totalPrayed >= 2);
  });

  await t.test('8. High-Resolution Designed WhatsApp Report Card SVG generation', async () => {
    const reportRes = await request(app)
      .get('/api/report-card?date=2026-11-08')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(reportRes.status, 200);
    const svgText = reportRes.text || (reportRes.body ? reportRes.body.toString('utf-8') : '');
    assert.ok(svgText.includes('NAMAZ RECORDER'));
    assert.ok(svgText.includes('Bilal Khan'));
    assert.ok(svgText.includes('ZUHR'));
    assert.ok(svgText.includes('Masjid Location Tracked'));
  });
});
