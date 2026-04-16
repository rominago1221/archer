import React from 'react';

/**
 * Render JSON-LD structured data in a script tag.
 */
export default function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Pre-built schemas

export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Archer',
  url: 'https://archer.law',
  logo: 'https://archer.law/logos/archer-logo-wordmark.svg',
  description: 'AI legal assistant providing instant case analysis and attorney-signed letters for consumers.',
  sameAs: [],
};

export const SOFTWARE_APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Archer',
  applicationCategory: 'LegalTech',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '24.99',
    priceCurrency: 'USD',
  },
};

export const LEGAL_SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LegalService',
  name: 'Archer Attorney Letter Service',
  description: 'Attorney-signed legal letters delivered in 4 hours, starting at $49.',
  provider: { '@type': 'Organization', name: 'Archer' },
  areaServed: ['United States', 'Belgium'],
  offers: {
    '@type': 'Offer',
    price: '49',
    priceCurrency: 'USD',
    description: 'Attorney-signed letter',
  },
};

export function createArticleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.ogImage || 'https://archer.law/og/default.png',
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author || 'Archer Legal Team',
      url: 'https://archer.law/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Archer',
      logo: { '@type': 'ImageObject', url: 'https://archer.law/logos/archer-logo-wordmark.svg' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://archer.law/blog/${article.slug}`,
    },
  };
}

export function createFaqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function createBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
