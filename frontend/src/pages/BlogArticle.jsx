import React from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { createArticleSchema, createBreadcrumbSchema } from '../components/seo/JsonLd';
import { generateMetadata, SITE_URL } from '../lib/seo/metadata';
import { getPostBySlug, getRelatedPosts } from '../lib/blog';
import PublicNavbar from '../components/PublicNavbar';

export default function BlogArticle() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0f' }}>Article not found</h1>
          <Link to="/blog" style={{ color: '#1a56db', marginTop: 12, display: 'inline-block' }}>Back to blog</Link>
        </div>
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

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <PageHead metadata={metadata} />
      <JsonLd data={createArticleSchema(post)} />
      <JsonLd data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
        { name: post.title },
      ])} />
      <PublicNavbar />

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24, display: 'flex', gap: 6 }}>
          <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link to="/blog" style={{ color: '#9ca3af', textDecoration: 'none' }}>Blog</Link>
          <span>/</span>
          <span style={{ color: '#6b7280' }}>{post.category}</span>
        </nav>

        {/* Header */}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {post.category}
        </span>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1, lineHeight: 1.2, margin: '12px 0 16px' }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#6b7280', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e0db' }}>
          <span>{post.author}</span>
          <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>{post.readingTime}</span>
        </div>

        {/* Content */}
        <div
          style={{ fontSize: 17, lineHeight: 1.8, color: '#1a1a2e' }}
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
        />

        {/* Disclaimer */}
        <div style={{
          marginTop: 40, padding: '16px 20px', background: '#f3f4f6',
          borderRadius: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6,
        }}>
          <strong>Disclaimer:</strong> This article is for informational purposes only and does not constitute legal advice.
          For advice specific to your situation, consult a licensed attorney.
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 32, padding: '28px 32px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          borderRadius: 14, border: '1px solid #1a56db', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', marginBottom: 8 }}>
            Need help with your case?
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Archer analyzes your legal documents for free and drafts attorney-signed letters for $49.
          </div>
          <Link to="/signup" style={{
            display: 'inline-block', padding: '12px 28px', background: '#1a56db', color: '#fff',
            borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            Start my case free
          </Link>
        </div>

        {/* Author bio (E-E-A-T) */}
        <div style={{ marginTop: 32, padding: '20px 24px', background: '#fff', borderRadius: 12, border: '0.5px solid #e2e0db' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 8 }}>ABOUT THE AUTHOR</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f' }}>{post.author}</div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginTop: 4 }}>
            Archer's legal content is reviewed by licensed attorneys across jurisdictions. Our mission is to make legal help accessible to everyone.
          </div>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', marginBottom: 16 }}>Related guides</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {related.map(r => (
                <Link key={r.slug} to={`/blog/${r.slug}`} style={{
                  padding: '16px 18px', background: '#fff', borderRadius: 10,
                  border: '0.5px solid #e2e0db', textDecoration: 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f', lineHeight: 1.4 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{r.readingTime}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

// Simple markdown-ish renderer (## headers, **bold**, [links], ---)
function renderContent(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:20px;font-weight:700;color:#0a0a0f;margin:28px 0 12px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:24px;font-weight:800;color:#0a0a0f;margin:36px 0 14px;">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#1a56db;text-decoration:underline;">$1</a>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e0db;margin:32px 0;" />')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;">')
    .replace(/^/, '<p style="margin:0 0 16px;">')
    .replace(/$/, '</p>');
}
