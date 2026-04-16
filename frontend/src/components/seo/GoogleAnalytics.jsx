import React from 'react';
import { Helmet } from 'react-helmet-async';

const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <Helmet>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script>{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { anonymize_ip: true });
      `}</script>
    </Helmet>
  );
}

/**
 * Track custom events for conversion optimization.
 */
export function trackEvent(eventName, params) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}
