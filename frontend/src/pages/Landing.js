import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Briefcase, Home, Users, DollarSign, AlertCircle, Package, Star, Heart, CheckCircle, Plus, Minus } from 'lucide-react';
import JurisdictionLanguageBar from '../components/JurisdictionLanguageBar';
import JurisdictionPills from '../components/JurisdictionPills';
import { useAuth } from '../contexts/AuthContext';
import translations, { getStoredLocale, setStoredLocale, getLocaleFromPrefs } from '../data/landingTranslations';

const catIcons = [FileText, Briefcase, Home, Users, DollarSign, AlertCircle, Package, Star, Heart];
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const stored = getStoredLocale();
  const [locale, setLocale] = useState(stored);
  const [jurisdiction, setJurisdiction] = useState(stored.startsWith('be') ? 'BE' : 'US');
  const [language, setLanguage] = useState(stored.split('-')[1] || stored.split('-')[0] || 'en');
  const t = translations[locale] || translations['us-en'];

  const handleJurisdictionChange = (j) => {
    setJurisdiction(j);
    const newLocale = getLocaleFromPrefs(j, language);
    setLocale(newLocale);
    setStoredLocale(newLocale);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    const newLocale = getLocaleFromPrefs(jurisdiction, lang);
    setLocale(newLocale);
    setStoredLocale(newLocale);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-[#ebebeb] z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div onClick={() => navigate('/')} style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, letterSpacing: '-0.5px', color: '#1a56db', cursor: 'pointer' }} data-testid="landing-logo">Jasper</div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#555]">
            <a href="#how" className="hover:text-[#1a56db]">{t.nav.howItWorks}</a>
            <a href="#attorneys" className="hover:text-[#1a56db]">{t.nav.attorneys}</a>
            <a href="#pricing" className="hover:text-[#1a56db]">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-[#1a56db]">{t.nav.faq}</a>
          </div>
          <div className="flex items-center gap-3">
            <JurisdictionPills
              jurisdiction={jurisdiction}
              language={language}
              onSwitch={(j) => {
                handleJurisdictionChange(j);
                if (user) {
                  axios.put(`${API}/profile`, { jurisdiction: j, country: j }, { withCredentials: true }).catch(() => {});
                }
              }}
              onLanguageChange={(l) => {
                handleLanguageChange(l);
                if (user) {
                  axios.put(`${API}/profile`, { language: l }, { withCredentials: true }).catch(() => {});
                }
              }}
            />
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors" data-testid="nav-dashboard-btn">
                {locale.includes('fr') ? 'Mon Dashboard' : locale.includes('nl') ? 'Mijn Dashboard' : 'My Dashboard'}
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-sm text-[#555] hover:text-[#1a56db]" data-testid="nav-login-btn">{t.nav.signIn}</button>
                <button onClick={() => navigate('/signup')} className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors" data-testid="nav-signup-btn">{t.nav.getStarted}</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#eff6ff] text-[#1a56db] rounded-full text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a56db]"></span>
              {t.hero.badge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#111] leading-tight mb-5" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {t.hero.h1[0]}<br/>{t.hero.h1[1]}<br/><em className="not-italic text-[#1a56db]">{t.hero.h1[2]}</em>
            </h1>
            <p className="text-[#555] text-base leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.hero.sub) }} />
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={() => navigate('/signup')} className="px-6 py-3 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors" data-testid="hero-cta-btn">
                {t.hero.cta}
              </button>
              <button onClick={() => navigate('/lawyers')} className="px-6 py-3 bg-white text-[#1a56db] text-sm font-medium rounded-full border border-[#1a56db] hover:bg-[#eff6ff] transition-colors">
                {t.hero.ctaLawyer}
              </button>
            </div>
            <p className="text-xs text-[#999]">{t.hero.footnote}</p>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] rounded-3xl p-8 relative">
              <div className="w-24 h-24 rounded-full bg-[#1a56db] mx-auto mb-4 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-white rounded-full shadow-sm text-xs font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
                {t.hero.availableNow}
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 w-52">
                <div className="text-[10px] text-[#999] uppercase tracking-wide mb-1">{t.hero.riskLabel}</div>
                <div className="text-2xl font-bold text-[#dc2626]">78 / 100</div>
                <div className="h-1.5 bg-[#fee2e2] rounded-full mt-2 mb-2">
                  <div className="h-full w-[78%] bg-[#dc2626] rounded-full"></div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#dc2626]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"></span>
                  {t.hero.riskAction}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Cases Section */}
      <section className="py-16 px-6 bg-[#fafafa] border-t border-[#f0f0f0] text-center overflow-hidden">
        <div className="text-[11px] text-[#1a56db] uppercase tracking-wider font-medium mb-2">{t.animated.label}</div>
        <h2 className="text-2xl md:text-3xl font-medium text-[#0a0a0f] mb-2" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.5px' }}>
          {t.animated.h2[0]}<br/>{t.animated.h2[1]}
        </h2>
        <p className="text-sm text-[#aaa] mb-10">{t.animated.sub}</p>

        <div className="max-w-[680px] mx-auto bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-[#f5f5f5] px-3.5 py-2.5 flex items-center gap-2 border-b border-[#e8e8e8]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]"></div>
            <div className="flex-1 mx-2 px-3 py-1 bg-white border border-[#e0e0e0] rounded-md text-[11px] text-[#aaa] text-left">app.jasper.com/dashboard</div>
          </div>
          <div className="px-5 py-3.5 border-b border-[#f0f0f0] flex items-center justify-between bg-white">
            <div className="text-left">
              <div className="text-[13px] font-medium text-[#0a0a0f]">Good morning, Michael.</div>
              <div className="text-[11px] text-[#aaa] mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse"></span>
                3 cases require immediate action
              </div>
            </div>
            <div className="px-3.5 py-1.5 bg-[#1a56db] text-white text-[11px] font-medium rounded-full">+ New case</div>
          </div>
          <div className="h-[280px] overflow-hidden relative px-5 pt-4 group"
            onMouseEnter={(e) => { const track = e.currentTarget.querySelector('.jasper-track'); if (track) track.style.animationPlayState = 'paused'; }}
            onMouseLeave={(e) => { const track = e.currentTarget.querySelector('.jasper-track'); if (track) track.style.animationPlayState = 'running'; }}
          >
            <div className="jasper-track flex flex-col gap-2" style={{ animation: 'jasperScroll 25s linear infinite' }}>
              {[
                { cat: 'Traffic · Court notice', title: 'Speeding ticket — 89mph in 65mph zone · Court summons', action: 'Respond by Apr 14', detail: 'Fine up to $1,200 + license points', score: '82/100', risk: 'High risk', color: '#dc2626', bg: '#fff5f5' },
                { cat: 'Debt collection', title: 'Collector harassment — 12 calls in 3 days · FDCPA violation', action: 'Send cease & desist now', detail: '$4,800 claimed', score: '64/100', risk: 'Medium risk', color: '#f59e0b', bg: '#fef3c7' },
                { cat: 'Employment', title: 'Wrongful termination — demand letter · $8,400 claimed', action: 'Respond within 10 days', detail: 'Strong negotiation opportunity', score: '58/100', risk: 'Medium risk', color: '#f59e0b', bg: '#fef3c7' },
                { cat: 'Housing · Eviction', title: '3-Day Notice to Quit — unpaid rent $6,030', action: 'Respond by Apr 12', detail: 'Payment plan available', score: '85/100', risk: 'Critical', color: '#dc2626', bg: '#fff5f5' },
                { cat: 'Contract', title: 'NDA review — freelance client agreement resolved', action: 'Resolved — Jasper letter worked', detail: 'No action needed', score: '12/100', risk: 'Resolved', color: '#22c55e', bg: '#f0fdf4' },
                { cat: 'Consumer rights', title: 'Refund dispute — online purchase $890 · Merchant refusing', action: 'Chargeback letter ready', detail: 'FTC complaint option available', score: '44/100', risk: 'Low risk', color: '#1a56db', bg: '#eff6ff' },
                { cat: 'Immigration', title: 'Visa sponsorship contract — 3 unfair clauses identified', action: 'Review before signing', detail: 'Do not sign yet', score: '51/100', risk: 'Medium risk', color: '#f59e0b', bg: '#fef3c7' },
              ].concat([
                { cat: 'Traffic · Court notice', title: 'Speeding ticket — 89mph in 65mph zone · Court summons', action: 'Respond by Apr 14', detail: 'Fine up to $1,200 + license points', score: '82/100', risk: 'High risk', color: '#dc2626', bg: '#fff5f5' },
                { cat: 'Debt collection', title: 'Collector harassment — 12 calls in 3 days · FDCPA violation', action: 'Send cease & desist now', detail: '$4,800 claimed', score: '64/100', risk: 'Medium risk', color: '#f59e0b', bg: '#fef3c7' },
                { cat: 'Employment', title: 'Wrongful termination — demand letter · $8,400 claimed', action: 'Respond within 10 days', detail: 'Strong negotiation opportunity', score: '58/100', risk: 'Medium risk', color: '#f59e0b', bg: '#fef3c7' },
              ]).map((c, i) => (
                <div key={i} className="bg-white border border-[#ebebeb] rounded-r-xl p-3 flex items-center justify-between" style={{ borderLeft: `3px solid ${c.color}` }}>
                  <div className="text-left">
                    <div className="text-[9px] text-[#aaa] uppercase tracking-wider mb-0.5">{c.cat}</div>
                    <div className="text-[12px] font-medium text-[#0a0a0f] mb-1">{c.title}</div>
                    <div className="text-[10px] text-[#aaa] flex items-center gap-1.5">
                      <span style={{ color: c.color }} className="font-medium">{c.action}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[#ddd]"></span>
                      <span>{c.detail}</span>
                    </div>
                  </div>
                  <div className="text-center ml-3">
                    <div className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>{c.score}</div>
                    <div className="text-[9px] text-[#aaa] mt-1">{c.risk}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          </div>
          <div className="px-5 py-2.5 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <div className="text-[11px] text-[#555] text-left" dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.animated.aiBar) }} />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-[#f8f8f8] py-6 border-y border-[#ebebeb]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div><div className="text-2xl font-bold text-[#111]">{t.stats.docs}</div><div className="text-xs text-[#999]">{t.stats.docsLabel}</div></div>
          <div><div className="text-2xl font-bold text-[#111]">{t.stats.users}</div><div className="text-xs text-[#999]">{t.stats.usersLabel}</div></div>
          <div><div className="text-2xl font-bold text-[#111]">{t.stats.saved}</div><div className="text-xs text-[#999]">{t.stats.savedLabel}</div></div>
          <div><div className="text-2xl font-bold text-[#111]">{t.stats.rating}</div><div className="text-xs text-[#999]">{t.stats.ratingLabel}</div></div>
        </div>
      </div>

      {/* Trust Bar */}
      <div className="py-4 border-b border-[#ebebeb]">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#555]">
          {t.trust.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#eff6ff] flex items-center justify-center"><CheckCircle size={10} className="text-[#1a56db]" /></div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Press Bar */}
      <div className="py-6 bg-[#fafafa]">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center gap-8">
          <span className="text-xs text-[#999]">{t.press}</span>
          {['FORBES', 'TechCrunch', 'ABA Journal', 'WIRED', 'Business Insider'].map((logo) => (
            <span key={logo} className="text-sm font-semibold text-[#ccc]">{logo}</span>
          ))}
        </div>
      </div>

      {/* What Jasper Handles */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.categories.sectionLabel}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.categories.h2}</h2>
            <p className="text-sm text-[#666] max-w-xl mx-auto">{t.categories.sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.categories.items.map((cat, i) => {
              const Icon = catIcons[i] || FileText;
              return (
                <div key={i} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center mb-3"><Icon size={16} className="text-[#1a56db]" /></div>
                  <div className="text-sm font-semibold text-[#111] mb-1">{cat.title}</div>
                  <div className="text-xs text-[#666] mb-2 leading-relaxed">{cat.desc}</div>
                  <span className={`badge ${cat.badgeClass} text-[10px]`}>{cat.badge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 px-6 bg-[#f8f8f8]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.problem.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.problem.h2}</h2>
            <p className="text-sm text-[#555] leading-relaxed mb-4">{t.problem.p}</p>
            <div className="space-y-2">
              {t.problem.steps.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[#444]">
                  <div className="w-4 h-4 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0"><CheckCircle size={10} className="text-[#1a56db]" /></div>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="bg-[#eff6ff] rounded-lg p-4 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#dbeafe] flex items-center justify-center"><FileText size={14} className="text-[#1a56db]" /></div>
              <div>
                <div className="text-sm font-medium text-[#111]">{t.problem.mockFile}</div>
                <div className="text-xs text-[#1a56db]">{t.problem.mockAnalyzing}</div>
              </div>
            </div>
            <div className="bg-white border border-[#ebebeb] rounded-xl p-4">
              <div className="text-[10px] text-[#999] uppercase tracking-wide mb-1">{t.hero.riskLabel}</div>
              <div className="text-xl font-bold text-[#dc2626] mb-2">{t.problem.mockScore}</div>
              <div className="h-2 bg-[#fee2e2] rounded-full mb-3"><div className="h-full w-[78%] bg-[#dc2626] rounded-full"></div></div>
              <div className="text-xs text-[#dc2626] font-medium mb-3 flex items-center gap-1"><span>&#9889;</span> {t.problem.mockAction}</div>
              <div className="space-y-1.5">
                {t.problem.mockFindings.map((tag) => (
                  <div key={tag} className="flex items-center gap-2 text-xs text-[#444]"><span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"></span>{tag}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-6" id="how">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.howItWorks.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111]" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.howItWorks.h2}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.howItWorks.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#1a56db] text-white font-bold flex items-center justify-center mx-auto mb-3">{i + 1}</div>
                <div className="text-sm font-semibold text-[#111] mb-1">{step.title}</div>
                <div className="text-xs text-[#666]">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Talk to a Lawyer Now */}
      <section className="py-16 px-6 bg-[#1a56db]" id="lawyers-now">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white rounded-full text-xs font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
              {t.lawyersCta.badge}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.lawyersCta.h2[0]}<br/>{t.lawyersCta.h2[1]}</h2>
            <p className="text-sm text-[#93c5fd] leading-relaxed mb-6">{t.lawyersCta.p}</p>
            <button onClick={() => navigate('/lawyers')} className="px-6 py-3 bg-white text-[#1a56db] text-sm font-medium rounded-full hover:bg-[#f8f8f8] transition-colors">
              {t.lawyersCta.cta}
            </button>
            <p className="text-xs text-[#93c5fd] mt-3">{t.lawyersCta.footnote}</p>
          </div>
          <div className="space-y-3">
            {t.lawyers.map((lawyer, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {lawyer.photo ? <img src={lawyer.photo} alt={lawyer.name} className="w-full h-full object-cover" /> : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#111]">{lawyer.name}</div>
                  <div className="text-xs text-[#666]">{lawyer.specialty} · {lawyer.bar.split(' ')[0]} Bar</div>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lawyer.status === 'now' ? '#22c55e' : '#f59e0b' }}></span>
                    <span style={{ color: lawyer.status === 'now' ? '#16a34a' : '#d97706', fontWeight: 500 }}>
                      {lawyer.status === 'now' ? t.lawyersCta.availableNow : `${t.lawyersCta.availableIn} ${lawyer.status}`}
                    </span>
                  </div>
                </div>
                <button onClick={() => navigate(`/lawyers`)} className="px-4 py-2 bg-[#1a56db] text-white text-xs font-medium rounded-full hover:bg-[#1546b3]">{t.lawyersCta.cta.split(' — ')[0]}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Attorneys */}
      <section className="py-16 px-6 bg-[#f8f8f8]" id="attorneys">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.lawyersSection.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111]" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.lawyersSection.h2}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.lawyers.map((lawyer, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] flex items-center justify-center">
                  {lawyer.photo ? <img src={lawyer.photo} alt={lawyer.name} className="w-full h-full object-cover" /> : (
                    <div className="w-16 h-16 rounded-full bg-[#1a56db] flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-[#111]">{lawyer.name}</div>
                  <div className="text-xs text-[#666] mb-2">{lawyer.specialty} · {lawyer.bar} · {lawyer.years} yrs</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {lawyer.tags.map((tag, j) => <span key={j} className="badge badge-blue text-[10px]">{tag}</span>)}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#f59e0b]">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                    <span className="text-[#111] font-medium">{lawyer.rating}</span>
                    <span className="text-[#999]">&middot; {lawyer.sessions} sessions</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.pricing.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111]" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.pricing.h2}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="card p-6">
              <div className="text-lg font-semibold text-[#111] mb-1">{t.pricing.free.name}</div>
              <div className="text-3xl font-bold text-[#111]">{t.pricing.free.price}</div>
              <div className="text-xs text-[#999] mb-4">{t.pricing.free.period}</div>
              <button onClick={() => navigate('/signup')} className="w-full py-2.5 border border-[#1a56db] text-[#1a56db] text-sm font-medium rounded-full hover:bg-[#eff6ff] mb-4">{t.pricing.free.cta}</button>
              <div className="space-y-2 text-xs text-[#444]">
                {t.pricing.free.features.map((f) => <div key={f} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1a56db]"></span>{f}</div>)}
                {t.pricing.free.disabled.map((f) => <div key={f} className="flex items-center gap-2 text-[#ccc]"><span className="w-1.5 h-1.5 rounded-full bg-[#ccc]"></span>{f}</div>)}
              </div>
            </div>
            {/* Pro */}
            <div className="card p-6 border-2 border-[#1a56db] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#1a56db] text-white text-[10px] font-medium rounded-full">{t.pricing.pro.badge}</div>
              <div className="text-lg font-semibold text-[#111] mb-1">{t.pricing.pro.name}</div>
              <div className="text-3xl font-bold text-[#111]">{t.pricing.pro.price}</div>
              <div className="text-xs text-[#999] mb-4">{t.pricing.pro.period}</div>
              <button onClick={() => navigate('/signup')} className="w-full py-2.5 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] mb-4">{t.pricing.pro.cta}</button>
              <div className="space-y-2 text-xs text-[#444]">
                {t.pricing.pro.features.map((f) => <div key={f} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1a56db]"></span>{f}</div>)}
              </div>
            </div>
            {/* Attorney */}
            <div className="card p-6">
              <div className="text-lg font-semibold text-[#111] mb-1">{t.pricing.attorney.name}</div>
              <div className="text-3xl font-bold text-[#111]">{t.pricing.attorney.price}</div>
              <div className="text-xs text-[#999] mb-4">{t.pricing.attorney.period}</div>
              <button onClick={() => navigate('/lawyers')} className="w-full py-2.5 border border-[#1a56db] text-[#1a56db] text-sm font-medium rounded-full hover:bg-[#eff6ff] mb-4">{t.pricing.attorney.cta}</button>
              <div className="space-y-2 text-xs text-[#444]">
                {t.pricing.attorney.features.map((f) => <div key={f} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1a56db]"></span>{f}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 px-6 bg-[#f8f8f8]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.reviews.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111]" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.reviews.h2}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.reviews.items.map((review, i) => (
              <div key={i} className="card p-5">
                <div className="text-[#f59e0b] mb-3">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <div className="text-sm text-[#444] leading-relaxed mb-4">{review.text}</div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#dbeafe]"></div>
                  <div>
                    <div className="text-sm font-medium text-[#111]">{review.name}</div>
                    <div className="text-xs text-[#999]">{review.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-semibold mb-2">{t.faq.label}</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111]" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.faq.h2}</h2>
          </div>
          <div className="space-y-3">
            {t.faq.items.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button className="w-full p-4 flex items-center justify-between text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-sm font-medium text-[#111]">{faq.q}</span>
                  {openFaq === i ? <Minus size={16} className="text-[#1a56db]" /> : <Plus size={16} className="text-[#999]" />}
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-[#666] leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-[#1a56db] text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>{t.finalCta.h2[0]}<br/>{t.finalCta.h2[1]}</h2>
        <p className="text-[#93c5fd] mb-8">{t.finalCta.p}</p>
        <button onClick={() => navigate('/signup')} className="px-8 py-3.5 bg-white text-[#1a56db] font-medium rounded-full hover:bg-[#f8f8f8] transition-colors" data-testid="final-cta-btn">
          {t.finalCta.cta}
        </button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#111] text-center">
        <div className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Jasper</div>
        <p className="text-xs text-[#666] max-w-2xl mx-auto">{t.footer} &middot; &copy; 2026 Jasper Inc.</p>
      </footer>
    </div>
  );
};

export default Landing;
