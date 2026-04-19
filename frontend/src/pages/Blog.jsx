/**
 * /blog — public blog index.
 *
 * Shell mirrors /attorneys: `.blog-page` wrapper, PublicHeader on top,
 * shared Home Footer at the bottom, tokens shared via home.css.
 *
 * Layout:
 *   - Hero split (eyebrow + title + sub on the left, featured card on the right)
 *   - Filters (country + category chips, additive)
 *   - Posts grid (featured article excluded to avoid duplication)
 *   - Empty state when filters match no article
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { createBreadcrumbSchema } from '../components/seo/JsonLd';
import { PAGE_METADATA, SITE_URL } from '../lib/seo/metadata';
import {
  getAllBlogPosts,
  getFeaturedPost,
  BLOG_CATEGORIES,
  BLOG_COUNTRIES,
} from '../lib/blog';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Home/Footer';
import { useBlogT } from '../hooks/useBlogT';
import { getStoredLocale } from '../data/landingTranslations';
import '../styles/home.css';
import '../styles/blog.css';

function resolveLang() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[1] || 'en').toLowerCase();
}

function resolveCountry() {
  const loc = getStoredLocale() || 'us-en';
  return (loc.split('-')[0] || 'us').toUpperCase();
}

function formatDate(iso, lang) {
  if (!iso) return '';
  try {
    const locale = { en: 'en-US', fr: 'fr-FR', nl: 'nl-BE', de: 'de-DE', es: 'es-ES' }[lang] || 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function Blog() {
  const [language, setLanguage] = useState(resolveLang);
  const [, setCountry] = useState(resolveCountry);
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    setLanguage(resolveLang());
    setCountry(resolveCountry());
  }, []);

  const t = useBlogT(language);
  const allPosts = getAllBlogPosts();
  const featured = getFeaturedPost();

  const filtered = allPosts
    .filter((p) => (featured ? p.slug !== featured.slug : true))
    .filter((p) => countryFilter === 'all' || p.country === countryFilter)
    .filter((p) => categoryFilter === 'all' || p.category === categoryFilter);

  return (
    <div data-testid="blog-page">
      <PageHead metadata={PAGE_METADATA.blog} />
      <JsonLd data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog' },
      ])} />
      <PublicHeader
        onLanguageChange={setLanguage}
        onJurisdictionChange={setCountry}
      />

      <main className="blog-page">
        {/* Hero split */}
        <section className="hero" data-testid="blog-hero">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-eyebrow">{t('hero.eyebrow')}</div>
              <h1 className="hero-title">
                {t('hero.title_1')}<br />
                <span className="accent">{t('hero.title_2')}</span>
              </h1>
              <p className="hero-sub">{t('hero.sub')}</p>
            </div>

            <div className="hero-visual">
              {featured && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="featured-card"
                  data-testid="blog-featured"
                >
                  <div className="featured-header">
                    <span className="featured-label">{t('hero.featured_label')}</span>
                    <span className="featured-category">
                      {t(`filters.category_${featured.category}`)}
                    </span>
                    {featured.country && (
                      <span className="featured-country">
                        {t(`filters.country_${String(featured.country).toLowerCase()}`)}
                      </span>
                    )}
                  </div>
                  <h2 className="featured-title">{featured.title}</h2>
                  <p className="featured-desc">{featured.description}</p>
                  <div className="featured-footer">
                    <div className="featured-meta">
                      <span>{t('meta.reading_time', { time: featured.readingTime })}</span>
                      <span>{formatDate(featured.publishedAt, language)}</span>
                    </div>
                    <span className="featured-cta">{t('meta.read_article')} →</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="filters-section" data-testid="blog-filters">
          <div className="filter-group">
            <span className="filter-heading">{t('filters.country_heading')}</span>
            <button
              type="button"
              className={`filter-chip ${countryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCountryFilter('all')}
            >
              {t('filters.country_all')}
            </button>
            {BLOG_COUNTRIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`filter-chip ${countryFilter === c.key ? 'active' : ''}`}
                onClick={() => setCountryFilter(c.key)}
              >
                {t(`filters.country_${c.key.toLowerCase()}`)}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-heading">{t('filters.category_heading')}</span>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              {t('filters.category_all')}
            </button>
            {BLOG_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`filter-chip ${categoryFilter === c.key ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c.key)}
              >
                {t(`filters.category_${c.key}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Posts grid */}
        <section className="posts-section" data-testid="blog-grid">
          {filtered.length > 0 ? (
            <div className="posts-grid">
              {filtered.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="post-card"
                  data-testid={`blog-post-${post.slug}`}
                >
                  <div className="post-card-header">
                    <span className="post-category">
                      {t(`filters.category_${post.category}`)}
                    </span>
                    {post.country && (
                      <span className="post-country">
                        {t(`filters.country_${String(post.country).toLowerCase()}`)}
                      </span>
                    )}
                  </div>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-desc">{post.description}</p>
                  <div className="post-meta">
                    <span>{t('meta.reading_time', { time: post.readingTime })}</span>
                    <span>{formatDate(post.publishedAt, language)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">{t('empty_state')}</div>
          )}
        </section>
      </main>

      <Footer language={language} country={resolveCountry()} />
    </div>
  );
}
