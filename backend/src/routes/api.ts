import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import {
  getDailyPrayers,
  processGeofence,
  processMotion,
  updatePrayer,
  getQazaBank,
  recoverQaza,
  getCalendar,
  getInsights,
  getReportCard
} from '../controllers/prayerController.js';
import { authenticateToken } from '../middlewares/auth.js';

export const apiRouter = Router();

// Public auth endpoints
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);

// Protected endpoints (Require Bearer Token)
apiRouter.use(authenticateToken as any);

// Prayer tracking & management
apiRouter.get('/prayers/daily', getDailyPrayers as any);
apiRouter.post('/prayers/geofence-ping', processGeofence as any);
apiRouter.post('/prayers/motion-completed', processMotion as any);
apiRouter.patch('/prayers/update', updatePrayer as any);

// Qaza bank
apiRouter.get('/qaza/bank', getQazaBank as any);
apiRouter.post('/qaza/recover/:prayerId', recoverQaza as any);

// Analytics & Reports
apiRouter.get('/calendar', getCalendar as any);
apiRouter.get('/insights', getInsights as any);
apiRouter.get('/report-card', getReportCard as any);
