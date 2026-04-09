import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { CheckCircle, AlertCircle, Download, Trash2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [state, setState] = useState(user?.state_of_residence || '');

  // Notification state
  const [notifRiskScore, setNotifRiskScore] = useState(user?.notif_risk_score ?? true);
  const [notifDeadlines, setNotifDeadlines] = useState(user?.notif_deadlines ?? true);
  const [notifCalls, setNotifCalls] = useState(user?.notif_calls ?? true);
  const [notifLawyers, setNotifLawyers] = useState(user?.notif_lawyers ?? false);
  const [notifPromo, setNotifPromo] = useState(user?.notif_promo ?? false);

  // Privacy state
  const [dataSharing, setDataSharing] = useState(user?.data_sharing ?? true);
  const [improveAi, setImproveAi] = useState(user?.improve_ai ?? true);

  const tabs = [
    { key: 'account', label: 'Account' },
    { key: 'plan', label: 'Plan & billing' },
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

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API}/profile`, {
        name,
        phone,
        state_of_residence: state
      }, { withCredentials: true });
      updateUser({ name, phone, state_of_residence: state });
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
        notif_risk_score: notifRiskScore,
        notif_deadlines: notifDeadlines,
        notif_calls: notifCalls,
        notif_lawyers: notifLawyers,
        notif_promo: notifPromo
      }, { withCredentials: true });
      updateUser({
        notif_risk_score: notifRiskScore,
        notif_deadlines: notifDeadlines,
        notif_calls: notifCalls,
        notif_lawyers: notifLawyers,
        notif_promo: notifPromo
      });
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
      await axios.put(`${API}/profile`, {
        data_sharing: dataSharing,
        improve_ai: improveAi
      }, { withCredentials: true });
      updateUser({ data_sharing: dataSharing, improve_ai: improveAi });
      setMessage({ type: 'success', text: 'Privacy settings saved' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <div 
      className={`toggle ${checked ? 'on' : ''}`} 
      onClick={() => onChange(!checked)}
      data-testid="toggle"
    ></div>
  );

  return (
    <div data-testid="settings-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="max-w-xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#f5f5f5] rounded-xl mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key 
                  ? 'bg-white text-[#111827] shadow-sm' 
                  : 'text-[#6b7280] hover:text-[#111827]'
              }`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
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
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="settings-name-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input bg-[#f8f8f8]"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    data-testid="settings-phone-input"
                  />
                </div>
                <div>
                  <label className="form-label">State of residence</label>
                  <select
                    className="form-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    data-testid="settings-state-select"
                  >
                    <option value="">Select a state</option>
                    {states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-pill btn-blue"
                  data-testid="save-profile-btn"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Password</div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Current password</label>
                  <input type="password" className="form-input" placeholder="••••••••" disabled />
                </div>
                <div>
                  <label className="form-label">New password</label>
                  <input type="password" className="form-input" placeholder="Min. 8 characters" disabled />
                </div>
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
                <button className="px-4 py-2 text-sm text-[#dc2626] bg-[#fff5f5] border border-[#fecaca] rounded-lg hover:bg-[#fee2e2] transition-colors">
                  Delete account
                </button>
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
                  <div className="text-lg font-semibold text-[#1d4ed8]">
                    {user?.plan === 'pro' ? 'Pro plan' : 'Free plan'}
                  </div>
                  <div className="text-xs text-[#3b82f6]">
                    {user?.plan === 'pro' ? 'Active · Renews Dec 15, 2026' : 'Limited to 1 document'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-[#111827]">
                    ${user?.plan === 'pro' ? '69' : '0'}
                  </div>
                  <div className="text-xs text-[#6b7280]">/month</div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  'Unlimited document analyses',
                  'Full risk reports + Dynamic Risk Score',
                  'Live case files with document history'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[#3b82f6]">
                    <CheckCircle size={12} className="text-[#1d4ed8]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {user?.plan === 'free' && (
                <button className="w-full btn-pill btn-blue mt-4" data-testid="upgrade-btn">
                  Upgrade to Pro — $69/month
                </button>
              )}
            </div>

            {user?.plan === 'pro' && (
              <>
                <div className="card p-5">
                  <div className="text-sm font-semibold text-[#111827] mb-4">Payment method</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#111827]">Visa ending in 4242</div>
                      <div className="text-xs text-[#6b7280]">Expires 12/2027</div>
                    </div>
                    <button className="btn-pill btn-outline text-sm py-2">Update</button>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="text-sm font-semibold text-[#111827] mb-4">Billing history</div>
                  <div className="space-y-3">
                    {[
                      { date: 'November 2026', desc: 'Pro plan · Nov 15', amount: '$69.00' },
                      { date: 'October 2026', desc: 'Pro plan · Oct 15', amount: '$69.00' },
                      { date: 'Attorney call', desc: 'James Carter · Oct 8', amount: '$149.00' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                        <div>
                          <div className="text-sm font-medium text-[#111827]">{item.date}</div>
                          <div className="text-xs text-[#6b7280]">{item.desc}</div>
                        </div>
                        <div className="text-sm font-medium text-[#111827]">{item.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn-pill btn-outline text-[#dc2626] border-[#fecaca] hover:bg-[#fff5f5]">
                  Cancel subscription
                </button>
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="card p-5">
            <div className="text-sm font-semibold text-[#111827] mb-4">Email notifications</div>
            <div className="space-y-4">
              {[
                { 
                  label: 'Risk Score changes', 
                  desc: 'When your score changes significantly',
                  checked: notifRiskScore,
                  onChange: setNotifRiskScore
                },
                { 
                  label: 'Deadline reminders', 
                  desc: '3 days, 1 day before response deadlines',
                  checked: notifDeadlines,
                  onChange: setNotifDeadlines
                },
                { 
                  label: 'Call reminders', 
                  desc: '1 hour before your attorney call',
                  checked: notifCalls,
                  onChange: setNotifCalls
                },
                { 
                  label: 'New lawyer available', 
                  desc: 'When a lawyer matching your case is available',
                  checked: notifLawyers,
                  onChange: setNotifLawyers
                },
                { 
                  label: 'Promotional emails', 
                  desc: 'Tips, updates, and new features',
                  checked: notifPromo,
                  onChange: setNotifPromo
                }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">{item.label}</div>
                    <div className="text-xs text-[#6b7280]">{item.desc}</div>
                  </div>
                  <Toggle checked={item.checked} onChange={item.onChange} />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveNotifications}
              disabled={saving}
              className="btn-pill btn-blue mt-4"
              data-testid="save-notifications-btn"
            >
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
                  <div>
                    <div className="text-sm font-medium text-[#111827]">Document encryption</div>
                    <div className="text-xs text-[#6b7280]">All documents encrypted with 256-bit AES</div>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">Data sharing with lawyers</div>
                    <div className="text-xs text-[#6b7280]">AI brief shared before each call you book</div>
                  </div>
                  <Toggle checked={dataSharing} onChange={setDataSharing} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">Improve Jasper AI</div>
                    <div className="text-xs text-[#6b7280]">Allow anonymized data to improve analysis</div>
                  </div>
                  <Toggle checked={improveAi} onChange={setImproveAi} />
                </div>
              </div>
              <button
                onClick={handleSavePrivacy}
                disabled={saving}
                className="btn-pill btn-blue mt-4"
                data-testid="save-privacy-btn"
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>

            <div className="card p-5">
              <div className="text-sm font-semibold text-[#111827] mb-4">Your data</div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">Download my data</div>
                    <div className="text-xs text-[#6b7280]">All cases, documents, and call history</div>
                  </div>
                  <button className="btn-pill btn-outline text-sm py-2 flex items-center gap-1">
                    <Download size={14} />
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">Delete all documents</div>
                    <div className="text-xs text-[#6b7280]">Remove all uploaded files permanently</div>
                  </div>
                  <button className="px-4 py-2 text-sm text-[#dc2626] bg-[#fff5f5] border border-[#fecaca] rounded-lg hover:bg-[#fee2e2] transition-colors flex items-center gap-1">
                    <Trash2 size={14} />
                    Delete
                  </button>
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
