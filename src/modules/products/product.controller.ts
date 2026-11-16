// src/modules/products/product.controller.ts
import type { Request, Response } from 'express';
import type { ProductQueryParams } from '../../types/product';
import { productService } from './product.services';

export class ProductController {
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: ProductQueryParams = {
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        category_id: typeof req.query.category_id === 'string' ? req.query.category_id : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
        limit:
          typeof req.query.limit === 'string' || typeof req.query.limit === 'number'
            ? req.query.limit
            : undefined,
        page:
          typeof req.query.page === 'string' || typeof req.query.page === 'number'
            ? req.query.page
            : undefined,
      };

      const result = await productService.getAllProducts(queryParams);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
      res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCTS_FETCH_FAILED',
          details: errorMessage,
        },
      });
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!productId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            details: 'ID Produk tidak valid.',
          },
        });
        return;
      }

      const result = await productService.getProductById(productId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Produk tidak ditemukan.';
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          details: errorMessage,
        },
      });
    }
  }

  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const result = await productService.getCategories();
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat kategori.';
      res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORIES_FETCH_FAILED',
          details: errorMessage,
        },
      });
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>) || {};
      const result = await productService.createProduct(req.body, files);
      res.status(201).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat produk.';
      res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_CREATE_FAILED',
          details: errorMessage,
        },
      });
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!productId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            details: 'ID Produk tidak valid.',
          },
        });
        return;
      }

      const files = (req.files as Record<string, Express.Multer.File[]>) || {};
      const result = await productService.updateProduct(productId, req.body, files);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui produk.';
      res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_UPDATE_FAILED',
          details: errorMessage,
        },
      });
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!productId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            details: 'ID Produk tidak valid.',
          },
        });
        return;
      }

      const result = await productService.deleteProduct(productId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal menghapus produk.';
      res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_DELETE_FAILED',
          details: errorMessage,
        },
      });
    }
  }
}

export const productController = new ProductController();