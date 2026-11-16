// src/modules/blog/blog.service.ts
import {
  blogRepo,
  AdminBlogFilters,
  BlogArticleRecord,
  BlogCategoryRecord,
  CreateBlogArticlePayload,
} from './blog.repo';

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeContentParagraphs(rawContent: unknown): string[] {
  if (Array.isArray(rawContent)) {
    return rawContent.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof rawContent === 'string') {
    return rawContent
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

export const blogService = {
  async listCategories(): Promise<BlogCategoryRecord[]> {
    return await blogRepo.listCategories();
  },

  async addCategory(input: {
    name: string;
    slug?: string;
    badge_color?: string;
  }): Promise<BlogCategoryRecord> {
    const name = (input.name || '').trim();
    if (name.length < 2) {
      throw new Error('Nama kategori minimal 2 karakter.');
    }
    const slug = slugify(input.slug || name);
    return await blogRepo.createCategory({
      name,
      slug,
      badge_color: input.badge_color || '#f97316',
    });
  },

  async listArticles(filters: AdminBlogFilters): Promise<BlogArticleRecord[]> {
    return await blogRepo.listArticles(filters);
  },

  async createArticle(input: Partial<CreateBlogArticlePayload>): Promise<BlogArticleRecord> {
    const title = (input.title || '').trim();
    if (title.length < 4) {
      throw new Error('Judul artikel minimal 4 karakter.');
    }

    const paragraphs = normalizeContentParagraphs(input.content);
    if (paragraphs.length === 0) {
      throw new Error('Konten artikel wajib diisi minimal 1 paragraf.');
    }

    const baseSlug = slugify(input.slug || title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    return await blogRepo.createArticle({
      title,
      slug: input.slug?.trim() ? slugify(input.slug) : uniqueSlug,
      excerpt: input.excerpt?.trim() || paragraphs[0].slice(0, 180),
      content: paragraphs,
      category_id: input.category_id ? Number(input.category_id) : null,
      author: input.author?.trim() || 'Themavia Editorial',
      image_url: input.image_url?.trim() || null,
      is_featured: Boolean(input.is_featured),
      status: input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      published_at: input.published_at || new Date().toISOString(),
    });
  },

  async updateArticle(
    id: number,
    input: Partial<CreateBlogArticlePayload>
  ): Promise<BlogArticleRecord> {
    const existing = await blogRepo.getArticleById(id);
    if (!existing) {
      throw new Error('Artikel blog tidak ditemukan.');
    }

    const patch: Partial<CreateBlogArticlePayload> = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length < 4) throw new Error('Judul artikel minimal 4 karakter.');
      patch.title = title;
    }

    if (input.slug !== undefined && input.slug.trim()) {
      patch.slug = slugify(input.slug);
    }

    if (input.excerpt !== undefined) {
      patch.excerpt = input.excerpt?.trim() || null;
    }

    if (input.content !== undefined) {
      const paragraphs = normalizeContentParagraphs(input.content);
      if (paragraphs.length === 0) throw new Error('Konten artikel tidak boleh kosong.');
      patch.content = paragraphs;
    }

    if (input.category_id !== undefined) {
      patch.category_id = input.category_id ? Number(input.category_id) : null;
    }

    if (input.author !== undefined) {
      patch.author = input.author?.trim() || 'Themavia Editorial';
    }

    if (input.image_url !== undefined) {
      patch.image_url = input.image_url?.trim() || null;
    }

    if (input.is_featured !== undefined) {
      patch.is_featured = Boolean(input.is_featured);
    }

    if (input.status !== undefined) {
      patch.status = input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
      if (patch.status === 'PUBLISHED' && !existing.published_at) {
        patch.published_at = new Date().toISOString();
      }
    }

    return await blogRepo.updateArticle(id, patch);
  },

  async deleteArticle(id: number): Promise<void> {
    const existing = await blogRepo.getArticleById(id);
    if (!existing) {
      throw new Error('Artikel blog tidak ditemukan.');
    }
    await blogRepo.deleteArticle(id);
  },
};