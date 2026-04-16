import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { createBreadcrumbSchema } from '../components/seo/JsonLd';
import { PAGE_METADATA, SITE_URL } from '../lib/seo/metadata';
import { getAllBlogPosts, BLOG_CATEGORIES } from '../lib/blog';
import PublicNavbar from '../components/PublicNavbar';

export default function Blog() {
  const posts = getAllBlogPosts();
  const [category, setCategory] = useState('all');
  const filtered = category === 'all' ? posts : posts.filter(p => p.category === category);

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <PageHead metadata={PAGE_METADATA.blog} />
      <JsonLd data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog' },
      ])} />
      <PublicNavbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1, marginBottom: 8 }}>
          Archer Legal Guides
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
          Clear, empathetic legal guidance. Written in plain English.
        </p>

        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          <CatPill active={category === 'all'} onClick={() => setCategory('all')}>All</CatPill>
          {BLOG_CATEGORIES.map(cat => (
            <CatPill key={cat.key} active={category === cat.key} onClick={() => setCategory(cat.key)}>
              {cat.label}
            </CatPill>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filtered.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{
                background: '#fff', borderRadius: 14, overflow: 'hidden',
                border: '0.5px solid #e2e0db', transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ padding: '20px 22px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {post.category}
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0f', margin: '8px 0', lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 }}>
                    {post.description}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9ca3af' }}>
                    <span>{post.readingTime}</span>
                    <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            No articles in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}

function CatPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', fontSize: 12, fontWeight: active ? 700 : 500,
      background: active ? '#0a0a0f' : '#fff', color: active ? '#fff' : '#374151',
      border: '1px solid #e2e0db', borderRadius: 20, cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}
