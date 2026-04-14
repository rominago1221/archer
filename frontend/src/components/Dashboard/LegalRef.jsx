import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useDashboardT } from '../../hooks/useDashboardT';
import { getLegalRefUrl } from '../../utils/dashboard/legalRefs';

// Clickable legal reference.
// Props: reference = { label, archer_explanation?, jurisdiction_link? } | string
//        country = 'BE' | 'US'
//        language = 'fr' | 'en'
export default function LegalRef({ reference, country = 'BE', language = 'fr' }) {
  const t = useDashboardT(language);
  const [open, setOpen] = useState(false);

  const obj = typeof reference === 'string' ? { label: reference } : (reference || {});
  const label = obj.label || obj.reference || obj.citation || '';
  if (!label) return null;

  const explanation = obj.archer_explanation || obj.explanation || '';
  const sourceUrl = getLegalRefUrl(obj, country);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="legal-ref-link"
        style={{
          color: '#1a56db',
          background: 'none',
          border: 'none',
          borderBottom: '1px dotted #1a56db',
          padding: 0,
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'left',
        }}
      >
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.3 }}>
              {label}
            </DialogTitle>
          </DialogHeader>

          <div style={{
            fontSize: 9, fontWeight: 800, color: '#1a56db',
            letterSpacing: '1px', marginTop: 6, marginBottom: 8,
          }}>
            {t('legal_ref.explanation_title')}
          </div>
          <div style={{ fontSize: 13, color: '#0a0a0f', lineHeight: 1.55 }}>
            {explanation || t('legal_ref.no_explanation')}
          </div>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="legal-ref-source"
              style={{
                marginTop: 18,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                background: '#1a56db',
                color: '#ffffff',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t('legal_ref.view_source')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
