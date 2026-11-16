// src/server.ts
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route modules without file extensions per TypeScript / NodeNext standards
import adminDashboardRoute from './modules/dashboard/dashboard.route';
import authRouter from './modules/auth/auth.route';
import productRouter from './modules/products/product.route';
import adminOrderRoute from './modules/orders/order.route';
import adminDealRoute from './modules/deals/deal.route';
import adminCouponRoute from './modules/coupons/coupon.route';
import adminLicenseRoute from './modules/licenses/license.route';
import adminUserRoute from './modules/users/user.route';
import adminReviewRoute from './modules/reviews/review.route';
import adminBlogRoute from './modules/blog/blog.route';

// Load environment variables from .env
dotenv.config();

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Enable trust proxy so client IP behind reverse proxy / Cloudflare / Vercel is accurate
app.set('trust proxy', 1);

// Global CORS Configuration allowing local dev and production admin frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ngatemin.themavia.com',
  ...(process.env.ADMIN_FRONTEND_URL ? [process.env.ADMIN_FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/', (req: Request, res: Response) => {
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
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
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
  app.listen(PORT, () => {
    console.log(`[server]: Admin Backend running successfully at http://localhost:${PORT}`);
  });
}

export default app;