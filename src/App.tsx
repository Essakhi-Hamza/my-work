import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Check,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  ArrowUpRight,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  CarFront,
  KeyRound,
  ChartNoAxesCombined,
  TriangleAlert,
} from 'lucide-react'
import ClientsPage from './features/clients/ClientsPage'
import VehiclesPage from './features/vehicles/VehiclesPage'
import ReservationsPage from './features/reservations/ReservationsPage'
import ActiveRentalsPage from './features/rentals/ActiveRentalsPage'
import DocumentsPage from './features/documents/DocumentsPage'
import PaymentsPage from './features/payments/PaymentsPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import ReportsPage from './features/reports/ReportsPage'
import SettingsPage from './features/settings/SettingsPage'
import { RentalStoreProvider } from './features/shared/RentalStore'
import { useRentalStore } from './features/shared/RentalStoreContext'

type Language = 'fr' | 'ar' | 'en'

const navigation = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'dashboard' },
  { id: 'clients', icon: Users, label: 'clients' },
  { id: 'vehicles', icon: CarFront, label: 'vehicles' },
  { id: 'reservations', icon: CalendarDays, label: 'reservations' },
  { id: 'rentals', icon: KeyRound, label: 'rentals' },
  { id: 'documents', icon: FileText, label: 'documents' },
  { id: 'payments', icon: CircleDollarSign, label: 'payments' },
  { id: 'notifications', icon: Bell, label: 'notifications' },
  { id: 'reports', icon: ChartNoAxesCombined, label: 'reports' },
  { id: 'settings', icon: Settings, label: 'settings' },
] as const

const demoReturns = [
  { time: '10:30', vehicle: 'Mercedes-Benz C-Class', client: 'Sarah El Amrani', state: 'Due soon' },
  { time: '13:00', vehicle: 'Volkswagen Tiguan', client: 'Youssef Benali', state: 'On time' },
  { time: '17:30', vehicle: 'Range Rover Evoque', client: 'Nadia Karim', state: 'On time' },
]

const demoAlerts = [
  { icon: Clock3, title: 'alertLate', detail: 'Dacia Duster · 45 min overdue', tone: 'red' },
  { icon: TriangleAlert, title: 'alertExpiry', detail: 'BMW X3 · 12 days remaining', tone: 'gold' },
  { icon: CircleDollarSign, title: 'alertPayment', detail: 'Rental #LR-2048 · 1,200 MAD', tone: 'blue' },
]

const demoActivity = [
  { icon: KeyRound, title: 'activityRental', detail: 'Mercedes-Benz C-Class · 09:12', amount: '+ 850 MAD' },
  { icon: Users, title: 'activityClient', detail: 'Sarah El Amrani · 08:46', amount: '' },
  { icon: Check, title: 'activityPayment', detail: 'Rental #LR-2045 · 08:20', amount: '+ 1,500 MAD' },
]

function App() {
  return (
    <RentalStoreProvider>
      <LuxRentApp />
    </RentalStoreProvider>
  )
}

