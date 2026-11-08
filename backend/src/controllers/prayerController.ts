import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { prayerService } from '../services/prayerService.js';
import { reportService } from '../services/reportService.js';
import { getNextPrayer } from '@namaz-recorder/shared';

const geofenceSchema = z.object({
  prayerName: z.enum(['FAJR', 'ZUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMUAH']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number(),
  longitude: z.number()
});

const motionSchema = z.object({
  prayerName: z.enum(['FAJR', 'ZUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMUAH']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const updateStatusSchema = z.object({
  prayerId: z.string(),
  status: z.enum(['PENDING', 'PRAYED', 'MISSED', 'RECOVERED']),
  location: z.enum(['MASJID', 'HOME', 'OFFICE', 'TRAVEL']),
  trackingMethod: z.enum(['MANUAL', 'GEOFENCE', 'MOTION', 'PROMPT_FALLBACK']).default('MANUAL')
});

export async function getDailyPrayers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  // Auto sweep any past expired prayers into Qaza
  await prayerService.sweepExpiredPrayersToQaza(user, dateStr);

  const prayers = await prayerService.getOrCreateDailyPrayers(user, dateStr);

  const nextPrayer = getNextPrayer(
    new Date(),
    user.masjidConfig,
    user.masjidCoords.latitude,
    user.masjidCoords.longitude
  );

  res.json({
    success: true,
    data: {
      date: dateStr,
      nextPrayer,
      prayers
    }
  });
}

export async function processGeofence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parse = geofenceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, errors: parse.error.errors });
    return;
  }

  const { prayerName, date, latitude, longitude } = parse.data;
  const result = await prayerService.processGeofencePing(
    req.user!,
    prayerName,
    date,
    latitude,
    longitude
  );

  res.json({
    success: true,
    data: result
  });
}

export async function processMotion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parse = motionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, errors: parse.error.errors });
    return;
  }

  const { prayerName, date } = parse.data;
  const record = await prayerService.processMotionCompleted(req.user!, prayerName, date);

  res.json({
    success: true,
    message: 'Namaz automatically recorded via Pocket Motion',
    data: record
  });
}

export async function updatePrayer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parse = updateStatusSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, errors: parse.error.errors });
    return;
  }

  const { prayerId, status, location, trackingMethod } = parse.data;
  const updated = await prayerService.updatePrayerStatus(
    req.user!.id,
    prayerId,
    status,
    location,
    trackingMethod
  );

  res.json({
    success: true,
    data: updated
  });
}

export async function getQazaBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  const bank = await prayerService.getQazaBank(req.user!.id);
  res.json({
    success: true,
    data: bank
  });
}

export async function recoverQaza(req: AuthenticatedRequest, res: Response): Promise<void> {
  const prayerId = req.params.prayerId;
  const record = await prayerService.recoverQaza(req.user!.id, prayerId);
  res.json({
    success: true,
    message: 'Qaza namaz ada ho gayi aur record recover ho gaya',
    data: record
  });
}

export async function getCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
  const yearMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);
  const calendar = await prayerService.getMonthlyCalendar(req.user!.id, yearMonth);
  res.json({
    success: true,
    data: calendar
  });
}

export async function getInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  const insights = await prayerService.getInsights(req.user!.id);
  res.json({
    success: true,
    data: insights
  });
}

export async function getReportCard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const prayers = await prayerService.getOrCreateDailyPrayers(user, dateStr);

  const svg = reportService.generateReportCardSvg(dateStr, prayers, user.name);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
}
