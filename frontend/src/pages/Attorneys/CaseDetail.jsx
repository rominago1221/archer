import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import CountdownTimer from '../../components/Attorneys/CountdownTimer';
import CaseStrategyList from '../../components/Attorneys/CaseStrategyList';
import CaseDocumentList from '../../components/Attorneys/CaseDocumentList';
import CaseClientCard from '../../components/Attorneys/CaseClientCard';
import EarningsBreakdown from '../../components/Attorneys/EarningsBreakdown';
import UploadSignedLetter from '../../components/Attorneys/UploadSignedLetter';
import AcceptModal from '../../components/Attorneys/AcceptModal';
import DeclineModal from '../../components/Attorneys/DeclineModal';
import { useToast } from '../../components/Attorneys/Toasts';
import { useCaseDetail } from '../../hooks/attorneys/useCaseDetail';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';


function StatusBanner({ caseData, onAccept, onDecline, onExpire, t }) {
  const s = caseData.status;
  const ext = t.case_ext || {};
  if (s === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-medium text-amber-900">{ext.pending_banner}</div>
            <div className="text-xs text-amber-800 mt-1">
              {ext.expires_label} <CountdownTimer expiresAt={caseData.expires_at} onExpire={onExpire} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDecline}
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              {t.case?.actions?.decline || 'Decline'}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="text-sm px-4 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
            >
              {t.case?.actions?.accept || 'Accept this case'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (s === 'accepted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium text-emerald-900">{ext.accepted_banner}</div>
        <div className="text-xs text-emerald-800 mt-1">
          {ext.deadline_label} <CountdownTimer expiresAt={caseData.deadline_at} />
        </div>
      </div>
    );
  }
  if (s === 'completed') {
    return (
      <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium text-neutral-900">{ext.completed_banner}</div>
        {caseData.completed_at && (
          <div className="text-xs text-neutral-600 mt-1">
            {new Date(caseData.completed_at).toLocaleString()}
          </div>
        )}
      </div>
    );
  }
  if (s === 'expired' || s === 'declined') {
    const label = s === 'expired' ? ext.expired_banner : ext.declined_banner;
    return (
      <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 mb-6 text-sm text-neutral-600">
        {label}
      </div>
    );
  }
  return null;
}


