// src/modules/blog/blog.service.ts
import {
  blogRepo,
  BlogFilters,
  BlogArticleRecord,
  BlogCategoryRecord,
  BlogCommentRecord,
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

function sanitizePlainText(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

function normalizeParagraphs(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

function estimateReadTime(paragraphs: string[]): string {
  const words = paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
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
    const name = sanitizePlainText(input.name || '');
    if (name.length < 2) {
      throw new Error('Category name must be at least 2 characters.');
    }
    const slug = slugify(input.slug || name);
    return await blogRepo.createCategory({
      name,
      slug,
      badge_color: input.badge_color || 'bg-indigo-600 text-white',
    });
  },

  async listArticles(filters: BlogFilters): Promise<BlogArticleRecord[]> {
    return await blogRepo.listArticles(filters);
  },

  async getArticleDetail(slugOrId: string): Promise<BlogArticleRecord> {
    const cleanKey = slugOrId.trim();
    if (!cleanKey) {
      throw new Error('Article slug or ID is required.');
    }

    const article = await blogRepo.getArticleBySlugOrId(cleanKey);
    if (!article) {
      throw new Error('Article not found.');
    }

    return article;
  },

  async listComments(articleId: number): Promise<BlogCommentRecord[]> {
    if (Number.isNaN(articleId) || articleId <= 0) {
      throw new Error('Invalid article ID.');
    }
    return await blogRepo.listCommentsByArticle(articleId);
  },

  async addComment(
    articleId: number,
    input: { user_id?: string | null; author_name?: string; name?: string; content?: string; text?: string }
  ): Promise<BlogCommentRecord> {
    if (Number.isNaN(articleId) || articleId <= 0) {
      throw new Error('Invalid article ID.');
    }

    const existing = await blogRepo.getArticleById(articleId);
    if (!existing) {
      throw new Error('Article not found.');
    }

    const rawAuthor = input.author_name || input.name || 'Guest Reader';
    const rawContent = input.content || input.text || '';

    const cleanAuthor = sanitizePlainText(rawAuthor).slice(0, 80) || 'Guest Reader';
    const cleanContent = sanitizePlainText(rawContent).slice(0, 1500);

    if (cleanContent.length < 2) {
      throw new Error('Comment content must be at least 2 characters.');
    }

    return await blogRepo.createComment({
      article_id: articleId,
      user_id: input.user_id ?? null,
      author_name: cleanAuthor,
      content: cleanContent,
    });
  },

  async createArticle(input: Partial<CreateBlogArticlePayload>): Promise<BlogArticleRecord> {
    const title = sanitizePlainText(input.title || '');
    if (title.length < 4) {
      throw new Error('Article title must be at least 4 characters.');
    }

    const paragraphs = normalizeParagraphs(input.paragraphs ?? input.content);
    if (paragraphs.length === 0) {
      throw new Error('Article content must contain at least 1 paragraph.');
    }

    const baseSlug = slugify(input.slug || title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    const excerpt = input.excerpt?.trim() || paragraphs[0].slice(0, 180);

    return await blogRepo.createArticle({
      title,
      slug: input.slug?.trim() ? slugify(input.slug) : uniqueSlug,
      excerpt,
      content: typeof input.content === 'string' ? input.content : paragraphs.join('\n\n'),
      status: input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      category_id: input.category_id ? Number(input.category_id) : null,
      badge_color: input.badge_color ?? 'bg-indigo-600 text-white',
      tag: input.tag ?? 'New',
      cover_image: input.cover_image?.trim(),
      read_time: input.read_time?.trim() || estimateReadTime(paragraphs),
      author_name: input.author_name?.trim() || 'Muhammad Ariyanto',
      author_avatar: input.author_avatar?.trim(),
      author_role: input.author_role?.trim() || 'Lead Architect',
      lead_location: input.lead_location?.trim() || 'SaaS Architecture —',
      paragraphs,
      subheading: input.subheading?.trim() || 'Key Architecture & Implementation Notes',
      sub_paragraph:
        input.sub_paragraph?.trim() || paragraphs[paragraphs.length - 1] || excerpt,
      bullet_points: Array.isArray(input.bullet_points) ? input.bullet_points : [],
      published_at: input.published_at || new Date().toISOString(),
    });
  },

  async updateArticle(
    id: number,
    input: Partial<CreateBlogArticlePayload>
  ): Promise<BlogArticleRecord> {
    const existing = await blogRepo.getArticleById(id);
    if (!existing) {
      throw new Error('Blog article not found.');
    }

    const patch: Partial<CreateBlogArticlePayload> = {};

    if (input.title !== undefined) {
      const title = sanitizePlainText(input.title);
      if (title.length < 4) throw new Error('Article title must be at least 4 characters.');
      patch.title = title;
    }

    if (input.slug !== undefined && input.slug.trim()) {
      patch.slug = slugify(input.slug);
    }

    if (input.excerpt !== undefined) {
      patch.excerpt = input.excerpt.trim();
    }

    if (input.paragraphs !== undefined || input.content !== undefined) {
      const paragraphs = normalizeParagraphs(input.paragraphs ?? input.content);
      if (paragraphs.length === 0) throw new Error('Article content cannot be empty.');
      patch.paragraphs = paragraphs;
      patch.content =
        typeof input.content === 'string' ? input.content : paragraphs.join('\n\n');
    }

    if (input.category_id !== undefined) {
      patch.category_id = input.category_id ? Number(input.category_id) : null;
    }

    if (input.badge_color !== undefined) patch.badge_color = input.badge_color;
    if (input.tag !== undefined) patch.tag = input.tag;
    if (input.cover_image !== undefined) patch.cover_image = input.cover_image;
    if (input.read_time !== undefined) patch.read_time = input.read_time;
    if (input.author_name !== undefined) patch.author_name = input.author_name;
    if (input.author_avatar !== undefined) patch.author_avatar = input.author_avatar;
    if (input.author_role !== undefined) patch.author_role = input.author_role;
    if (input.lead_location !== undefined) patch.lead_location = input.lead_location;
    if (input.subheading !== undefined) patch.subheading = input.subheading;
    if (input.sub_paragraph !== undefined) patch.sub_paragraph = input.sub_paragraph;
    if (input.bullet_points !== undefined) patch.bullet_points = input.bullet_points;

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
      throw new Error('Blog article not found.');
    }
    await blogRepo.deleteArticle(id);
  },
};