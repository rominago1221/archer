/**
 * Pricing page for the credit-based plans (Free / Solo / Pro) plus the
 * 3 one-time credit packs. Rendered at /plans so it doesn't collide with
 * the legacy /pricing page (Archer Protect pricing, different model).
 *
 * Per commercial-secret rule: never shows the cost in credits of any
 * individual action. Each tier description speaks in terms of
 * "1,000 credits / month" without listing what an analysis costs.
 */
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Home/Footer';
import '../styles/credits.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatEur(n, isFr) {
  return isFr ? `${n.toFixed(2).replace('.', ',')} €` : `€${n.toFixed(2)}`;
}

const PLANS = [
  {
    tier: 'free',
    price: 0,
    pricePeriod: null,
    credits_en: '500 credits — one-time, on signup',
    credits_fr: '500 crédits — à l\'inscription',
    description_en: 'Try Archer with a full analysis. No credit card.',
    description_fr: 'Essayez Archer avec une analyse complète. Sans CB.',
    features_en: [
      'AI document analysis',
      'Risk score + findings',
      'DIY letter templates',
    ],
    features_fr: [
      'Analyse IA de documents',
      'Score de risque + constats',
      'Lettres à signer vous-même',
    ],
    cta_en: 'Create free account',
    cta_fr: 'Créer un compte gratuit',
    ctaLink: '/signup',
    ctaKind: 'link',
  },
  {
    tier: 'solo',
    price: 24.99,
    pricePeriod: '/mo',
    credits_en: '1,000 credits / month',
    credits_fr: '1 000 crédits / mois',
    description_en: 'For a personal case or two.',
    description_fr: 'Pour un ou deux dossiers personnels.',
    features_en: [
      'Everything in Free',
      '1,000 credits every month',
      'Unlimited refinements',
      'Attorney letter à la carte',
    ],
    features_fr: [
      'Tout Free',
      '1 000 crédits / mois',
      'Affinements illimités',
      'Lettre d\'avocat à la carte',
    ],
    cta_en: 'Start Solo',
    cta_fr: 'Choisir Solo',
    ctaKind: 'subscribe',
  },
  {
    tier: 'pro',
    price: 89.99,
    pricePeriod: '/mo',
    highlight: true,
    credits_en: '4,000 credits / month · Multi-Agent included',
    credits_fr: '4 000 crédits / mois · Multi-Agent inclus',
    description_en: 'For active disputes, landlords, small businesses.',
    description_fr: 'Pour dossiers actifs, bailleurs, TPE.',
    features_en: [
      'Everything in Solo',
      '4,000 credits every month',
      'Multi-Agent deep analysis (automatic)',
      'Free Welcome Live Counsel on signup',
      'Priority matching with attorneys',
    ],
    features_fr: [
      'Tout Solo',
      '4 000 crédits / mois',
      'Analyse Multi-Agent approfondie (automatique)',
      'Premier Live Counsel offert à l\'inscription',
      'Priorité de matching avec les avocats',
    ],
    cta_en: 'Start Pro',
    cta_fr: 'Choisir Pro',
    ctaKind: 'subscribe',
  },
];

const PACKS = [
  { code: 'starter', credits: 1000, price_eur: 29.99,
    name_en: 'Starter Pack', name_fr: 'Pack Starter' },
  { code: 'power',   credits: 3000, price_eur: 79.99,
    name_en: 'Power Pack', name_fr: 'Pack Power' },
  { code: 'mega',    credits: 10000, price_eur: 229.99,
    name_en: 'Mega Pack', name_fr: 'Pack Mega' },
];

function getLang() {
  const loc = localStorage.getItem('archer_locale') || 'us-en';
  return loc.split('-')[1] || 'en';
}