export default function CaseDetail() {
  const { assignmentId } = useParams();
  const nav = useNavigate();
  const { t } = useAttorneyT();
  const toast = useToast();
  const { caseData, loading, error, accept, decline, uploadLetter, refetch } = useCaseDetail(assignmentId);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  if (loading) {
    return (
      <AttorneyLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-1/3" />
          <div className="h-32 bg-neutral-200 rounded" />
          <div className="h-64 bg-neutral-200 rounded" />
        </div>
      </AttorneyLayout>
    );
  }
  if (error) return <AttorneyLayout><div className="text-red-600">{error}</div></AttorneyLayout>;
  if (!caseData) return null;

  const { case: caseInfo, ai_analysis, documents, client, signed_letter, earnings_breakdown } = caseData;

  const onAcceptConfirm = async () => {
    try {
      await accept();
      toast.push({ kind: 'success', message: 'Case accepted ✓' });
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail || 'Error';
      if (status === 410) {
        toast.push({ kind: 'error', message: 'Case expired while you were deciding.' });
        refetch();
      } else if (status === 409) {
        toast.push({ kind: 'warning', message: detail });
        refetch();
      } else {
        toast.push({ kind: 'error', message: detail });
      }
      throw e;
    }
  };

  const onDeclineConfirm = async ({ reason, notes }) => {
    try {
      await decline({ reason, notes });
      toast.push({ kind: 'info', message: 'Case declined' });
      setTimeout(() => nav('/attorneys/inbox'), 400);
    } catch (e) {
      toast.push({ kind: 'error', message: e.response?.data?.detail || 'Error' });
      throw e;
    }
  };

  const onExpire = () => {
    toast.push({ kind: 'error', message: 'Case expired' });
    refetch();
  };

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <button
          onClick={() => nav('/attorneys/inbox')}
          className="text-sm text-neutral-500 hover:text-neutral-900 mb-4"
        >
          {t.case?.back_to_inbox || '← Back to Inbox'}
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-neutral-500">#{caseInfo.case_number}</span>
            <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">
              {caseInfo.case_type}
            </span>
            <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
              {caseInfo.service_type === 'live_counsel' ? 'Live Counsel' : 'Letter'}
            </span>
            {ai_analysis.win_probability != null && (
              <span className="text-[11px] uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                Win {ai_analysis.win_probability}%
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl text-neutral-900">{caseInfo.title}</h1>
          <div className="flex gap-4 text-sm text-neutral-500 mt-1 flex-wrap">
            {caseInfo.jurisdiction && <span>{caseInfo.jurisdiction}</span>}
            {ai_analysis.violations_identified?.length > 0 && (
              <span>{ai_analysis.violations_identified.length} violations identified</span>
            )}
          </div>
        </div>

        <StatusBanner
          caseData={caseData}
          onAccept={() => setAcceptOpen(true)}
          onDecline={() => setDeclineOpen(true)}
          onExpire={onExpire}
          t={t}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8 min-w-0">
            <section>
              <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                {t.case?.ai_summary_title || 'AI Case Summary'}
              </h2>
              <div className="bg-white border border-neutral-200 rounded-lg p-5">
                <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">
                  {ai_analysis.summary_full || '—'}
                </p>
              </div>
            </section>

            {ai_analysis.violations_identified?.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                  {(t.case_ext || {}).violations_identified}
                </h2>
                <ul className="space-y-2">
                  {ai_analysis.violations_identified.map((v, i) => (
                    <li key={i} className="bg-white border border-neutral-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-neutral-900">{v.title}</div>
                      {v.description && (
                        <div className="text-sm text-neutral-600 mt-1">{v.description}</div>
                      )}
                      {v.law_reference && (
                        <div className="text-xs text-neutral-500 mt-2 font-mono">
                          {v.law_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                {t.case?.strategy_title || 'AI-Generated Strategy'}
              </h2>
              <CaseStrategyList strategies={ai_analysis.strategies || []} />
            </section>

            <section>
              <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                {t.case?.documents_title || 'Case Documents'}
              </h2>
              <CaseDocumentList documents={documents || []} />
            </section>

            {caseData.status === 'accepted' && (
              <>
                <section>
                  <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                    {t.case?.draft_letter_title || 'Draft Attorney Letter'}
                  </h2>
                  <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-lg p-6 text-sm text-neutral-500 text-center">
                    {(t.case_ext || {}).draft_coming_soon}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                    {t.case?.upload_letter_title || 'Upload Signed Letter'}
                  </h2>
                  <UploadSignedLetter
                    disabled={false}
                    uploaded={signed_letter?.uploaded}
                    onUpload={uploadLetter}
                    onToast={toast.push}
                  />
                </section>
              </>
            )}

            {caseData.status === 'completed' && signed_letter?.uploaded && (
              <section>
                <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
                  Signed letter
                </h2>
                <div className="bg-white border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700">
                  Uploaded {signed_letter.uploaded_at && new Date(signed_letter.uploaded_at).toLocaleString()}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <aside className="space-y-4">
            <CaseClientCard client={client} />

            {caseData.status === 'pending' && (
              <div className="bg-white border border-neutral-200 rounded-lg p-5">
                <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-2">
                  {(t.case_ext || {}).acceptance_window}
                </div>
                <div className="text-3xl">
                  <CountdownTimer expiresAt={caseData.expires_at} onExpire={onExpire} />
                </div>
              </div>
            )}
            {caseData.status === 'accepted' && (
              <div className="bg-white border border-neutral-200 rounded-lg p-5">
                <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-2">
                  {(t.case_ext || {}).deadline}
                </div>
                <div className="text-3xl">
                  <CountdownTimer expiresAt={caseData.deadline_at} />
                </div>
              </div>
            )}

            <EarningsBreakdown breakdown={earnings_breakdown} />
          </aside>
        </div>
      </div>

      <AcceptModal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        onConfirm={onAcceptConfirm}
      />
      <DeclineModal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={onDeclineConfirm}
      />
    </AttorneyLayout>
  );
}
