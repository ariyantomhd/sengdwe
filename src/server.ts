// src/server.ts
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import router modul tanpa ekstensi file sesuai standar NodeNext / TypeScript murni
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

// Muat variabel lingkungan dari file .env
dotenv.config();

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Aktifkan trust proxy agar IP asli client di balik reverse proxy / Cloudflare terbaca akurat
app.set('trust proxy', 1);

// Konfigurasi Middleware Global dengan CORS yang spesifik & kredensial diizinkan
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));

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

// Pendaftaran Rute Modul di bawah prefiks /api
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

// Middleware Penanganan 404 Not Found
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      details: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan di server.`,
    },
  });
});

// Middleware Global Error Handler (Hindari tipe any)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan internal pada server.';
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: errorMessage,
    },
  });
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`[server]: Admin Backend berjalan sukses di http://localhost:${PORT}`);
});

export default app;