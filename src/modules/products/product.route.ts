// src/modules/products/product.route.ts
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { productController } from './product.controller';
import { verifyAdminAuth } from '../../middlewares/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

const productUploadFields = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'file_source', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]);

router.get('/admin/products', verifyAdminAuth, (req: Request, res: Response) =>
  productController.getProducts(req, res),
);
router.get('/admin/categories', verifyAdminAuth, (req: Request, res: Response) =>
  productController.getCategories(req, res),
);
router.get('/admin/products/:id', verifyAdminAuth, (req: Request, res: Response) =>
  productController.getProductById(req, res),
);

router.post('/admin/products', verifyAdminAuth, productUploadFields, (req: Request, res: Response) =>
  productController.createProduct(req, res),
);
router.put('/admin/products/:id', verifyAdminAuth, productUploadFields, (req: Request, res: Response) =>
  productController.updateProduct(req, res),
);
router.delete('/admin/products/:id', verifyAdminAuth, (req: Request, res: Response) =>
  productController.deleteProduct(req, res),
);

export default router;