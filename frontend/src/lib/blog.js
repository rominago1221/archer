/**
 * Blog content system. Articles are JS modules in src/content/blog/.
 * Each exports: { title, description, slug, publishedAt, updatedAt, author, category, tags, ogImage, readingTime, featured, pillarPage, relatedArticles, content }
 */

// Dynamic import of all blog articles
const blogModules = require.context('../content/blog', false, /\.js$/);

let _postsCache = null;

export function getAllBlogPosts() {
  if (_postsCache) return _postsCache;
  _postsCache = blogModules.keys()
    .map(key => {
      const mod = blogModules(key);
      return mod.default || mod;
    })
    .filter(p => p && p.title && p.slug)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return _postsCache;
}

export function getPostBySlug(slug) {
  return getAllBlogPosts().find(p => p.slug === slug) || null;
}

export function getPostsByCategory(category) {
  return getAllBlogPosts().filter(p => p.category === category);
}

export function getRelatedPosts(slug, limit = 3) {
  const post = getPostBySlug(slug);
  if (!post?.relatedArticles) return [];
  const all = getAllBlogPosts();
  return all.filter(p => post.relatedArticles.includes(p.slug)).slice(0, limit);
}

export function getFeaturedPosts(limit = 3) {
  return getAllBlogPosts().filter(p => p.featured).slice(0, limit);
}

export const BLOG_CATEGORIES = [
  { key: 'eviction', label: 'Eviction' },
  { key: 'employment', label: 'Employment' },
  { key: 'severance', label: 'Severance' },
  { key: 'ai-legal', label: 'AI & Legal Tech' },
  { key: 'consumer', label: 'Consumer Rights' },
  { key: 'housing', label: 'Housing' },
];
