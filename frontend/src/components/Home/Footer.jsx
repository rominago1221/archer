/**
 * Footer — brand + 4 column link groups + bottom legal row.
 * Ported from design-source HTML lines 2308-2364.
 *
 * All link labels + the copyright line come from i18n so FR/EN adapt together.
 * Social icons are purely decorative anchors (href="#") until we plug real
 * profiles in; they remain static across locales.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useHomeT } from '../../hooks/useHomeT';

// Column descriptors: heading key + list of (href, i18n leaf).
const COLUMNS = [
  {
    heading: 'col_product',
    links: [
      { to: '/how',       key: 'how' },
      { to: '/cases',     key: 'cases' },
      { to: '/pricing',   key: 'pricing' },
      { to: '/attorneys', key: 'attorneys' },
    ],
  },
  {
    heading: 'col_resources',
    links: [
      { to: '/blog',    key: 'blog' },
      { to: '/faq',     key: 'faq' },
      { to: '/help',    key: 'help' },
      { to: '/contact', key: 'contact' },
    ],
  },
  {
    heading: 'col_company',
    links: [
      { to: '/about',    key: 'about' },
      { to: '/careers',  key: 'careers' },
      { to: '/press',    key: 'press' },
      { to: '/security', key: 'security' },
    ],
  },
  {
    heading: 'col_legal',
    links: [
      { to: '/terms',   key: 'terms' },
      { to: '/privacy', key: 'privacy' },
      { to: '/gdpr',    key: 'gdpr' },
      { to: '/cookies', key: 'cookies' },
    ],
  },
];

const BOTTOM_LINKS = [
  { to: '/status',    key: 'status' },
  { to: '/changelog', key: 'changelog' },
  { to: '/sitemap',   key: 'sitemap' },
];

function SocialLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function SocialX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SocialInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Footer({ language = 'en' }) {
  const t = useHomeT(language);

  return (
    <footer className="footer" data-testid="home-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">Archer</div>
          <div className="footer-tagline">{t('v3.footer.tagline')}</div>
          <div className="footer-social">
            <a href="#" aria-label="LinkedIn"><SocialLinkedIn /></a>
            <a href="#" aria-label="X"><SocialX /></a>
            <a href="#" aria-label="Instagram"><SocialInstagram /></a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <div className="footer-col-h">{t(`v3.footer.${col.heading}`)}</div>
            <ul className="footer-col-list">
              {col.links.map((link) => (
                <li key={link.key}>
                  <Link to={link.to}>{t(`v3.footer.links.${link.key}`)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <div className="footer-copyright">{t('v3.footer.copyright')}</div>
        <div className="footer-bottom-links">
          {BOTTOM_LINKS.map((link) => (
            <Link key={link.key} to={link.to}>{t(`v3.footer.links.${link.key}`)}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
