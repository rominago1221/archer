import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '../../lib/seo/metadata';

/**
 * Reusable SEO head component. Wraps react-helmet-async.
 *
 * Props: metadata object from generateMetadata() or PAGE_METADATA.
 */
export default function PageHead({ metadata }) {
  if (!metadata) return null;
  const { title, description, canonical, ogImage, ogType, locale, noindex, article } = metadata;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType || 'website'} />
      <meta property="og:locale" content={locale || 'en_US'} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Article-specific */}
      {article && <meta property="article:published_time" content={article.publishedTime} />}
      {article && <meta property="article:modified_time" content={article.modifiedTime} />}
      {article && <meta property="article:author" content={article.author} />}
      {article?.section && <meta property="article:section" content={article.section} />}

      {/* Hreflang */}
      <link rel="alternate" hrefLang="en-US" href={canonical} />
      <link rel="alternate" hrefLang="fr-BE" href={canonical.replace(SITE_URL, `${SITE_URL}/fr`)} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />
    </Helmet>
  );
}
