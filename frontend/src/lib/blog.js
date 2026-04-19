/**
 * Blog content system. Articles are JS modules in src/content/blog/.
 *
 * Each article exports:
 *   title, description, slug, publishedAt, updatedAt, author,
 *   category  — one of BLOG_CATEGORIES keys
 *   country   — 'BE' | 'US' (drives the country filter + flag indicator)
 *   language  — 'fr' | 'en' | 'nl' | 'de' | 'es' (used for locale rendering)
 *   tags, ogImage, readingTime, featured, pillarPage, relatedArticles, content
 *
 * `featured: true` promotes the article to the hero slot on /blog. Only
 * the most recent featured post is shown — all others appear in the grid.
 */

const blogModules = require.context('../content/blog', false, /\.js$/);

let _postsCache = null;

export function getAllBlogPosts() {
  if (_postsCache) return _postsCache;
  _postsCache = blogModules.keys()
    .map((key) => {
      const mod = blogModules(key);
      return mod.default || mod;
    })
    .filter((p) => p && p.title && p.slug)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return _postsCache;
}

export function getPostBySlug(slug) {
  return getAllBlogPosts().find((p) => p.slug === slug) || null;
}

export function getPostsByCategory(category) {
  return getAllBlogPosts().filter((p) => p.category === category);
}

export function getPostsByCountry(country) {
  return getAllBlogPosts().filter((p) => p.country === country);
}

export function getRelatedPosts(slug, limit = 3) {
  const post = getPostBySlug(slug);
  if (!post?.relatedArticles) return [];
  const all = getAllBlogPosts();
  return all.filter((p) => post.relatedArticles.includes(p.slug)).slice(0, limit);
}

export function getFeaturedPost() {
  return getAllBlogPosts().find((p) => p.featured) || null;
}

export function getFeaturedPosts(limit = 3) {
  return getAllBlogPosts().filter((p) => p.featured).slice(0, limit);
}

export const BLOG_CATEGORIES = [
  { key: 'housing',    label: 'Housing' },
  { key: 'traffic',    label: 'Traffic' },
  { key: 'employment', label: 'Employment' },
  { key: 'consumer',   label: 'Consumer' },
  { key: 'family',     label: 'Family' },
];

export const BLOG_COUNTRIES = [
  { key: 'BE', label: 'Belgium' },
  { key: 'US', label: 'USA' },
];
