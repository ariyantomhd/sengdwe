// src/server.ts
import 'dotenv/config';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import authRouter from './modules/auth/auth.route';
import adminDashboardRoute from './modules/dashboard/dashboard.route';
import productRouter from './modules/products/product.route';
import adminOrderRoute from './modules/orders/order.route';
import adminDealRoute from './modules/deals/deal.route';
import adminCouponRoute from './modules/coupons/coupon.route';
import adminLicenseRoute from './modules/licenses/license.route';
import adminUserRoute from './modules/users/user.route';
import adminReviewRoute from './modules/reviews/review.route';
import adminBlogRoute from './modules/blog/blog.route';

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Enable trust proxy so client IP behind reverse proxy / Cloudflare / Vercel is accurate
app.set('trust proxy', 1);

// Disable ETag globally to prevent 304 Not Modified stale/empty responses
app.set('etag', false);

// Global CORS Configuration allowing local dev (any localhost port) and production admin frontend
const explicitOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://ngatemin.themavia.com',
  ...(process.env.ADMIN_FRONTEND_URL ? [process.env.ADMIN_FRONTEND_URL.trim()] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        explicitOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  })
);

// Prevent browser & Vercel CDN caching on all dynamic API responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Themavia Admin Backend API is running smoothly.',
    timestamp: new Date().toISOString(),
  });
});

// Register Module Routes under /api prefix
app.use('/api', authRouter);
app.use('/api/admin/dashboard', adminDashboardRoute);
app.use('/api', productRouter);
app.use('/api/admin/orders', adminOrderRoute);
app.use('/api/admin/deals', adminDealRoute);
app.use('/api/admin/coupons', adminCouponRoute);
app.use('/api/admin/licenses', adminLicenseRoute);
app.use('/api/admin/users', adminUserRoute);
app.use('/api/admin/reviews', adminReviewRoute);
app.use('/api/admin/blog', adminBlogRoute);

// 404 Not Found Middleware
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      details: `Endpoint ${req.method} ${req.originalUrl} was not found on the server.`,
    },
  });
});

// Global Error Handler Middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const errorMessage = err instanceof Error ? err.message : 'An internal server error occurred.';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: errorMessage,
    },
  });
});

// Start local HTTP server only when not running on Vercel Serverless
if (!process.env.VERCEL) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server]: Admin Backend running successfully at http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server]: Port ${PORT} is already in use by another process!`);
    } else {
      console.error('[server]: Startup error:', err);
    }
  });
}

export default app;