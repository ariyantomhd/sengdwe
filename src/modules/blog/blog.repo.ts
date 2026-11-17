// src/modules/blog/blog.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface BlogCategoryRecord {
  id: number;
  name: string;
  slug: string;
  badge_color: string;
  created_at?: string;
  count?: number;
}

export interface BlogCommentRecord {
  id: number;
  article_id: number;
  user_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface BlogArticleRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  category_id?: number | null;
  category: string;
  category_name: string;
  badge_color?: string | null;
  tag?: string | null;
  cover_image: string;
  read_time: string;
  views_count: number;
  likes_count: number;
  shares_count: number;
  author_name: string;
  author_avatar: string;
  author_role: string;
  lead_location: string;
  paragraphs: string[];
  subheading: string;
  sub_paragraph: string;
  bullet_points: string[];
  published_at?: string | null;
  created_at: string;
  comments_count?: number;
  comments?: BlogCommentRecord[];
}

export interface CreateBlogArticlePayload {
  title: string;
  slug: string;
  excerpt: string;
  content?: string | null;
  status?: 'DRAFT' | 'PUBLISHED';
  category_id?: number | null;
  badge_color?: string | null;
  tag?: string | null;
  cover_image?: string;
  read_time?: string;
  views_count?: number;
  likes_count?: number;
  shares_count?: number;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  lead_location?: string;
  paragraphs?: string[];
  subheading?: string;
  sub_paragraph?: string;
  bullet_points?: string[];
  published_at?: string | null;
}

