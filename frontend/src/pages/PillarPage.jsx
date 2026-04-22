import React from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { LEGAL_SERVICE_SCHEMA, createFaqSchema, createBreadcrumbSchema } from '../components/seo/JsonLd';
import { PAGE_METADATA, SITE_URL, generateMetadata } from '../lib/seo/metadata';
import PublicHeader from '../components/PublicHeader';
import { PILLAR_CONTENT } from '../content/pillarPages';
import { STATE_CONTENT } from '../content/statePages';

// Renders a pillar page (/eviction-help, /wrongful-termination, etc.)
// or a state sub-page (/eviction-help/california, etc.)
export default function PillarPage() {
  const { pillarSlug, state } = useParams();
  const slug = pillarSlug || window.location.pathname.split('/').filter(Boolean)[0];

  if (state) {
    return <StatePage pillarSlug={slug} state={state} />;
  }

  const pillar = PILLAR_CONTENT[slug];
  if (!pillar) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>Page not found. <Link to="/">Go home</Link></div>;
  }

  const metaKey = slug === 'eviction-help' ? 'evictionHelp'
    : slug === 'wrongful-termination' ? 'wrongfulTermination'
    : slug === 'severance-negotiation' ? 'severanceNegotiation'
    : 'aiLegalAssistant';
  const meta = PAGE_METADATA[metaKey];

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <PageHead metadata={meta} />
      <JsonLd data={LEGAL_SERVICE_SCHEMA} />
      {pillar.faqs?.length > 0 && <JsonLd data={createFaqSchema(pillar.faqs)} />}
      <JsonLd data={createBreadcrumbSchema([{ name: 'Home', url: SITE_URL }, { name: pillar.title }])} />
      <PublicHeader />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16 }}>
            {pillar.heroTitle}
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            {pillar.heroSubtitle}
          </p>
          <Link to="/signup" style={{
            display: 'inline-block', padding: '14px 28px', background: '#1a56db', color: '#fff',
            borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}>
            {pillar.ctaText || 'Analyze my case free'}
          </Link>
        </div>

        {/* Quick Answer Box (for featured snippet) */}
        {pillar.quickAnswer && (
          <div style={{
            padding: '20px 24px', background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 12, marginBottom: 32, fontSize: 15, lineHeight: 1.7, color: '#1e40af',
          }}>
            <strong>Quick answer:</strong> {pillar.quickAnswer}
          </div>
        )}

        {/* Main content sections */}
        {pillar.sections?.map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0f', marginBottom: 12 }}>{section.title}</h2>
            <div style={{ fontSize: 16, color: '#374151', lineHeight: 1.8 }}>{section.content}</div>
          </div>
        ))}

        {/* State pages links */}
        {pillar.states && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0f', marginBottom: 16 }}>State-specific guides</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {pillar.states.map(s => (
                <Link key={s.slug} to={`/${slug}/${s.slug}`} style={{
                  padding: '14px 18px', background: '#fff', borderRadius: 10,
                  border: '0.5px solid #e2e0db', textDecoration: 'none',
                  fontSize: 13, fontWeight: 600, color: '#1a56db',
                }}>
                  {s.name} &rarr;
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {pillar.faqs?.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0f', marginBottom: 16 }}>Frequently Asked Questions</h2>
            {pillar.faqs.map((faq, i) => (
              <details key={i} style={{
                marginBottom: 10, background: '#fff', borderRadius: 10,
                border: '0.5px solid #e2e0db', overflow: 'hidden',
              }}>
                <summary style={{
                  padding: '14px 18px', fontSize: 14, fontWeight: 700,
                  color: '#0a0a0f', cursor: 'pointer', listStyle: 'none',
                }}>
                  {faq.question}
                </summary>
                <div style={{ padding: '0 18px 14px', fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{
          padding: '32px 36px', background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
          borderRadius: 14, border: '1px solid #1a56db', textAlign: 'center', marginBottom: 40,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 8 }}>
            {pillar.ctaHeadline || 'Ready to fight back?'}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Archer analyzes your documents for free. Attorney-signed letters from $49.
          </div>
          <Link to="/signup" style={{
            display: 'inline-block', padding: '14px 28px', background: '#1a56db', color: '#fff',
            borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}>
            Start my case free
          </Link>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
          <strong>Disclaimer:</strong> This page is for informational purposes only and does not constitute legal advice.
          Laws vary by state and jurisdiction. For advice specific to your situation, consult a licensed attorney.
        </div>
      </div>
    </div>
  );
}

function StatePage({ pillarSlug, state }) {
  const stateData = STATE_CONTENT[pillarSlug]?.[state];
  const pillar = PILLAR_CONTENT[pillarSlug];
  if (!stateData || !pillar) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>State page not found. <Link to={`/${pillarSlug}`}>Back to guide</Link></div>;
  }

  const stateName = stateData.name || state.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const metadata = generateMetadata({
    title: `${pillar.title} in ${stateName}: 2026 Guide`,
    description: `${pillar.title} in ${stateName}. Know your rights, state-specific rules, and how to take action. Expert-reviewed guide.`,
    canonical: `${SITE_URL}/${pillarSlug}/${state}`,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <PageHead metadata={metadata} />
      <JsonLd data={createBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: pillar.title, url: `${SITE_URL}/${pillarSlug}` },
        { name: stateName },
      ])} />
      <PublicHeader />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <nav style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24, display: 'flex', gap: 6 }}>
          <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link><span>/</span>
          <Link to={`/${pillarSlug}`} style={{ color: '#9ca3af', textDecoration: 'none' }}>{pillar.title}</Link><span>/</span>
          <span style={{ color: '#6b7280' }}>{stateName}</span>
        </nav>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1, lineHeight: 1.15, marginBottom: 16 }}>
          {stateData.heroTitle || `${pillar.title} in ${stateName}`}
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7, marginBottom: 32 }}>
          {stateData.heroSubtitle || `Your complete guide to ${pillar.title.toLowerCase()} in ${stateName}. State-specific laws, timelines, and resources.`}
        </p>

        {stateData.sections?.map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0f', marginBottom: 10 }}>{section.title}</h2>
            <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>{section.content}</div>
          </div>
        ))}

        <div style={{
          padding: '28px 32px', background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
          borderRadius: 14, border: '1px solid #1a56db', textAlign: 'center', marginTop: 40,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', marginBottom: 8 }}>
            Facing a legal issue in {stateName}?
          </div>
          <Link to="/signup" style={{
            display: 'inline-block', padding: '12px 24px', background: '#1a56db', color: '#fff',
            borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginTop: 8,
          }}>
            Analyze my case free
          </Link>
        </div>

        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginTop: 32 }}>
          <strong>Disclaimer:</strong> This page reflects {stateName} law as of 2026. Laws change. Consult a licensed attorney for advice.
        </div>
      </div>
    </div>
  );
}