function LuxRentApp() {
  const { t, i18n } = useTranslation()
  const [activePage, setActivePage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isRtl = i18n.language === 'ar'

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  }, [i18n.language])

  const changeLanguage = (language: Language) => {
    void i18n.changeLanguage(language)
    localStorage.setItem('luxrent-language', language)
  }

  const activeLabel = navigation.find((item) => item.id === activePage)?.label ?? 'dashboard'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">LR</div>
          {!collapsed && (
            <div>
              <strong>{t('appName')}</strong>
              <span>RENTAL MANAGEMENT</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label={t('dashboard')}>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => {
                  setActivePage(item.id)
                  setMobileMenuOpen(false)
                }}
                title={collapsed ? t(item.label) : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={1.8} />
                {!collapsed && <span>{t(item.label)}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="employee-avatar" aria-hidden="true">E</div>
          {!collapsed && (
            <div className="employee-details">
              <strong>{t('employee')}</strong>
              <span>{t('demoTag')}</span>
            </div>
          )}
          <button
            type="button"
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? t('expandMenu') : t('collapseMenu')}
            aria-label={collapsed ? t('expandMenu') : t('collapseMenu')}
          >
            {isRtl
              ? collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />
              : collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t('collapseMenu')}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t('expandMenu')}
          >
            <Menu size={22} />
          </button>

          <div>
            <p className="topbar-eyebrow">LuxRent</p>
            <h1>{t(activeLabel)}</h1>
          </div>

          <label className="language-select">
            <span>{t('language')}</span>
            <select
              value={i18n.language}
              onChange={(event) => changeLanguage(event.target.value as Language)}
              aria-label={t('language')}
            >
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
        </header>

        <section className="content">
          {activePage === 'dashboard' ? (
            <Dashboard t={t} onNavigate={setActivePage} />
          ) : activePage === 'clients' ? (
            <ClientsPage t={t} />
          ) : activePage === 'vehicles' ? (
            <VehiclesPage t={t} />
          ) : activePage === 'reservations' ? (
            <ReservationsPage t={t} language={i18n.language} />
          ) : activePage === 'rentals' ? (
            <ActiveRentalsPage t={t} language={i18n.language} />
          ) : activePage === 'documents' ? (
            <DocumentsPage t={t} language={i18n.language} />
          ) : activePage === 'payments' ? (
            <PaymentsPage t={t} language={i18n.language} />
          ) : activePage === 'notifications' ? (
            <NotificationsPage t={t} language={i18n.language} onNavigate={setActivePage} />
          ) : activePage === 'reports' ? (
            <ReportsPage t={t} language={i18n.language} />
          ) : activePage === 'settings' ? (
            <SettingsPage t={t} language={i18n.language} onLanguageChange={changeLanguage} />
          ) : (
            <div className="module-state">
              <div className="module-state-mark" aria-hidden="true">
                {(() => {
                  const Icon = navigation.find((item) => item.id === activePage)?.icon ?? LayoutDashboard
                  return <Icon size={30} />
                })()}
              </div>
              <h2>{t(activeLabel)}</h2>
              <p>{t('moduleNotStarted')}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Dashboard({
  t,
  onNavigate,
}: {
  t: (key: string) => string
  onNavigate: (page: string) => void
}) {
  const { rentals } = useRentalStore()
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const metrics = [
    { label: 'activeRentals', value: String(rentals.length).padStart(2, '0'), icon: KeyRound, tone: 'gold' },
    { label: 'availableVehicles', value: '12', icon: CarFront, tone: 'green' },
    { label: 'returnsToday', value: String(rentals.filter((rental) => {
      const remaining = new Date(rental.returnAt).getTime() - now
      return remaining >= -86_400_000 && remaining <= 86_400_000
    }).length).padStart(2, '0'), icon: CalendarDays, tone: 'blue' },
    { label: 'attentionAlerts', value: String(rentals.filter((rental) => new Date(rental.returnAt).getTime() < now).length + rentals.filter((rental) => new Date(rental.returnAt).getTime() - now <= 6 * 3_600_000).length).padStart(2, '0'), icon: TriangleAlert, tone: 'red' },
  ]

  const shortcuts = [
    { label: 'newRental', icon: KeyRound, page: 'reservations' },
    { label: 'addClient', icon: Users, page: 'clients' },
    { label: 'addVehicle', icon: CarFront, page: 'vehicles' },
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="section-kicker">LUXRENT</p>
          <h2>{t('welcome')}</h2>
        </div>
        <div className="date-chip"><CalendarDays size={16} /> Monday, 23 November</div>
      </div>

      <div className="demo-banner">
        <span>{t('demoTag')}</span>
        <p>{t('demoNotice')}</p>
      </div>

      <h3 className="section-title">{t('todayOverview')}</h3>
      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-icon metric-${metric.tone}`}><Icon size={20} /></div>
              <div className="metric-copy">
                <span>{t(metric.label)}</span>
                <strong>{metric.value}</strong>
              </div>
              <ArrowUpRight className="metric-arrow" size={17} />
            </article>
          )
        })}
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="panel quick-panel">
            <div className="panel-heading">
              <div><h3>{t('quickActions')}</h3><p>Frequently used tasks</p></div>
            </div>
            <div className="quick-action-grid">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon
                return (
                  <button type="button" className="quick-action" key={shortcut.page} onClick={() => {
                    onNavigate(shortcut.page)
                    window.setTimeout(() => window.dispatchEvent(new CustomEvent(`luxrent-open-${shortcut.page}`)), 0)
                  }}>
                    <span><Icon size={19} /></span>
                    <strong>{t(shortcut.label)}</strong>
                    <ChevronRight className="quick-chevron" size={16} />
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel returns-panel">
            <div className="panel-heading">
              <div><h3>{t('upcomingReturns')}</h3><p>Monday, 23 November · 3 vehicles</p></div>
              <button type="button" className="text-link" onClick={() => onNavigate('rentals')}>{t('viewAll')}<ChevronRight size={15} /></button>
            </div>
            <div className="return-list">
              {demoReturns.map((item, index) => (
                <div className="return-row" key={item.vehicle}>
                  <div className="return-time"><strong>{item.time}</strong><span>{t('returnTime')}</span></div>
                  <div className="return-car"><span className={`car-mini car-mini-${index}`}><CarFront size={20} /></span><div><strong>{item.vehicle}</strong><span>{item.client}</span></div></div>
                  <span className={`return-status ${index === 0 ? 'status-soon' : ''}`}><i />{item.state}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel revenue-panel">
            <div className="panel-heading">
              <div><h3>{t('revenueOverview')}</h3><p>{t('sampleRevenue')} · MAD</p></div>
              <button type="button" className="period-select" onClick={() => setRevenuePeriod((current) => current === 'week' ? 'month' : current === 'month' ? 'quarter' : 'week')}>
                {revenuePeriod === 'week' ? t('thisWeek') : revenuePeriod === 'month' ? t('thisMonth') : t('thisQuarter')} <ChevronDown size={15} />
              </button>
            </div>
            <div className="chart-wrap" role="img" aria-label="Demo weekly revenue chart">
              <div className="chart-y-labels"><span>8k</span><span>6k</span><span>4k</span><span>2k</span><span>0</span></div>
              <div className="chart">
                <div className="chart-grid"><i /><i /><i /><i /><i /></div>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#c2a36a" stopOpacity=".24" /><stop offset="100%" stopColor="#c2a36a" stopOpacity="0" /></linearGradient></defs>
                  <path d="M0 142 C45 130 57 115 100 124 S158 145 200 104 S258 105 300 92 S357 111 400 76 S458 82 500 57 S558 75 600 39 S658 52 700 20 L700 180 L0 180Z" fill="url(#revenueFill)" />
                  <path d="M0 142 C45 130 57 115 100 124 S158 145 200 104 S258 105 300 92 S357 111 400 76 S458 82 500 57 S558 75 600 39 S658 52 700 20" fill="none" stroke="#ad8d56" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  <circle cx="600" cy="39" r="5" fill="#ad8d56" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="chart-x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>
            </div>
          </section>
        </div>

        <aside className="dashboard-secondary">
          <section className="panel alerts-panel">
            <div className="panel-heading">
              <div><h3>{t('importantAlerts')}</h3><p>Items requiring attention</p></div>
              <span className="alert-count">3</span>
            </div>
            <div className="alert-list">
              {demoAlerts.map((alert) => {
                const Icon = alert.icon
                return (
                  <article className="alert-item" key={alert.title}>
                    <span className={`alert-icon alert-${alert.tone}`}><Icon size={17} /></span>
                    <div><strong>{t(alert.title)}</strong><p>{alert.detail}</p></div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="panel activity-panel">
            <div className="panel-heading">
              <div><h3>{t('recentActivity')}</h3><p>Latest updates</p></div>
              <button type="button" className="icon-quiet" aria-label={t('recentActivity')} onClick={() => onNavigate('rentals')}><ArrowUpRight size={17} /></button>
            </div>
            <div className="activity-list">
              {demoActivity.map((activity) => {
                const Icon = activity.icon
                return (
                  <article className="activity-item" key={activity.title}>
                    <span className="activity-icon"><Icon size={16} /></span>
                    <div className="activity-copy"><strong>{t(activity.title)}</strong><p>{activity.detail}</p></div>
                    {activity.amount && <span className="activity-amount">{activity.amount}</span>}
                  </article>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default App
