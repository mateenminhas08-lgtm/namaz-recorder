import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db, UserEntity } from '../db/db.js';
import { env } from '../config/env.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  masjidConfig: z.object({
    fajr: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    zuhr: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    asr: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    maghribOffsetMinutes: z.number().default(3),
    isha: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    jumuahKhutbah: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('12:45'),
    jumuahJamaat: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('13:15')
  }).default({
    fajr: '05:30',
    zuhr: '13:30',
    asr: '16:45',
    maghribOffsetMinutes: 3,
    isha: '20:00',
    jumuahKhutbah: '12:45',
    jumuahJamaat: '13:15'
  }),
  masjidCoords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusMeters: z.number().default(75),
    name: z.string().default('Muhallay ki Masjid')
  }).default({
    latitude: 31.5204,
    longitude: 74.3587,
    radiusMeters: 75,
    name: 'Muhallay ki Masjid'
  })
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function register(req: Request, res: Response): Promise<void> {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.errors });
    return;
  }

  const { email, password, name, masjidConfig, masjidCoords } = result.data;
  const existing = await db.findUserByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, error: 'Account with this email already exists' });
    return;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser: UserEntity = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email,
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
    masjidConfig,
    masjidCoords,
    preferences: {
      userId: '',
      autoSilentEnabled: true,
      autoSilentDurationMinutes: 18,
      masjidGeofenceEnabled: true,
      pocketMotionEnabled: true,
      promptFallbackEnabled: true,
      language: 'both'
    }
  };
  newUser.preferences.userId = newUser.id;

  await db.createUser(newUser);

  const token = jwt.sign({ userId: newUser.id }, env.JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        masjidConfig: newUser.masjidConfig,
        masjidCoords: newUser.masjidCoords,
        preferences: newUser.preferences
      }
    }
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.errors });
    return;
  }

  const { email, password } = result.data;
  const user = await db.findUserByEmail(email);

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '30d' });

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        masjidConfig: user.masjidConfig,
        masjidCoords: user.masjidCoords,
        preferences: user.preferences
      }
    }
  });
}
