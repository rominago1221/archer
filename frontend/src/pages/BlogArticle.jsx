/**
 * /blog/:slug — article page.
 *
 * Same shell as the blog index (`.blog-page` wrapper + PublicHeader +
 * shared Footer). Article body is rendered from a small markdown subset
 * (h2/h3, bold, italic, links, lists, blockquotes, hr) into scoped HTML
 * that inherits all typography from blog.css.
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { createArticleSchema, createBreadcrumbSchema } from '../components/seo/JsonLd';
import { generateMetadata, SITE_URL } from '../lib/seo/metadata';
import { getPostBySlug, getRelatedPosts } from '../lib/blog';
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
    return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function BlogArticle() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);
  const [language, setLanguage] = useState(resolveLang);
  const [, setCountry] = useState(resolveCountry);

  useEffect(() => {
    setLanguage(resolveLang());
    setCountry(resolveCountry());
  }, []);

  const t = useBlogT(language);

  if (!post) {
    return (
      <div data-testid="blog-article-not-found">
        <PublicHeader
          onLanguageChange={setLanguage}
          onJurisdictionChange={setCountry}
        />
        <main className="blog-page">
          <div className="article-not-found">
            <h1>{t('article.not_found_title')}</h1>
            <Link to="/blog">{t('article.not_found_back')} →</Link>
          </div>
        </main>
        <Footer language={language} country={resolveCountry()} />
      </div>
    );
  }

  const metadata = generateMetadata({
    title: post.title,
    description: post.description,
    canonical: `${SITE_URL}/blog/${post.slug}`,
    ogImage: post.ogImage,
    ogType: 'article',
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      author: post.author,
      section: post.category,
    },
  });

  const related = getRelatedPosts(slug, 3);
  const categoryLabel = t(`filters.category_${post.category}`);
  const countryLabel = post.country ? t(`filters.country_${String(post.country).toLowerCase()}`) : '';

  return (
    <div data-testid="blog-article">
      <PageHead metadata={metadata} />
      <JsonLd data={createArticleSchema(post)} />
      <JsonLd data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
        { name: post.title },
      ])} />
      <PublicHeader
        onLanguageChange={setLanguage}
        onJurisdictionChange={setCountry}
      />

      <main className="blog-page">
        <article className="article" lang={post.language || undefined}>
          <Link to="/blog" className="article-back">← {t('article.back_to_blog')}</Link>

          <header className="article-header">
            <div className="article-header-row">
              <span className="article-category">{categoryLabel}</span>
              {countryLabel && <span className="article-country">{countryLabel}</span>}
            </div>
            <h1 className="article-title">{post.title}</h1>
            <p className="article-desc">{post.description}</p>
            <div className="article-meta">
              <span>{t('meta.by', { author: post.author })}</span>
              <span>{formatDate(post.publishedAt, language)}</span>
              <span>{t('meta.reading_time', { time: post.readingTime })}</span>
            </div>
          </header>

          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />

          <div className="article-disclaimer">
            <strong>{t('article.disclaimer_label')} :</strong> {t('article.disclaimer_text')}
          </div>

          <div className="article-cta">
            <div className="article-cta-title">{t('article.cta_title')}</div>
            <div className="article-cta-text">{t('article.cta_text')}</div>
            <Link to="/signup" className="article-cta-button">
              {t('article.cta_button')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="article-author-box">
            <div className="article-author-label">{t('article.about_author_label')}</div>
            <div className="article-author-name">{post.author}</div>
            <div className="article-author-text">{t('article.about_author_text')}</div>
          </div>

          {related.length > 0 && (
            <div className="article-related">
              <h2 className="article-related-title">{t('article.related_guides')}</h2>
              <div className="article-related-grid">
                {related.map((r) => (
                  <Link key={r.slug} to={`/blog/${r.slug}`} className="article-related-card">
                    <div className="article-related-card-title">{r.title}</div>
                    <div className="article-related-card-meta">
                      {t('meta.reading_time', { time: r.readingTime })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer language={language} country={resolveCountry()} />
    </div>
  );
}


/* ─── Markdown subset renderer ─────────────────────────────────────
 * Supports: ## h2, ### h3, #### h4, **bold**, *italic*, [text](url),
 * > blockquote (single line or multi-line with `> ` prefix), - / 1.
 * lists, --- horizontal rule, paragraphs. Authored content is trusted
 * (no raw user input), so we don't escape HTML entities. */

function renderContent(text) {
  if (!text) return '';
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map(renderBlock).join('');
}

function renderBlock(raw) {
  const block = raw.trim();
  if (!block) return '';

  if (block === '---' || /^-{3,}$/.test(block)) return '<hr/>';

  if (block.startsWith('#### ')) return `<h4>${inline(block.slice(5))}</h4>`;
  if (block.startsWith('### '))  return `<h3>${inline(block.slice(4))}</h3>`;
  if (block.startsWith('## '))   return `<h2>${inline(block.slice(3))}</h2>`;

  const lines = block.split('\n');

  // Blockquote: every line starts with "> "
  if (lines.every((l) => /^>\s?/.test(l))) {
    const text = lines.map((l) => l.replace(/^>\s?/, '')).join(' ');
    return `<blockquote><p>${inline(text)}</p></blockquote>`;
  }

  // Unordered list: every line starts with "- "
  if (lines.every((l) => /^-\s/.test(l))) {
    const items = lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('');
    return `<ul>${items}</ul>`;
  }

  // Ordered list: every line starts with digit + ". "
  if (lines.every((l) => /^\d+\.\s/.test(l))) {
    const items = lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('');
    return `<ol>${items}</ol>`;
  }

  return `<p>${inline(lines.join(' '))}</p>`;
}

function inline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