export interface BlogFilters {
  category_id?: string;
  category?: string;
  status?: string;
  search?: string;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop';
const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop';

function parseJsonStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function mapCommentRow(row: Record<string, unknown>): BlogCommentRecord {
  return {
    id: Number(row.id),
    article_id: Number(row.article_id),
    user_id: row.user_id ? String(row.user_id) : null,
    author_name: String(row.author_name || 'Guest Reader'),
    content: String(row.content || ''),
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

async function enrichArticles(rows: Record<string, unknown>[]): Promise<BlogArticleRecord[]> {
  const [catsRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('blog_categories').select('id, name, slug, badge_color'),
    supabaseAdmin.from('blog_comments').select('article_id'),
  ]);

  const catMap: Record<number, { name: string; badge_color: string }> = {};
  if (Array.isArray(catsRes.data)) {
    for (const c of catsRes.data as Array<{ id: number; name: string; badge_color?: string }>) {
      catMap[c.id] = {
        name: c.name,
        badge_color: c.badge_color || 'bg-slate-900 text-white',
      };
    }
  }

  const commentCountMap: Record<number, number> = {};
  if (Array.isArray(commentsRes.data)) {
    for (const cm of commentsRes.data as Array<{ article_id: number }>) {
      commentCountMap[cm.article_id] = (commentCountMap[cm.article_id] || 0) + 1;
    }
  }

  return rows.map((row) => {
    const id = Number(row.id);
    const catId = row.category_id ? Number(row.category_id) : null;
    const matchedCat = catId ? catMap[catId] : undefined;
    const categoryName = matchedCat?.name || 'SaaS Architecture';

    return {
      id,
      title: String(row.title || ''),
      slug: String(row.slug || ''),
      excerpt: String(row.excerpt || ''),
      content: row.content ? String(row.content) : null,
      status: String(row.status || 'PUBLISHED').toUpperCase() as 'DRAFT' | 'PUBLISHED',
      category_id: catId,
      category: categoryName,
      category_name: categoryName,
      badge_color: row.badge_color
        ? String(row.badge_color)
        : matchedCat?.badge_color || 'bg-slate-900 text-white',
      tag: row.tag ? String(row.tag) : 'New',
      cover_image: String(row.cover_image || DEFAULT_COVER),
      read_time: String(row.read_time || '5 min read'),
      views_count: Number(row.views_count ?? 0),
      likes_count: Number(row.likes_count ?? 0),
      shares_count: Number(row.shares_count ?? 0),
      author_name: String(row.author_name || 'Muhammad Ariyanto'),
      author_avatar: String(row.author_avatar || DEFAULT_AVATAR),
      author_role: String(row.author_role || 'Lead Architect'),
      lead_location: String(row.lead_location || `${categoryName} —`),
      paragraphs: parseJsonStringArray(row.paragraphs),
      subheading: String(row.subheading || 'Key Architecture & Implementation Notes'),
      sub_paragraph: String(row.sub_paragraph || ''),
      bullet_points: parseJsonStringArray(row.bullet_points),
      published_at: row.published_at ? String(row.published_at) : null,
      created_at: String(row.created_at || new Date().toISOString()),
      comments_count: commentCountMap[id] ?? 0,
    };
  });
}

export const blogRepo = {
  async listCategories(): Promise<BlogCategoryRecord[]> {
    const [catsRes, articlesRes] = await Promise.all([
      supabaseAdmin.from('blog_categories').select('*').order('name', { ascending: true }),
      supabaseAdmin.from('blog_articles').select('category_id'),
    ]);

    if (catsRes.error) {
      throw new Error(`Failed to load blog categories: ${catsRes.error.message}`);
    }

    const counts: Record<number, number> = {};
    if (Array.isArray(articlesRes.data)) {
      for (const a of articlesRes.data as Array<{ category_id: number | null }>) {
        if (a.category_id) {
          counts[a.category_id] = (counts[a.category_id] || 0) + 1;
        }
      }
    }

    return ((catsRes.data || []) as BlogCategoryRecord[]).map((c) => ({
      ...c,
      count: counts[c.id] ?? 0,
    }));
  },

  async createCategory(payload: {
    name: string;
    slug: string;
    badge_color?: string;
  }): Promise<BlogCategoryRecord> {
    const { data, error } = await supabaseAdmin
      .from('blog_categories')
      .insert({
        name: payload.name,
        slug: payload.slug,
        badge_color: payload.badge_color || 'bg-indigo-600 text-white',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create category: ${error?.message || 'Unknown error'}`);
    }

    return { ...(data as BlogCategoryRecord), count: 0 };
  },

  async listArticles(filters: BlogFilters): Promise<BlogArticleRecord[]> {
    let resolvedCategoryId: number | null = null;

    if (filters.category_id && filters.category_id !== 'ALL') {
      resolvedCategoryId = Number(filters.category_id);
    } else if (
      filters.category &&
      filters.category.toUpperCase() !== 'ALL' &&
      filters.category.trim() !== ''
    ) {
      const { data: catData } = await supabaseAdmin
        .from('blog_categories')
        .select('id')
        .ilike('name', filters.category.trim())
        .maybeSingle();

      if (!catData) {
        return [];
      }
      resolvedCategoryId = Number(catData.id);
    }

    let query = supabaseAdmin
      .from('blog_articles')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (resolvedCategoryId !== null && !Number.isNaN(resolvedCategoryId)) {
      query = query.eq('category_id', resolvedCategoryId);
    }

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      query = query.eq('status', filters.status.toUpperCase());
    }

    if (filters.search && filters.search.trim() !== '') {
      const safeKeyword = filters.search.replace(/[,().%]/g, '').trim();
      if (safeKeyword) {
        query = query.or(
          `title.ilike.%${safeKeyword}%,slug.ilike.%${safeKeyword}%,excerpt.ilike.%${safeKeyword}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load blog articles: ${error.message}`);
    }

    return await enrichArticles((data || []) as Record<string, unknown>[]);
  },

  async getArticleById(id: number): Promise<BlogArticleRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched || null;
  },

  async getArticleBySlugOrId(identifier: string): Promise<BlogArticleRecord | null> {
    const isNumericId = /^\d+$/.test(identifier.trim());
    let query = supabaseAdmin.from('blog_articles').select('*');

    if (isNumericId) {
      query = query.eq('id', Number(identifier));
    } else {
      query = query.eq('slug', identifier.trim());
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    if (!enriched) return null;

    const comments = await this.listCommentsByArticle(enriched.id);
    return {
      ...enriched,
      comments,
      comments_count: comments.length,
    };
  },

  async listCommentsByArticle(articleId: number): Promise<BlogCommentRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('blog_comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data as Record<string, unknown>[]).map(mapCommentRow);
  },

  async createComment(payload: {
    article_id: number;
    user_id?: string | null;
    author_name: string;
    content: string;
  }): Promise<BlogCommentRecord> {
    const { data, error } = await supabaseAdmin
      .from('blog_comments')
      .insert({
        article_id: payload.article_id,
        user_id: payload.user_id ?? null,
        author_name: payload.author_name,
        content: payload.content,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to post comment: ${error?.message || 'Unknown error'}`);
    }

    return mapCommentRow(data as Record<string, unknown>);
  },

  async createArticle(payload: CreateBlogArticlePayload): Promise<BlogArticleRecord> {
    const nowIso = new Date().toISOString();
    const status = payload.status || 'PUBLISHED';
    const paragraphs = payload.paragraphs || [];

    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .insert({
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content: payload.content ?? paragraphs.join('\n\n'),
        status,
        category_id: payload.category_id ?? null,
        badge_color: payload.badge_color ?? 'bg-indigo-600 text-white',
        tag: payload.tag ?? 'New',
        cover_image: payload.cover_image || DEFAULT_COVER,
        read_time: payload.read_time || '5 min read',
        views_count: payload.views_count ?? 0,
        likes_count: payload.likes_count ?? 0,
        shares_count: payload.shares_count ?? 0,
        author_name: payload.author_name || 'Muhammad Ariyanto',
        author_avatar: payload.author_avatar || DEFAULT_AVATAR,
        author_role: payload.author_role || 'Lead Architect',
        lead_location: payload.lead_location || 'Engineering —',
        paragraphs,
        subheading: payload.subheading || 'Key Architecture & Implementation Notes',
        sub_paragraph:
          payload.sub_paragraph ||
          paragraphs[paragraphs.length - 1] ||
          payload.excerpt,
        bullet_points: payload.bullet_points || [],
        published_at: status === 'PUBLISHED' ? payload.published_at || nowIso : null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to save blog article: ${error?.message || 'Unknown error'}`);
    }

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched;
  },

  async updateArticle(
    id: number,
    payload: Partial<CreateBlogArticlePayload>
  ): Promise<BlogArticleRecord> {
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update article: ${error?.message || 'Article not found'}`);
    }

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched;
  },

  async deleteArticle(id: number): Promise<void> {
    const { error } = await supabaseAdmin.from('blog_articles').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete article: ${error.message}`);
    }
  },
};