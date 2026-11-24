import { Activity, Globe2, LockKeyhole, Plus, Settings2, ShieldAlert, Users } from 'lucide-react'
import { isSupabaseConfigured } from '../../backend/supabaseClient'

type Props = {
  t: (key: string) => string
  language: string
  onLanguageChange: (language: 'en' | 'fr' | 'ar') => void
}

export default function SettingsPage({ t, language, onLanguageChange }: Props) {
  const environmentConfigured = isSupabaseConfigured()
  return (
    <div className="settings-page">
      <div className="settings-heading"><div><p className="section-kicker">LUXRENT</p><h2>{t('settingsTitle')}</h2><p>{t('settingsSubtitle')}</p></div></div>
      <div className="clients-demo-notice"><ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('settingsDemoNotice')}</span></div></div>

      <section className="panel settings-panel">
        <div className="settings-panel-heading"><span className="settings-panel-icon"><Globe2 size={19} /></span><div><h3>{t('settingsPreferences')}</h3><p>{t('settingsPreferencesSubtitle')}</p></div></div>
        <div className="settings-preference-row">
          <div><strong>{t('language')}</strong><span>{t('settingsLanguageHelp')}</span></div>
          <select aria-label={t('language')} value={language} onChange={(event) => onLanguageChange(event.target.value as 'en' | 'fr' | 'ar')}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select>
        </div>
        <div className="settings-preference-row"><div><strong>{t('settingsCurrency')}</strong><span>{t('settingsCurrencyHelp')}</span></div><span className="settings-value-badge">MAD</span></div>
        <div className="settings-preference-row"><div><strong>{t('settingsAppearance')}</strong><span>{t('settingsAppearanceHelp')}</span></div><span className="settings-value-badge">{t('settingsLightTheme')}</span></div>
      </section>

      <div className="settings-card-grid">
        <section className="panel settings-panel">
          <div className="settings-panel-heading"><span className="settings-panel-icon"><Users size={19} /></span><div><h3>{t('settingsEmployees')}</h3><p>{t('settingsEmployeesSubtitle')}</p></div></div>
          <div className="settings-status-notice"><LockKeyhole size={17} /><span>{t('settingsAccountsUnavailable')}</span></div>
          <div className="settings-role-list">
            {(['owner', 'manager', 'employee'] as const).map((role) => <div key={role}><strong>{t(`settingsRole_${role}`)}</strong><span>{t(`settingsRole_${role}Description`)}</span></div>)}
          </div>
          <button type="button" className="integration-unavailable" disabled title={t('settingsAccountsUnavailable')}><Plus size={15} />{t('settingsAddEmployee')}</button>
        </section>

        <section className="panel settings-panel">
          <div className="settings-panel-heading"><span className="settings-panel-icon"><Activity size={19} /></span><div><h3>{t('settingsActivityLog')}</h3><p>{t('settingsActivityLogSubtitle')}</p></div></div>
          <div className="settings-status-notice"><ShieldAlert size={17} /><span>{t('settingsLogUnavailable')}</span></div>
          <div className="settings-empty-log"><Activity size={21} /><p>{t('settingsNoActivity')}</p></div>
        </section>
      </div>

      <section className="panel settings-panel settings-security-panel">
        <div className="settings-panel-heading"><span className="settings-panel-icon"><Settings2 size={19} /></span><div><h3>{t('settingsSecurity')}</h3><p>{t('settingsSecuritySubtitle')}</p></div></div>
        <div className="settings-security-row"><div><strong>{t('settingsSupabaseConfig')}</strong><span>{t(environmentConfigured ? 'settingsEnvConfigured' : 'settingsEnvMissing')}</span></div><span className="settings-connection-badge">{t(environmentConfigured ? 'configured' : 'notConnected')}</span></div>
        <div className="settings-security-row"><div><strong>{t('settingsAuthentication')}</strong><span>{t('settingsNotConfigured')}</span></div><span className="settings-connection-badge">{t('notConnected')}</span></div>
        <div className="settings-security-row"><div><strong>{t('settingsSecureStorage')}</strong><span>{t('settingsNotConfigured')}</span></div><span className="settings-connection-badge">{t('notConnected')}</span></div>
      </section>

      <section className="panel settings-panel">
        <div className="settings-panel-heading"><span className="settings-panel-icon"><ShieldAlert size={19} /></span><div><h3>{t('settingsPreviewData')}</h3><p>{t('settingsPreviewDataSubtitle')}</p></div></div>
        <button
          type="button"
          className="client-cancel-button"
          onClick={() => {
            const keys = [
              'luxrent-preview-clients',
              'luxrent-preview-vehicles',
              'luxrent-preview-bookings',
              'luxrent-preview-documents',
              'luxrent-preview-rentals',
              'luxrent-preview-rental-history',
              'luxrent-preview-read-notifications',
            ]
            keys.forEach((key) => localStorage.removeItem(key))
            window.location.reload()
          }}
        >
          {t('settingsResetPreview')}
        </button>
      </section>
    </div>
  )
}