export default function PricingPlansPage() {
  const language = getLang();
  const isFr = language === 'fr';
  const [busy, setBusy] = useState(null);

  const handleSubscribe = async (tier) => {
    setBusy(tier);
    try {
      const { data } = await axios.post(
        `${API}/subscriptions/checkout`,
        { tier },
        { withCredentials: true },
      );
      window.location.href = data.checkout_url;
    } catch (e) {
      if (e.response?.status === 401) {
        window.location.href = `/signup?next=/plans&tier=${tier}`;
        return;
      }
      alert(isFr ? 'Erreur Stripe. Réessaye.' : 'Stripe error. Please retry.');
    } finally {
      setBusy(null);
    }
  };

  const handleBuyPack = async (code) => {
    setBusy(`pack_${code}`);
    try {
      const { data } = await axios.post(
        `${API}/credits/packs/checkout`,
        { pack_code: code },
        { withCredentials: true },
      );
      window.location.href = data.checkout_url;
    } catch (e) {
      if (e.response?.status === 401) {
        window.location.href = `/signup?next=/plans&pack=${code}`;
        return;
      }
      alert(isFr ? 'Erreur Stripe. Réessaye.' : 'Stripe error. Please retry.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="credits-ui plans-page">
      <PublicHeader />
      <main style={{ paddingTop: 96 }}>

        {/* ── Hero ── */}
        <section className="plans-hero">
          <div className="section-eyebrow-pill">
            {isFr ? 'TARIFS' : 'PRICING'}
          </div>
          <h1 className="plans-title">
            {isFr ? 'Un seul solde de crédits.' : 'One credit balance.'}{' '}
            <span className="accent">
              {isFr ? 'Toutes vos affaires.' : 'All your cases.'}
            </span>
          </h1>
          <p className="plans-sub">
            {isFr
              ? 'Pas de facturation à l\'heure, pas de surprise. Des crédits qui s\'utilisent partout.'
              : 'No hourly billing, no surprises. Credits you use anywhere in the app.'}
          </p>
        </section>

        {/* ── 3 plan cards ── */}
        <section className="plans-grid">
          {PLANS.map((p) => (
            <div
              key={p.tier}
              className={`plan-card${p.highlight ? ' plan-card-highlight' : ''}`}
              data-testid={`plan-card-${p.tier}`}
            >
              {p.highlight && (
                <div className="plan-badge">
                  {isFr ? 'PLUS POPULAIRE' : 'MOST POPULAR'}
                </div>
              )}
              <div className="plan-tier">{p.tier.toUpperCase()}</div>
              <div className="plan-price">
                <span className="plan-amount">{formatEur(p.price, isFr)}</span>
                {p.pricePeriod && (
                  <span className="plan-period">{isFr ? '/mois' : p.pricePeriod}</span>
                )}
              </div>
              <div className="plan-credits">
                {isFr ? p.credits_fr : p.credits_en}
              </div>
              <div className="plan-desc">
                {isFr ? p.description_fr : p.description_en}
              </div>
              <ul className="plan-features">
                {(isFr ? p.features_fr : p.features_en).map((f) => (
                  <li key={f}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {p.ctaKind === 'link' ? (
                <Link to={p.ctaLink} className="plan-cta">
                  {isFr ? p.cta_fr : p.cta_en}
                </Link>
              ) : (
                <button
                  type="button"
                  className="plan-cta"
                  disabled={busy === p.tier}
                  onClick={() => handleSubscribe(p.tier)}
                  data-testid={`plan-subscribe-${p.tier}`}
                >
                  {busy === p.tier
                    ? (isFr ? 'Redirection…' : 'Redirecting…')
                    : (isFr ? p.cta_fr : p.cta_en)}
                </button>
              )}
            </div>
          ))}
        </section>

        {/* ── Credit packs ── */}
        <section className="packs-section">
          <h2 className="packs-title">
            {isFr ? 'Besoin de crédits ponctuels ?' : 'Need a one-off boost?'}
          </h2>
          <p className="packs-sub">
            {isFr
              ? 'Les crédits de pack n\'expirent jamais et s\'ajoutent à votre solde.'
              : 'Pack credits never expire and stack on top of your balance.'}
          </p>
          <div className="packs-grid">
            {PACKS.map((pk) => (
              <div className="pack-card" key={pk.code} data-testid={`pack-${pk.code}`}>
                <div className="pack-name">{isFr ? pk.name_fr : pk.name_en}</div>
                <div className="pack-credits">
                  {pk.credits.toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                  {' '}
                  {isFr ? 'crédits' : 'credits'}
                </div>
                <div className="pack-price">{formatEur(pk.price_eur, isFr)}</div>
                <button
                  type="button"
                  className="pack-cta"
                  disabled={busy === `pack_${pk.code}`}
                  onClick={() => handleBuyPack(pk.code)}
                  data-testid={`buy-${pk.code}`}
                >
                  {busy === `pack_${pk.code}`
                    ? (isFr ? 'Redirection…' : 'Redirecting…')
                    : (isFr ? 'Acheter' : 'Buy')}
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer language={language} />
    </div>
  );
}
