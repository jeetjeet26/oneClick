'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, Copy, Check, RefreshCw, Eye, Palette, MessageSquare, 
  Clock, UserPlus, Calendar, Code, ExternalLink, Loader2,
  Settings, Sparkles
} from 'lucide-react';
import { usePropertyContext } from '../layout/PropertyContext';

interface WidgetConfig {
  id: string;
  property_id: string;
  widget_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  welcome_message: string;
  offline_message: string;
  auto_popup_delay_seconds: number;
  require_email_before_chat: boolean;
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
  lead_capture_prompt: string;
  tours_enabled: boolean;
  tour_duration_minutes: number;
  tour_buffer_minutes: number;
  business_hours: Record<string, { start: string; end: string } | null>;
  timezone: string;
  api_key: string;
  is_active: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
];

export function LumaLeasingConfig() {
  const { currentProperty } = usePropertyContext();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'behavior' | 'leads' | 'tours' | 'embed'>('branding');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    email?: string;
    status?: string;
    lastCheck?: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
    loadCalendarStatus();
    
    // Check for OAuth callback success/error in URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const email = params.get('email');
      
      if (success === 'calendar_connected' && email) {
        alert(`Google Calendar connected successfully! (${email})`);
        loadCalendarStatus();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (error) {
        alert(`Failed to connect Google Calendar: ${error}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [currentProperty.id]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lumaleasing/admin/config?propertyId=${currentProperty.id}`);
      const data = await res.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarStatus = async () => {
    try {
      const res = await fetch(`/api/lumaleasing/calendar/status?propertyId=${currentProperty.id}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarStatus(data);
      }
    } catch (error) {
      console.error('Failed to load calendar status:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch('/api/lumaleasing/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentProperty.id, config }),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm('Are you sure? This will invalidate any existing widget installations.')) return;
    try {
      const res = await fetch('/api/lumaleasing/admin/regenerate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentProperty.id }),
      });
      const data = await res.json();
      if (data.apiKey && config) {
        setConfig({ ...config, api_key: data.apiKey });
      }
    } catch (error) {
      console.error('Failed to regenerate key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateConfig = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const updateBusinessHours = (day: string, field: 'start' | 'end', value: string) => {
    if (!config) return;
    const hours = { ...config.business_hours };
    if (hours[day]) {
      hours[day] = { ...hours[day]!, [field]: value };
    }
    setConfig({ ...config, business_hours: hours });
  };

  const toggleDay = (day: string, enabled: boolean) => {
    if (!config) return;
    const hours = { ...config.business_hours };
    hours[day] = enabled ? { start: '09:00', end: '18:00' } : null;
    setConfig({ ...config, business_hours: hours });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">LumaLeasing Not Configured</h3>
        <p className="text-gray-500 mt-2">Click below to set up LumaLeasing for this property.</p>
        <button
          onClick={loadConfig}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Initialize LumaLeasing
        </button>
      </div>
    );
  }

  const embedCode = `<!-- LumaLeasing Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['LumaLeasing']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lumaleasing','${typeof window !== 'undefined' ? window.location.origin : ''}/lumaleasing.js'));
  lumaleasing('init', '${config.api_key}');
</script>`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">LumaLeasing Configuration</h2>
            <p className="text-sm text-slate-500">{currentProperty.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-100">
        <div className="flex">
          {[
            { id: 'branding', label: 'Branding', icon: Palette },
            { id: 'behavior', label: 'Behavior', icon: MessageSquare },
            { id: 'leads', label: 'Lead Capture', icon: UserPlus },
            { id: 'tours', label: 'Tours', icon: Calendar },
            { id: 'embed', label: 'Embed Code', icon: Code },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Widget Name</label>
              <input
                type="text"
                value={config.widget_name}
                onChange={(e) => updateConfig('widget_name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">This name appears in the chat header</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => updateConfig('primary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primary_color}
                    onChange={(e) => updateConfig('primary_color', e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondary_color}
                    onChange={(e) => updateConfig('secondary_color', e.target.value)}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondary_color}
                    onChange={(e) => updateConfig('secondary_color', e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo URL</label>
              <input
                type="url"
                value={config.logo_url || ''}
                onChange={(e) => updateConfig('logo_url', e.target.value || null)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Widget Status</p>
                <p className="text-sm text-slate-500">Enable or disable the widget</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.is_active}
                  onChange={(e) => updateConfig('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Welcome Message</label>
              <textarea
                value={config.welcome_message}
                onChange={(e) => updateConfig('welcome_message', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Offline Message</label>
              <textarea
                value={config.offline_message}
                onChange={(e) => updateConfig('offline_message', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">Shown when outside business hours</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Auto-popup Delay (seconds)</label>
              <input
                type="number"
                value={config.auto_popup_delay_seconds}
                onChange={(e) => updateConfig('auto_popup_delay_seconds', parseInt(e.target.value) || 0)}
                min={0}
                className="w-32 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">Set to 0 to disable auto-popup</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Business Hours</label>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <label className="flex items-center gap-2 w-32">
                      <input
                        type="checkbox"
                        checked={config.business_hours[day] !== null}
                        onChange={(e) => toggleDay(day, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm capitalize">{day}</span>
                    </label>
                    {config.business_hours[day] && (
                      <>
                        <input
                          type="time"
                          value={config.business_hours[day]?.start || '09:00'}
                          onChange={(e) => updateBusinessHours(day, 'start', e.target.value)}
                          className="px-3 py-1 border border-slate-200 rounded text-sm"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={config.business_hours[day]?.end || '18:00'}
                          onChange={(e) => updateBusinessHours(day, 'end', e.target.value)}
                          className="px-3 py-1 border border-slate-200 rounded text-sm"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
              <select
                value={config.timezone}
                onChange={(e) => updateConfig('timezone', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Lead Capture Prompt</label>
              <textarea
                value={config.lead_capture_prompt}
                onChange={(e) => updateConfig('lead_capture_prompt', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700">Collect Information</p>
              
              {[
                { key: 'collect_name' as const, label: 'Name' },
                { key: 'collect_email' as const, label: 'Email Address' },
                { key: 'collect_phone' as const, label: 'Phone Number' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-700">{label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={(e) => updateConfig(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-slate-700">Require Email Before Chat</p>
                  <p className="text-xs text-slate-500">User must provide email to start chatting</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.require_email_before_chat}
                    onChange={(e) => updateConfig('require_email_before_chat', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tours Tab */}
        {activeTab === 'tours' && (
          <div className="space-y-6 max-w-2xl">
            {/* Google Calendar Integration Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Google Calendar Integration</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Connect your Google Calendar to show real-time availability in the widget. 
                    Tours will automatically appear in your calendar.
                  </p>
                  
                  {calendarStatus?.connected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm bg-white/50 rounded-lg p-3">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900">{calendarStatus.email}</div>
                          <div className="text-xs text-slate-600">
                            Status: <span className={`font-medium ${
                              calendarStatus.status === 'healthy' ? 'text-green-600' :
                              calendarStatus.status === 'expiring_soon' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>{calendarStatus.status}</span>
                            {calendarStatus.lastCheck && (
                              <span> • Last checked: {new Date(calendarStatus.lastCheck).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {calendarStatus.status !== 'healthy' && (
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <div className="flex-1">
                            <p className="text-sm text-amber-900 font-medium">Action Required</p>
                            <p className="text-xs text-amber-700">Your calendar needs to be reconnected</p>
                          </div>
                          <button
                            onClick={() => window.location.href = `/api/lumaleasing/calendar/connect?propertyId=${currentProperty.id}`}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reconnect
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => window.location.href = `/api/lumaleasing/calendar/connect?propertyId=${currentProperty.id}`}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      <Calendar className="w-4 h-4" />
                      Connect Google Calendar
                    </button>
                  )}
                  
                  {!calendarStatus?.connected && (
                    <p className="text-xs text-slate-500 mt-3">
                      💡 Without calendar integration, tour availability will be based on static time slots.
                      Connect your calendar for real-time availability.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tour Settings */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Enable Tour Booking</p>
                <p className="text-sm text-slate-500">Allow visitors to schedule tours via chat</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.tours_enabled}
                  onChange={(e) => updateConfig('tours_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {config.tours_enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tour Duration (minutes)</label>
                    <input
                      type="number"
                      value={config.tour_duration_minutes}
                      onChange={(e) => updateConfig('tour_duration_minutes', parseInt(e.target.value) || 30)}
                      min={15}
                      step={15}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Buffer Between Tours (minutes)</label>
                    <input
                      type="number"
                      value={config.tour_buffer_minutes}
                      onChange={(e) => updateConfig('tour_buffer_minutes', parseInt(e.target.value) || 15)}
                      min={0}
                      step={5}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Tour slots are generated based on your business hours settings. 
                    Use the Tour Management page to customize specific availability.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">API Key</label>
                <button
                  onClick={regenerateApiKey}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-sm font-mono">
                  {config.api_key}
                </code>
                <button
                  onClick={() => copyToClipboard(config.api_key)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Embed Code</label>
                <button
                  onClick={() => copyToClipboard(embedCode)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  <Copy className="w-3 h-3" />
                  Copy Code
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <p className="text-xs text-slate-500 mt-2">
                Paste this code before the closing &lt;/body&gt; tag on your website.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg">
              <ExternalLink className="w-5 h-5 text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-indigo-900">Test Your Widget</p>
                <p className="text-sm text-indigo-700">Preview how the widget looks on a test page</p>
              </div>
              <a
                href={`/lumaleasing/demo?apiKey=${config.api_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Open Demo
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LumaLeasingConfig;

