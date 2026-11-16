// src/modules/blog/blog.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface BlogCategoryRecord {
  id: number;
  name: string;
  slug: string;
  badge_color?: string;
  count?: number;
}

export interface BlogCommentRecord {
  id: number;
  article_id: number;
  name: string;
  text: string;
  is_approved: boolean;
  created_at: string;
}

export interface BlogArticleRecord {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string[];
  category_id?: number | null;
  category?: string;
  author?: string;
  image_url?: string | null;
  is_featured?: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  comments_count?: number;
}

export interface CreateBlogArticlePayload {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string[];
  category_id?: number | null;
  author?: string;
  image_url?: string | null;
  is_featured?: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
  published_at?: string | null;
}

export interface AdminBlogFilters {
  category_id?: string;
  status?: string;
  search?: string;
}

async function enrichArticles(rows: Record<string, unknown>[]): Promise<BlogArticleRecord[]> {
  const [catsRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('blog_categories').select('id, name, slug, badge_color'),
    supabaseAdmin.from('blog_comments').select('article_id'),
  ]);

  const catMap: Record<number, string> = {};
  if (Array.isArray(catsRes.data)) {
    for (const c of catsRes.data as Array<{ id: number; name: string }>) {
      catMap[c.id] = c.name;
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
    const rawContent = Array.isArray(row.content)
      ? row.content.map((p) => String(p))
      : typeof row.content === 'string'
        ? [row.content]
        : [];

    return {
      id,
      title: String(row.title || ''),
      slug: String(row.slug || ''),
      excerpt: row.excerpt ? String(row.excerpt) : null,
      content: rawContent,
      category_id: catId,
      category: catId && catMap[catId] ? catMap[catId] : 'Uncategorized',
      author: String(row.author || 'Themavia Editorial'),
      image_url: row.image_url ? String(row.image_url) : null,
      is_featured: Boolean(row.is_featured),
      status: String(row.status || 'PUBLISHED').toUpperCase() as 'DRAFT' | 'PUBLISHED',
      published_at: row.published_at ? String(row.published_at) : null,
      created_at: String(row.created_at || new Date().toISOString()),
      updated_at: String(row.updated_at || new Date().toISOString()),
      comments_count: commentCountMap[id] ?? 0,
    };
  });
}

export const blogRepo = {
  async listCategories(): Promise<BlogCategoryRecord[]> {
    const [catsRes, postsRes] = await Promise.all([
      supabaseAdmin.from('blog_categories').select('*').order('name', { ascending: true }),
      supabaseAdmin.from('blog_posts').select('category_id'),
    ]);

    if (catsRes.error) {
      throw new Error(`Gagal memuat kategori blog: ${catsRes.error.message}`);
    }

    const counts: Record<number, number> = {};
    if (Array.isArray(postsRes.data)) {
      for (const p of postsRes.data as Array<{ category_id: number | null }>) {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
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
        badge_color: payload.badge_color || '#f97316',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal membuat kategori: ${error?.message || 'Unknown error'}`);
    }

    return { ...(data as BlogCategoryRecord), count: 0 };
  },

  async listArticles(filters: AdminBlogFilters): Promise<BlogArticleRecord[]> {
    let query = supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.category_id && filters.category_id !== 'ALL') {
      query = query.eq('category_id', Number(filters.category_id));
    }

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      query = query.eq('status', filters.status.toUpperCase());
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,excerpt.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat artikel blog: ${error.message}`);
    }

    return await enrichArticles((data || []) as Record<string, unknown>[]);
  },

  async getArticleById(id: number): Promise<BlogArticleRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched || null;
  },

  async createArticle(payload: CreateBlogArticlePayload): Promise<BlogArticleRecord> {
    const nowIso = new Date().toISOString();
    const status = payload.status || 'PUBLISHED';
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt ?? null,
        content: payload.content,
        category_id: payload.category_id ?? null,
        author: payload.author || 'Themavia Editorial',
        image_url: payload.image_url ?? null,
        is_featured: Boolean(payload.is_featured),
        status,
        published_at: status === 'PUBLISHED' ? payload.published_at || nowIso : null,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal menyimpan artikel blog: ${error?.message || 'Unknown error'}`);
    }

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched;
  },

  async updateArticle(
    id: number,
    payload: Partial<CreateBlogArticlePayload>
  ): Promise<BlogArticleRecord> {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal memperbarui artikel: ${error?.message || 'Artikel tidak ditemukan'}`);
    }

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    return enriched;
  },

  async deleteArticle(id: number): Promise<void> {
    const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', id);
    if (error) {
      throw new Error(`Gagal menghapus artikel: ${error.message}`);
    }
  },
};