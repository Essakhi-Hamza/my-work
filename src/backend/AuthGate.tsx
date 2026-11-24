import { useEffect, useState, type FormEvent, type PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackendAuth } from './authContext'

export function AuthGate({ children }: PropsWithChildren) {
  const auth = useBackendAuth()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  }, [i18n.language])

  if (auth.status === 'preview' || auth.status === 'ready') return children
  if (auth.status === 'loading' || auth.status === 'checkingAgency') {
    return <main className="auth-page"><div className="auth-card" role="status">{t('authLoading')}</div></main>
  }
  if (auth.status === 'error') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <BrandMark />
          <h1>{t('authUnavailable')}</h1>
          <p className="auth-description">{t('authConnectionHelp')}</p>
          <p className="auth-error" role="alert">{auth.error}</p>
          <button type="button" className="auth-primary-button" onClick={auth.retry}>{t('authRetry')}</button>
        </section>
      </main>
    )
  }
  if (auth.status === 'needsAgency') return <AgencySetup />
  return <AuthenticationForm />
}

function AuthenticationForm() {
  const auth = useBackendAuth()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'reset'>('signIn')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setNotice('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    try {
      if (mode === 'signIn') {
        await auth.signIn(email, password)
      } else if (mode === 'signUp') {
        const hasSession = await auth.signUp(name, email, password)
        if (hasSession) {
          setNotice(t('authAccountCreated'))
        } else {
          setMode('signIn')
          setNotice(t('authCheckEmail'))
        }
      } else {
        await auth.requestPasswordReset(email)
        setNotice(t('authResetSent'))
      }
    } catch (cause) {
      setFormError(getErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandMark />
        <p className="section-kicker">{t('authEyebrow')}</p>
        <h1>{t(mode === 'signIn' ? 'authSignInTitle' : mode === 'signUp' ? 'authSignUpTitle' : 'authResetTitle')}</h1>
        <p className="auth-description">{t('authDescription')}</p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {mode === 'signUp' && <label>{t('fullName')}<input name="name" autoComplete="name" required maxLength={120} /></label>}
          <label>{t('emailAddress')}<input name="email" type="email" autoComplete="email" required /></label>
          {mode !== 'reset' && <label>{t('authPassword')}<input name="password" type="password" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required minLength={8} /></label>}
          {formError && <p className="auth-error" role="alert">{formError}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button type="submit" className="auth-primary-button" disabled={submitting}>
            {submitting ? t('authWorking') : t(mode === 'signIn' ? 'authSignIn' : mode === 'signUp' ? 'authCreateAccount' : 'authSendReset')}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'signIn' && <>
            <button type="button" onClick={() => { setFormError(''); setNotice(''); setMode('reset') }}>{t('authForgotPassword')}</button>
            <button type="button" onClick={() => { setFormError(''); setNotice(''); setMode('signUp') }}>{t('authNeedAccount')}</button>
          </>}
          {mode !== 'signIn' && <button type="button" onClick={() => { setFormError(''); setNotice(''); setMode('signIn') }}>{t('authBackToSignIn')}</button>}
        </div>
      </section>
    </main>
  )
}

function AgencySetup() {
  const auth = useBackendAuth()
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      await auth.createAgency(String(formData.get('agencyName') ?? ''))
    } catch (cause) {
      setFormError(getErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandMark />
        <p className="section-kicker">{t('authEyebrow')}</p>
        <h1>{t('authAgencyTitle')}</h1>
        <p className="auth-description">{t('authAgencyDescription')}</p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>{t('authAgencyName')}<input name="agencyName" required minLength={2} maxLength={120} /></label>
          {formError && <p className="auth-error" role="alert">{formError}</p>}
          <button type="submit" className="auth-primary-button" disabled={submitting}>
            {submitting ? t('authWorking') : t('authCreateAgency')}
          </button>
        </form>
        <button type="button" className="auth-secondary-button" onClick={() => void auth.signOut()}>{t('authSignOut')}</button>
      </section>
    </main>
  )
}

function BrandMark() {
  const { t, i18n } = useTranslation()
  const changeLanguage = (language: 'en' | 'fr' | 'ar') => {
    void i18n.changeLanguage(language)
    localStorage.setItem('luxrent-language', language)
  }
  return (
    <div className="auth-topline">
      <div className="auth-brand"><span className="auth-brand-mark">LR</span><strong>{t('appName')}</strong></div>
      <select className="auth-language" aria-label={t('language')} value={i18n.language} onChange={(event) => changeLanguage(event.target.value as 'en' | 'fr' | 'ar')}>
        <option value="fr">FR</option>
        <option value="ar">AR</option>
        <option value="en">EN</option>
      </select>
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
