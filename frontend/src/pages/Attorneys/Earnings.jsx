import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import EarningsHero from '../../components/Attorneys/EarningsHero';
import EarningsChart from '../../components/Attorneys/EarningsChart';
import StripeConnectBand from '../../components/Attorneys/StripeConnectBand';
import PayoutsTable from '../../components/Attorneys/PayoutsTable';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';
import { useStripeConnect } from '../../hooks/attorneys/useStripeConnect';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function Earnings() {
  const { t } = useAttorneyT();
  const tx = t.earnings || {};
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const { openStripeDashboard } = useStripeConnect();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      attorneyApi.get('/attorneys/earnings/summary'),
      attorneyApi.get('/attorneys/earnings/chart?period=12m'),
      attorneyApi.get('/attorneys/earnings/payouts?limit=20'),
    ])
      .then(([s, c, p]) => {
        if (!mounted) return;
        setSummary(s.data);
        setChart(c.data.chart);
        setPayouts(p.data.payouts);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <AttorneyLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-neutral-200 rounded" />
          <div className="h-56 bg-neutral-200 rounded" />
        </div>
      </AttorneyLayout>
    );
  }

  // === Stripe not ready → empty state + CTA ===
  if (summary && !summary.stripe_ready) {
    return (
      <AttorneyLayout>
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="text-5xl mb-4">💳</div>
          <h1 className="font-serif text-3xl text-neutral-900 mb-3">
            {tx.empty_setup_stripe_title}
          </h1>
          <p className="text-neutral-600 mb-8">
            {tx.empty_setup_stripe_body}
          </p>
          <Link
            to="/attorneys/onboarding/stripe"
            className="inline-block bg-[#635bff] text-white font-medium px-6 py-3 rounded-lg hover:opacity-90"
          >
            {tx.empty_setup_stripe_cta} →
          </Link>
        </div>
      </AttorneyLayout>
    );
  }

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl text-neutral-900">{tx.title}</h1>
            <p className="text-sm text-neutral-500 mt-1">{tx.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openStripeDashboard}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              {tx.open_stripe} →
            </button>
          </div>
        </div>

        <EarningsHero summary={summary} />

        <div className="mt-6">
          <EarningsChart initialData={chart} initialPeriod="12m" />
        </div>

        <div className="mt-6">
          <StripeConnectBand ibanLast4={summary?.iban_last4} />
        </div>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
            {tx.history}
          </h2>
          <PayoutsTable payouts={payouts} />
        </section>
      </div>
    </AttorneyLayout>
  );
}
