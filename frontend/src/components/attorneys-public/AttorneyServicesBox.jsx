/**
 * Attorneys page — Hero right column.
 *
 * Single box with an animated conic-gradient beam border that presents
 * both attorney services (signed letter + live call) side by side.
 * Replaces the previous 3-card stack (Marie / 70% callout / Julien).
 *
 * Prices format through `formatCurrency(amount, country, language)` so
 * US sees "$49.99" / "$90" while BE/EU sees "49,99€" / "90€".
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useAttorneysT } from '../../hooks/useAttorneysT';
import { formatCurrency } from '../../utils/dashboard/formatCurrency';
import annaVerhaegen from '../../assets/attorneys/anna-verhaegen.jpg';
import lucasMertens from '../../assets/attorneys/lucas-mertens.jpg';

export default function AttorneyServicesBox({ language = 'en', country = 'BE' }) {
  const t = useAttorneysT(language);
  const base = 'hero.services_box';

  const letterPrice = formatCurrency(49.99, country, language);
  const callPrice = formatCurrency(90, country, language);

  return (
    <div className="services-box" data-testid="attorney-services-box">
      <div className="services-box-inner">
        <div className="services-box-header">
          <span className="services-box-title">{t(`${base}.validated_label`)}</span>
          <span className="services-box-pill-live">
            {t(`${base}.online_count`, { count: 14 })}
          </span>
        </div>

        <div className="services-box-split">
          <Link
            to="/signup"
            className="services-box-opt primary"
            data-testid="services-box-letter"
          >
            <div className="services-box-opt-label">{t(`${base}.letter_label`)}</div>
            <img
              className="services-box-avatar"
              src={annaVerhaegen}
              alt="Anna Verhaegen"
            />
            <div className="services-box-name">Anna Verhaegen</div>
            <div className="services-box-bar">{t(`${base}.letter_bar`)}</div>
            <div className="services-box-price">{letterPrice}</div>
            <div className="services-box-price-sub">{t(`${base}.sent_24h`)}</div>
          </Link>

          <Link
            to="/signup"
            className="services-box-opt"
            data-testid="services-box-call"
          >
            <div className="services-box-opt-label">{t(`${base}.call_label`)}</div>
            <img
              className="services-box-avatar"
              src={lucasMertens}
              alt="Lucas Mertens"
            />
            <div className="services-box-name">Lucas Mertens</div>
            <div className="services-box-bar">{t(`${base}.call_bar`)}</div>
            <div className="services-box-price">{callPrice}</div>
            <div className="services-box-price-sub">{t(`${base}.duration_30min`)}</div>
          </Link>
        </div>

        <div className="services-box-footer">
          <span>✓ {t(`${base}.trust_bar_certified`)}</span>
          <span>✓ <strong>{t(`${base}.trust_money_back`)}</strong></span>
          <span>✓ {t(`${base}.trust_no_sub`)}</span>
        </div>
      </div>
    </div>
  );
}
