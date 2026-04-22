import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { CheckCircle, AlertCircle, Download, Trash2, Loader2, CreditCard, Shield, Mail, Wifi, WifiOff, Eye, AlertTriangle, XCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [state, setState] = useState(user?.state_of_residence || '');
  const [country, setCountry] = useState(user?.jurisdiction || user?.country || 'US');
  const [region, setRegion] = useState(user?.region || '');
  const [language, setLanguage] = useState((user?.language || 'en').replace(/-.*/, ''));

  // Notification state
  const [notifRiskScore, setNotifRiskScore] = useState(user?.notif_risk_score ?? true);
  const [notifDeadlines, setNotifDeadlines] = useState(user?.notif_deadlines ?? true);
  const [notifCalls, setNotifCalls] = useState(user?.notif_calls ?? true);
  const [notifLawyers, setNotifLawyers] = useState(user?.notif_lawyers ?? false);
  const [notifPromo, setNotifPromo] = useState(user?.notif_promo ?? false);

  // Privacy state
  const [dataSharing, setDataSharing] = useState(user?.data_sharing ?? true);
  const [improveAi, setImproveAi] = useState(user?.improve_ai ?? true);

  // Risk Monitor state
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const tabs = [
    { key: 'account', label: 'Account' },
    { key: 'plan', label: 'Plan & billing' },
    { key: 'monitor', label: 'Risk Monitor', icon: Shield },
    { key: 'notifications', label: 'Notifications' },
    { key: 'privacy', label: 'Privacy' }
  ];

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming', 'Washington DC'
  ];

  const fetchMonitorStatus = useCallback(async () => {
    setMonitorLoading(true);
    try {
      const res = await axios.get(`${API}/risk-monitor/status`, { withCredentials: true });
      setMonitorStatus(res.data);
    } catch (err) {
      console.error('Monitor status error:', err);
    } finally {
      setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'monitor') fetchMonitorStatus();
  }, [activeTab, fetchMonitorStatus]);

  const handleConnectEmail = async (provider) => {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API}/risk-monitor/connect`, { provider }, { withCredentials: true });
      setMessage({ type: 'success', text: res.data.message });
      await fetchMonitorStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Connection failed' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(`${API}/risk-monitor/disconnect`, {}, { withCredentials: true });
      setMonitorStatus(prev => ({ ...prev, connected: false }));
      setMessage({ type: 'success', text: 'Email monitoring disconnected' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await axios.put(`${API}/risk-monitor/alerts/${alertId}/dismiss`, {}, { withCredentials: true });
      setMonitorStatus(prev => ({
        ...prev,
        alerts: prev.alerts.map(a => a.alert_id === alertId ? { ...a, status: 'dismissed' } : a)
      }));
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API}/profile`, { name, phone, state_of_residence: state, jurisdiction: country, country, region, language }, { withCredentials: true });
      updateUser({ name, phone, state_of_residence: state, jurisdiction: country, country, region, language });
      setMessage({ type: 'success', text: 'Profile saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API}/profile`, {
        notif_risk_score: notifRiskScore, notif_deadlines: notifDeadlines, notif_calls: notifCalls,
        notif_lawyers: notifLawyers, notif_promo: notifPromo
      }, { withCredentials: true });
      updateUser({ notif_risk_score: notifRiskScore, notif_deadlines: notifDeadlines, notif_calls: notifCalls, notif_lawyers: notifLawyers, notif_promo: notifPromo });
      setMessage({ type: 'success', text: 'Notification preferences saved' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API}/profile`, { data_sharing: dataSharing, improve_ai: improveAi }, { withCredentials: true });
      updateUser({ data_sharing: dataSharing, improve_ai: improveAi });
      setMessage({ type: 'success', text: 'Privacy settings saved' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <div className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} data-testid="toggle"></div>
  );

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await axios.post(`${API}/payments/checkout`, {
        package_id: 'pro_monthly', origin_url: window.location.origin
      }, { withCredentials: true });
      window.location.href = res.data.url;
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      setUpgrading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'high') return <AlertCircle size={14} className="text-[#dc2626]" />;
    if (severity === 'medium') return <AlertTriangle size={14} className="text-[#d97706]" />;
    return <Eye size={14} className="text-[#6b7280]" />;
  };

  return (
    <div data-testid="settings-page">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="max-w-xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#f5f5f5] rounded-xl mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === tab.key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'
              }`}
              onClick={() => { setActiveTab(tab.key); setMessage(null); }}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon && <tab.icon size={14} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fef2f2] text-[#dc2626]'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Personal information</div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Full name</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name-input" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input bg-[#f8f8f8]" value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 234-5678" data-testid="settings-phone-input" />
                </div>
                <div>
                  <label className="form-label">Legal jurisdiction</label>
                  <select className="form-input" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(''); }} data-testid="settings-jurisdiction-select">
                    <option value="US">{'\u{1F1FA}\u{1F1F8}'} United States — US Federal + State Law</option>
                    <option value="BE">{'\u{1F1E7}\u{1F1EA}'} Belgium — Belgian Federal + Regional Law</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Interface language</label>
                  <select className="form-input" value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="settings-language-select">
                    <option value="en">{'\u{1F1EC}\u{1F1E7}'} English</option>
                    <option value="fr">{'\u{1F1EB}\u{1F1F7}'} Fran{'\u00e7'}ais</option>
                    <option value="nl">{'\u{1F1F3}\u{1F1F1}'} Nederlands</option>
                    <option value="de">{'\u{1F1E9}\u{1F1EA}'} Deutsch</option>
                    <option value="es">{'\u{1F1EA}\u{1F1F8}'} Espa{'\u00f1'}ol</option>
                  </select>
                </div>
                {country === 'BE' && (
                  <>
                    <div>
                      <label className="form-label">Region</label>
                      <select className="form-input" value={region} onChange={(e) => setRegion(e.target.value)} data-testid="settings-region-select">
                        <option value="">Select a region</option>
                        <option value="Wallonie">Wallonie</option>
                        <option value="Bruxelles-Capitale">Bruxelles-Capitale</option>
                        <option value="Flandre">Vlaanderen / Flandre</option>
                        <option value="Communaute germanophone">Communaute germanophone</option>
                      </select>
                    </div>
                  </>
                )}
                {/* FREEZE US — state selector masqué (réactiver M6+). */}
                {false && country === 'US' && (
                  <div>
                    <label className="form-label">State of residence</label>
                    <select className="form-input" value={state} onChange={(e) => setState(e.target.value)} data-testid="settings-state-select">
                      <option value="">Select a state</option>
                      {states.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                <button onClick={handleSaveProfile} disabled={saving} className="btn-pill btn-blue" data-testid="save-profile-btn">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Password</div>
              <div className="space-y-4">
                <div><label className="form-label">Current password</label><input type="password" className="form-input" placeholder="••••••••" disabled /></div>
                <div><label className="form-label">New password</label><input type="password" className="form-input" placeholder="Min. 8 characters" disabled /></div>
                <button className="btn-pill btn-outline" disabled>Update password</button>
                <p className="text-xs text-[#9ca3af]">Password changes are managed through Google OAuth.</p>
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#dc2626] mb-4">Danger zone</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#111827]">Delete my account</div>
                  <div className="text-xs text-[#6b7280]">Permanently delete your account and all cases</div>
                </div>
                <button className="px-4 py-2 text-sm text-[#dc2626] bg-[#fff5f5] border border-[#fecaca] rounded-lg hover:bg-[#fee2e2] transition-colors">Delete account</button>
              </div>
            </div>
          </div>
        )}

        {/* Plan & Billing Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="card p-5 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] border-[#93c5fd]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold text-[#1d4ed8]">{user?.plan === 'pro' ? 'Pro plan' : 'Free plan'}</div>
                  <div className="text-xs text-[#3b82f6]">{user?.plan === 'pro' ? 'Active · Renews Dec 15, 2026' : 'Limited to 1 document'}</div>
                </div>
                <div className="text-right">
                  {/* FREEZE US — prix affiché en EUR (BE only). */}
                  <div className="text-2xl font-semibold text-[#111827]">€{user?.plan === 'pro' ? '69' : '0'}</div>
                  <div className="text-xs text-[#6b7280]">/month</div>
                </div>
              </div>
              <div className="space-y-2">
                {['Unlimited document analyses', 'Full risk reports + Dynamic Risk Score', 'Live case files with document history'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-[#3b82f6]">
                    <CheckCircle size={12} className="text-[#1d4ed8]" /><span>{feature}</span>
                  </div>
                ))}
              </div>
              {user?.plan === 'free' && (
                <button onClick={handleUpgrade} disabled={upgrading} className="w-full btn-pill btn-blue mt-4 flex items-center justify-center gap-2" data-testid="upgrade-btn">
                  {upgrading ? (<><Loader2 size={16} className="animate-spin" />Redirecting to checkout...</>) : (<><CreditCard size={16} />Upgrade to Pro — $69/month</>)}
                </button>
              )}
            </div>
            {user?.plan === 'pro' && (
              <>
                <div className="card p-5">
                  <div className="text-sm font-semibold text-[#111827] mb-4">Payment method</div>
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium text-[#111827]">Visa ending in 4242</div><div className="text-xs text-[#6b7280]">Expires 12/2027</div></div>
                    <button className="btn-pill btn-outline text-sm py-2">Update</button>
                  </div>
                </div>
                <div className="card p-5">
                  <div className="text-sm font-semibold text-[#111827] mb-4">Billing history</div>
                  <div className="space-y-3">
                    {[
                      { date: 'November 2026', desc: 'Pro plan · Nov 15', amount: '$69.00' },
                      { date: 'October 2026', desc: 'Pro plan · Oct 15', amount: '$69.00' },
                      { date: 'Attorney call', desc: 'Archer Carter · Oct 8', amount: '$149.00' }
                    ].map((item) => (
                      <div key={item.date} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                        <div><div className="text-sm font-medium text-[#111827]">{item.date}</div><div className="text-xs text-[#6b7280]">{item.desc}</div></div>
                        <div className="text-sm font-medium text-[#111827]">{item.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn-pill btn-outline text-[#dc2626] border-[#fecaca] hover:bg-[#fff5f5]">Cancel subscription</button>
              </>
            )}
          </div>
        )}

        {/* Risk Monitor Tab */}
        {activeTab === 'monitor' && (
          <div className="space-y-6" data-testid="risk-monitor-tab">
            {/* Status Card */}
            <div className={`card p-5 ${monitorStatus?.connected ? 'bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] border-[#fbbf24]' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${monitorStatus?.connected ? 'bg-[#d97706]' : 'bg-[#f5f5f5]'}`}>
                  <Shield size={20} className={monitorStatus?.connected ? 'text-white' : 'text-[#9ca3af]'} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#111827]">Archer Risk Monitor</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${monitorStatus?.connected ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`}></span>
                    <span className="text-xs text-[#6b7280]">
                      {monitorLoading ? 'Loading...' : monitorStatus?.connected ? `Connected to ${monitorStatus.provider?.charAt(0).toUpperCase()}${monitorStatus.provider?.slice(1)}` : 'Not connected'}
                    </span>
                  </div>
                </div>
              </div>

              {monitorStatus?.connected ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/80 rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-[#111827]">{monitorStatus.emails_scanned}</div>
                      <div className="text-[10px] text-[#6b7280]">Emails scanned</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-[#d97706]">{monitorStatus.threats_detected}</div>
                      <div className="text-[10px] text-[#6b7280]">Threats detected</div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-[#16a34a]">{monitorStatus.emails_scanned - monitorStatus.threats_detected}</div>
                      <div className="text-[10px] text-[#6b7280]">Safe</div>
                    </div>
                  </div>
                  {monitorStatus.last_scan && (
                    <div className="text-xs text-[#6b7280] mb-3">
                      Last scan: {new Date(monitorStatus.last_scan).toLocaleString()}
                    </div>
                  )}
                  <button onClick={handleDisconnect} className="btn-pill btn-outline text-[#dc2626] border-[#fecaca] hover:bg-[#fff5f5] flex items-center gap-2" data-testid="disconnect-monitor-btn">
                    <WifiOff size={14} /> Disconnect
                  </button>
                </>
              ) : (
                <div>
                  <p className="text-xs text-[#6b7280] mb-4">
                    Connect your email to automatically detect incoming legal documents, contracts, and deadlines. Archer scans your inbox for threats in real-time.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleConnectEmail('gmail')}
                      disabled={connecting}
                      className="p-4 rounded-xl border-2 border-[#e5e7eb] hover:border-[#fbbf24] transition-all text-center"
                      data-testid="connect-gmail-btn"
                    >
                      {connecting ? <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#d97706]" /> : <Mail size={24} className="mx-auto mb-2 text-[#dc2626]" />}
                      <div className="text-sm font-medium text-[#111827]">Gmail</div>
                      <div className="text-[10px] text-[#6b7280]">Google Workspace</div>
                    </button>
                    <button
                      onClick={() => handleConnectEmail('outlook')}
                      disabled={connecting}
                      className="p-4 rounded-xl border-2 border-[#e5e7eb] hover:border-[#fbbf24] transition-all text-center"
                      data-testid="connect-outlook-btn"
                    >
                      {connecting ? <Loader2 size={24} className="mx-auto mb-2 animate-spin text-[#d97706]" /> : <Mail size={24} className="mx-auto mb-2 text-[#1a56db]" />}
                      <div className="text-sm font-medium text-[#111827]">Outlook</div>
                      <div className="text-[10px] text-[#6b7280]">Microsoft 365</div>
                    </button>
                  </div>
                  <div className="mt-3 px-3 py-2 bg-[#fffbeb] border border-[#fde68a] rounded-lg">
                    <div className="text-[10px] text-[#92400e]">
                      <strong>Demo mode:</strong> Connection is simulated. Full Gmail/Outlook integration requires OAuth credentials.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {monitorStatus?.connected && monitorStatus.alerts?.length > 0 && (
              <div className="card p-5" data-testid="monitor-alerts">
                <div className="text-sm font-semibold text-[#111827] mb-4">Detected threats</div>
                <div className="space-y-3">
                  {monitorStatus.alerts.filter(a => a.status !== 'dismissed').map((alert) => (
                    <div key={alert.alert_id} className={`p-3 rounded-xl border ${
                      alert.severity === 'high' ? 'bg-[#fef2f2] border-[#fecaca]' :
                      alert.severity === 'medium' ? 'bg-[#fffbeb] border-[#fde68a]' :
                      'bg-[#f8f8f8] border-[#e5e7eb]'
                    }`} data-testid={`alert-${alert.alert_id}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <span className="text-xs font-semibold text-[#111827]">{alert.subject}</span>
                        </div>
                        <button onClick={() => handleDismissAlert(alert.alert_id)} className="text-[#9ca3af] hover:text-[#6b7280]" data-testid={`dismiss-alert-${alert.alert_id}`}>
                          <XCircle size={14} />
                        </button>
                      </div>
                      <div className="text-[10px] text-[#6b7280] mb-1">From: {alert.sender}</div>
                      <div className="text-[11px] text-[#374151] mb-2">{alert.preview}</div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          alert.severity === 'high' ? 'bg-[#dc2626] text-white' :
                          alert.severity === 'medium' ? 'bg-[#d97706] text-white' :
                          'bg-[#6b7280] text-white'
                        }`}>{alert.severity?.toUpperCase()}</span>
                        <span className="text-[10px] text-[#16a34a]">{alert.recommended_action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-3">How Risk Monitor works</div>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Connect your email', desc: 'Securely connect Gmail or Outlook' },
                  { step: '2', title: 'AI scans incoming mail', desc: 'Archer detects legal documents, contracts, and deadlines' },
                  { step: '3', title: 'Get instant alerts', desc: 'Receive notifications when a legal threat is detected' },
                  { step: '4', title: 'One-click analysis', desc: 'Upload detected documents directly to Archer for full analysis' }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#fffbeb] text-[#d97706] flex items-center justify-center text-xs font-bold flex-shrink-0">{item.step}</div>
                    <div>
                      <div className="text-xs font-medium text-[#111827]">{item.title}</div>
                      <div className="text-[11px] text-[#6b7280]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="card p-5">
            <div className="text-sm font-semibold text-[#111827] mb-4">Email notifications</div>
            <div className="space-y-4">
              {[
                { label: 'Risk Score changes', desc: 'When your score changes significantly', checked: notifRiskScore, onChange: setNotifRiskScore },
                { label: 'Deadline reminders', desc: '3 days, 1 day before response deadlines', checked: notifDeadlines, onChange: setNotifDeadlines },
                { label: 'Call reminders', desc: '1 hour before your attorney call', checked: notifCalls, onChange: setNotifCalls },
                { label: 'New lawyer available', desc: 'When a lawyer matching your case is available', checked: notifLawyers, onChange: setNotifLawyers },
                { label: 'Promotional emails', desc: 'Tips, updates, and new features', checked: notifPromo, onChange: setNotifPromo }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                  <div><div className="text-sm font-medium text-[#111827]">{item.label}</div><div className="text-xs text-[#6b7280]">{item.desc}</div></div>
                  <Toggle checked={item.checked} onChange={item.onChange} />
                </div>
              ))}
            </div>
            <button onClick={handleSaveNotifications} disabled={saving} className="btn-pill btn-blue mt-4" data-testid="save-notifications-btn">
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Data & privacy</div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
                  <div><div className="text-sm font-medium text-[#111827]">Document encryption</div><div className="text-xs text-[#6b7280]">All documents encrypted with 256-bit AES</div></div>
                  <span className="badge badge-green">Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
                  <div><div className="text-sm font-medium text-[#111827]">Data sharing with lawyers</div><div className="text-xs text-[#6b7280]">AI brief shared before each call you book</div></div>
                  <Toggle checked={dataSharing} onChange={setDataSharing} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div><div className="text-sm font-medium text-[#111827]">Improve Archer AI</div><div className="text-xs text-[#6b7280]">Allow anonymized data to improve analysis</div></div>
                  <Toggle checked={improveAi} onChange={setImproveAi} />
                </div>
              </div>
              <button onClick={handleSavePrivacy} disabled={saving} className="btn-pill btn-blue mt-4" data-testid="save-privacy-btn">
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Your data</div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
                  <div><div className="text-sm font-medium text-[#111827]">Download my data</div><div className="text-xs text-[#6b7280]">All cases, documents, and call history</div></div>
                  <button className="btn-pill btn-outline text-sm py-2 flex items-center gap-1"><Download size={14} />Download</button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div><div className="text-sm font-medium text-[#111827]">Delete all documents</div><div className="text-xs text-[#6b7280]">Remove all uploaded files permanently</div></div>
                  <button className="px-4 py-2 text-sm text-[#dc2626] bg-[#fff5f5] border border-[#fecaca] rounded-lg hover:bg-[#fee2e2] transition-colors flex items-center gap-1"><Trash2 size={14} />Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
