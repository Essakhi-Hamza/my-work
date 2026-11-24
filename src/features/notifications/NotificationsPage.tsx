import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, Clock3, Mail, MessageCircle, Search, ShieldAlert } from 'lucide-react'
import { getRentalOutstanding } from '../rentals/rentalFinance'
import { useRentalStore } from '../shared/RentalStoreContext'

type Props = { t: (key: string) => string; language: string; onNavigate: (page: string) => void }
type NotificationKind = 'overdue' | 'dueSoon' | 'balance'

export default function NotificationsPage({ t, language, onNavigate }: Props) {
  const { rentals } = useRentalStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [readIds, setReadIds] = useState<string[]>(loadReadNotifications)
  const [now, setNow] = useState(() => Date.now())
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    localStorage.setItem('luxrent-preview-read-notifications', JSON.stringify(readIds))
  }, [readIds])
  const notifications = useMemo(() => {
    return rentals.flatMap((rental) => {
      const timeLeft = new Date(rental.returnAt).getTime() - now
      const items: { id: string; kind: NotificationKind; rentalId: number; client: string; vehicle: string; detail: string; date: string }[] = []
      if (timeLeft < 0) {
        items.push({ id: `overdue-${rental.id}`, kind: 'overdue', rentalId: rental.id, client: rental.client, vehicle: rental.vehicle, detail: t('notificationOverdueDetail'), date: rental.returnAt })
      } else if (timeLeft <= 6 * 3_600_000) {
        items.push({ id: `due-${rental.id}`, kind: 'dueSoon', rentalId: rental.id, client: rental.client, vehicle: rental.vehicle, detail: t('notificationDueDetail'), date: rental.returnAt })
      }
      const outstanding = getRentalOutstanding(rental)
      if (outstanding > 0) {
        items.push({ id: `balance-${rental.id}`, kind: 'balance', rentalId: rental.id, client: rental.client, vehicle: rental.vehicle, detail: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(outstanding)} MAD`, date: rental.startAt })
      }
      return items
    }).sort((first, second) => first.date.localeCompare(second.date))
  }, [locale, now, rentals, t])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = notifications.filter((notification) =>
    (filter === 'all' || !readIds.includes(notification.id)) &&
    (!normalizedQuery || [notification.client, notification.vehicle, notification.detail, t(`notification_${notification.kind}`)]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
  )

  const markRead = (id: string) => setReadIds((current) => current.includes(id) ? current : [...current, id])
  const markAllRead = () => setReadIds((current) => [...new Set([...current, ...notifications.map((item) => item.id)])])
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length

  return (
    <div className="notifications-page">
      <div className="notifications-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t('notificationsTitle')}</h2><p>{t('notificationsSubtitle')}</p></div>
        <button type="button" className="secondary-action" onClick={markAllRead} disabled={!unreadCount}><Check size={17} />{t('markAllRead')}</button>
      </div>

      <div className="clients-demo-notice"><ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('notificationsDemoNotice')}</span></div></div>

      <section className="notification-policy-grid">
        <article className="notification-policy-card">
          <span className="notification-channel-icon"><MessageCircle size={19} /></span>
          <div><strong>{t('whatsappChannel')}</strong><span>{t('channelNotConnected')}</span></div>
          <span className="notification-channel-status">{t('notConnected')}</span>
        </article>
        <article className="notification-policy-card">
          <span className="notification-channel-icon"><Mail size={19} /></span>
          <div><strong>{t('emailChannel')}</strong><span>{t('channelNotConnected')}</span></div>
          <span className="notification-channel-status">{t('notConnected')}</span>
        </article>
        <article className="notification-policy-card notification-reminder-policy">
          <span className="notification-channel-icon"><Clock3 size={19} /></span>
          <div><strong>{t('returnReminderPolicy')}</strong><span>{t('sixHourReminderPolicy')}</span></div>
          <span className="notification-channel-status">{t('schedulerUnavailable')}</span>
        </article>
      </section>

      <section className="panel notifications-directory">
        <div className="notification-toolbar">
          <label className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchNotifications')} aria-label={t('searchNotifications')} /></label>
          <div className="notification-filter" role="group" aria-label={t('notificationFilter')}>
            <button type="button" className={filter === 'all' ? 'notification-filter-active' : ''} onClick={() => setFilter('all')}>{t('allNotifications')} <span>{notifications.length}</span></button>
            <button type="button" className={filter === 'unread' ? 'notification-filter-active' : ''} onClick={() => setFilter('unread')}>{t('unreadNotifications')} <span>{unreadCount}</span></button>
          </div>
        </div>
        {filtered.length ? (
          <div className="notification-list">
            {filtered.map((notification) => {
              const isRead = readIds.includes(notification.id)
              return (
                <article className={`notification-item ${isRead ? 'notification-read' : ''}`} key={notification.id}>
                  <span className={`notification-item-icon notification-${notification.kind}`}><Bell size={18} /></span>
                  <div className="notification-item-main">
                    <strong>{t(`notification_${notification.kind}`)}</strong>
                    <span>{notification.client} · {notification.vehicle}</span>
                    <small>{notification.kind === 'balance' ? `${t('outstandingBalance')}: ${notification.detail}` : notification.detail}</small>
                  </div>
                  <div className="notification-item-meta"><span>{formatDate(notification.date)}</span><button type="button" className="text-link" onClick={() => onNavigate('rentals')}>{t('openRental')}</button></div>
                  {!isRead && <button type="button" className="notification-mark-read" onClick={() => markRead(notification.id)} aria-label={`${t('markAsRead')}: ${notification.client}`}><Check size={17} /></button>}
                </article>
              )
            })}
          </div>
        ) : <div className="document-empty-state"><Search size={22} /><p>{t('noNotificationsFound')}</p></div>}
      </section>
    </div>
  )
}

function loadReadNotifications(): string[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-read-notifications')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string')
    }
  } catch {
    // Keep notifications unread if browser storage is unavailable or invalid.
  }
  return []
}
