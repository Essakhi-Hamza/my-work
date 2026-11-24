import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CarFront,
  Check,
  CreditCard,
  FileText,
  MapPin,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { getDepositHeld, getRentalOutstanding, getRentalPaid } from './rentalFinance'
import { relativeDateTime } from './demoRentals'
import { useRentalStore } from '../shared/RentalStoreContext'
import type { Rental, RentalStatus } from './rentalTypes'

const demoConfirmedReservations = [
  { vehicleId: 3, startAt: relativeDateTime(20), endAt: relativeDateTime(44) },
  { vehicleId: 1, startAt: relativeDateTime(72), endAt: relativeDateTime(120) },
]

type Props = { t: (key: string) => string; language: string }

export default function ActiveRentalsPage({ t, language }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const { rentals, history, updateRental, completeRental, addTransaction } = useRentalStore()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | RentalStatus>('all')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [modal, setModal] = useState<'extend' | 'payment' | 'return' | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const displayedRentals = showHistory ? history : rentals
  const selectedRental = displayedRentals.find((rental) => rental.id === selectedId)
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'
  const filteredRentals = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return displayedRentals.filter((rental) => {
      const currentStatus = showHistory ? 'completed' : getRentalStatus(rental, now)
      return (statusFilter === 'all' || statusFilter === currentStatus) &&
        (!normalized || [rental.client, rental.phone, rental.vehicle, rental.plate].some((value) => value.toLocaleLowerCase().includes(normalized)))
    })
  }, [displayedRentals, now, query, showHistory, statusFilter])

  const closeModal = () => {
    setModal(null)
    setError('')
  }

  const savePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRental) return
    const data = new FormData(event.currentTarget)
    const amount = Number(data.get('amount'))
    const outstanding = getOutstanding(selectedRental)
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
      setError(t('paymentAmountError'))
      return
    }
    const method = String(data.get('method')) as 'cash' | 'transfer' | 'card'
    addTransaction(selectedRental.id, { amount, method, kind: 'rental', date: new Date().toISOString() })
    closeModal()
  }

  const saveExtension = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRental) return
    const data = new FormData(event.currentTarget)
    const newReturn = String(data.get('newReturn') ?? '')
    const newReturnAt = new Date(newReturn).getTime()
    const oldReturnAt = new Date(selectedRental.returnAt).getTime()
    if (!Number.isFinite(newReturnAt) || newReturnAt <= oldReturnAt) {
      setError(t('extensionDateError'))
      return
    }
    const conflict = demoConfirmedReservations.some((reservation) =>
      reservation.vehicleId === selectedRental.vehicleId &&
      newReturnAt > new Date(reservation.startAt).getTime() &&
      oldReturnAt < new Date(reservation.endAt).getTime(),
    )
    if (conflict) {
      setError(t('extensionConflict'))
      return
    }
    const additionalHours = (newReturnAt - oldReturnAt) / 3_600_000
    const charge = Math.ceil(additionalHours / 24) * selectedRental.dailyPrice
    updateRental(selectedRental.id, (rental) => ({ ...rental, returnAt: newReturn, extensionCharges: rental.extensionCharges + charge }))
    closeModal()
  }

  const confirmReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRental) return
    const data = new FormData(event.currentTarget)
    const mileage = Number(data.get('mileage'))
    const fuel = Number(data.get('fuel'))
    const additionalCharges = Number(data.get('additionalCharges') || 0)
    const damages = String(data.get('damages') ?? '').trim()
    const photos = data.getAll('returnPhotos').filter((file): file is File => file instanceof File && file.size > 0)
    if (!Number.isFinite(mileage) || mileage < selectedRental.mileage || fuel < 0 || fuel > 100 || additionalCharges < 0) {
      setError(t('returnInspectionError'))
      return
    }
    const photoNames = photos.map((file) => file.name)
    const completed: Rental = {
      ...selectedRental,
      status: 'completed',
      returnedAt: new Date().toISOString(),
      mileage,
      fuel,
      damages,
      additionalCharges: selectedRental.additionalCharges + additionalCharges,
      returnPhotos: photoNames,
    }
    completeRental(selectedRental.id, completed)
    setSelectedId(completed.id)
    setShowHistory(true)
    closeModal()
  }

  const openAction = (action: 'extend' | 'payment' | 'return') => {
    setError('')
    setModal(action)
  }

  const counts = {
    all: rentals.length,
    normal: rentals.filter((rental) => getRentalStatus(rental, now) === 'normal').length,
    dueSoon: rentals.filter((rental) => getRentalStatus(rental, now) === 'dueSoon').length,
    urgent: rentals.filter((rental) => getRentalStatus(rental, now) === 'urgent').length,
    overdue: rentals.filter((rental) => getRentalStatus(rental, now) === 'overdue').length,
  }

  return (
    <div className="rentals-page">
      <div className="rentals-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t(showHistory ? 'rentalHistory' : 'activeRentals')}</h2><p>{t('rentalsSubtitle')}</p></div>
        <button type="button" className={`history-toggle ${showHistory ? 'history-toggle-active' : ''}`} onClick={() => { setShowHistory((value) => !value); setSelectedId(null); setStatusFilter('all') }}>
          <CalendarClock size={17} />{t(showHistory ? 'viewActiveRentals' : 'viewRentalHistory')}<span>{showHistory ? history.length : rentals.length}</span>
        </button>
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('rentalsDemoNotice')}</span></div>
      </div>

      {!showHistory && (
        <div className="rental-status-summary">
          {(['normal', 'dueSoon', 'urgent', 'overdue'] as const).map((status) => (
            <button type="button" key={status} className={`rental-summary-item ${statusFilter === status ? 'rental-summary-selected' : ''}`} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
              <i className={`rental-dot rental-${status}`} /><span>{t(`rentalStatus_${status}`)}</span><strong>{counts[status]}</strong>
            </button>
          ))}
        </div>
      )}

      {selectedRental ? (
        <RentalDetails rental={selectedRental} now={now} locale={locale} t={t} isHistory={showHistory}
          onBack={() => setSelectedId(null)}
          onExtend={() => openAction('extend')}
          onPayment={() => openAction('payment')}
          onReturn={() => openAction('return')}
        />
      ) : (
        <section className="panel rentals-directory">
          <div className="rental-list-toolbar">
            <label className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchRentals')} aria-label={t('searchRentals')} /></label>
            <label className="rental-status-filter"><span>{t('status')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | RentalStatus)}><option value="all">{t('allStatuses')}</option>{(showHistory ? ['completed'] as const : ['normal', 'dueSoon', 'urgent', 'overdue'] as const).map((status) => <option value={status} key={status}>{t(`rentalStatus_${status}`)}</option>)}</select></label>
            <span className="rental-count">{filteredRentals.length} {t('rentalsShown')}</span>
          </div>
          {filteredRentals.length ? (
            <div className="rental-record-list">
              {filteredRentals.map((rental) => {
                const status = showHistory ? 'completed' : getRentalStatus(rental, now)
                return (
                  <button type="button" className="rental-record" key={rental.id} onClick={() => setSelectedId(rental.id)}>
                    <span className="rental-record-vehicle"><CarFront size={22} /></span>
                    <span className="rental-record-main"><strong>{rental.client}</strong><span>{rental.vehicle} · {rental.plate}</span></span>
                    <span className="rental-record-dates"><span>{t('returnDeadline')}</span><strong>{formatDateTime(rental.returnAt, locale)}</strong><small>{showHistory ? t('returned') : getRemainingText(rental.returnAt, now, t)}</small></span>
                    <span className={`rental-status-badge rental-${status}`}><i />{t(`rentalStatus_${status}`)}</span>
                    {!showHistory && status === 'urgent' && <span className="rental-alert-mark" aria-label={t('whatsappNotConfigured')}><AlertTriangle size={18} /></span>}
                  </button>
                )
              })}
            </div>
          ) : <div className="client-no-results"><Search size={22} /><p>{t('noRentalsFound')}</p></div>}
        </section>
      )}

      {modal && selectedRental && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}>
          <section className="client-modal rental-modal" role="dialog" aria-modal="true" aria-labelledby="rental-modal-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="rental-modal-title">{t(`${modal}RentalTitle`)}</h3></div><button type="button" className="icon-quiet" onClick={closeModal} aria-label={t('close')}><X size={19} /></button></div>
            {modal === 'extend' && <ExtensionForm rental={selectedRental} t={t} locale={locale} error={error} onSubmit={saveExtension} onCancel={closeModal} />}
            {modal === 'payment' && <PaymentForm rental={selectedRental} t={t} error={error} onSubmit={savePayment} onCancel={closeModal} />}
            {modal === 'return' && <ReturnForm rental={selectedRental} t={t} error={error} onSubmit={confirmReturn} onCancel={closeModal} />}
          </section>
        </div>
      )}
    </div>
  )
}

function RentalDetails({ rental, now, locale, t, isHistory, onBack, onExtend, onPayment, onReturn }: {
  rental: Rental; now: number; locale: string; t: (key: string) => string; isHistory: boolean
  onBack: () => void; onExtend: () => void; onPayment: () => void; onReturn: () => void
}) {
  const status = isHistory ? 'completed' : getRentalStatus(rental, now)
  const reminderIsDue = !isHistory && (status === 'urgent' || status === 'overdue')
  return (
    <section className="panel rental-detail">
      <button type="button" className="client-back-button" onClick={onBack}><ArrowLeft size={17} />{t('backToRentals')}</button>
      <div className="rental-detail-heading">
        <span className="rental-record-vehicle"><CarFront size={24} /></span>
        <div><p>{rental.vehicle} · {rental.plate}</p><h3>{rental.client}</h3></div>
        <span className={`rental-status-badge rental-${status}`}><i />{t(`rentalStatus_${status}`)}</span>
      </div>

      {reminderIsDue && <div className="whatsapp-warning"><AlertTriangle size={19} /><div><strong>{t('returnReminderAttention')}</strong><p>{t('whatsappNotConfigured')}</p></div><span>{t('notSent')}</span></div>}

      <div className="rental-detail-grid">
        <section className="client-info-card"><h4>{t('rentalInformation')}</h4><DetailRow label={t('clientPhone')} value={rental.phone} /><DetailRow label={t('rentalStart')} value={formatDateTime(rental.startAt, locale)} /><DetailRow label={t('returnDeadline')} value={formatDateTime(rental.returnAt, locale)} /><DetailRow label={t('remainingTime')} value={isHistory ? t('returned') : getRemainingText(rental.returnAt, now, t)} /><DetailRow label={t('dailyPriceShort')} value={`${formatMoney(rental.dailyPrice)} MAD`} /></section>
        <section className="client-info-card"><h4>{t('paymentHistory')}</h4><DetailRow label={t('rentalPrice')} value={`${formatMoney(rental.rentalTotal)} MAD`} /><DetailRow label={t('dailyRate')} value={`${formatMoney(rental.dailyPrice)} MAD / ${t('day')}`} /><DetailRow label={t('depositAmount')} value={`${formatMoney(rental.deposit)} MAD`} /><DetailRow label={t('depositHeld')} value={`${formatMoney(getDepositHeld(rental))} MAD`} /><DetailRow label={t('receivedPayments')} value={`${formatMoney(sumPayments(rental))} MAD`} /><DetailRow label={t('outstandingBalance')} value={`${formatMoney(getOutstanding(rental))} MAD`} /><DetailRow label={t('additionalCharges')} value={`${formatMoney(rental.additionalCharges + rental.extensionCharges)} MAD`} /></section>
        <section className="client-info-card"><h4>{t('destinationInformation')}</h4><div className={`destination-status destination-${rental.destinationStatus}`}><MapPin size={17} /><div><span>{t('plannedDestination')}</span><strong>{rental.destination}</strong><small>{t(rental.destinationStatus === 'outside' ? 'destinationOutside' : 'destinationInside')}</small></div></div><p className="destination-note">{t('destinationManualReview')}</p><p className="destination-note">{t('noLiveGps')}</p></section>
        <section className="client-info-card"><h4>{t('rentalDocuments')}</h4><div className="rental-document-placeholder"><FileText size={20} /><div><strong>{t('contract')}</strong><span>{t('rentalDocumentsNotConnected')}</span></div></div><button type="button" className="integration-unavailable" disabled title={t('documentGenerationNotConnected')}><FileText size={16} />{t('generateDocuments')}</button></section>
      </div>

      {isHistory && <section className="client-info-card return-summary"><h4>{t('returnInspection')}</h4><DetailRow label={t('returnDate')} value={rental.returnedAt ? formatDateTime(rental.returnedAt, locale) : '—'} /><DetailRow label={t('mileage')} value={`${rental.mileage.toLocaleString()} km`} /><DetailRow label={t('fuelLevel')} value={`${rental.fuel}%`} /><DetailRow label={t('damages')} value={rental.damages || t('noneReported')} /><DetailRow label={t('returnPhotos')} value={rental.returnPhotos?.join(', ') || t('noneUploaded')} /></section>}

      {!isHistory && <div className="rental-actions"><button type="button" className="secondary-action" onClick={onExtend}><CalendarClock size={17} />{t('extendRental')}</button>{getOutstanding(rental) > 0 && <button type="button" className="secondary-action" onClick={onPayment}><CreditCard size={17} />{t('recordPayment')}</button>}<button type="button" className="clients-primary-button" onClick={onReturn}><Check size={17} />{t('confirmVehicleReturn')}</button></div>}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="rental-detail-row"><span>{label}</span><strong>{value}</strong></div>
}

function ExtensionForm({ rental, t, locale, error, onSubmit, onCancel }: { rental: Rental; t: (key: string) => string; locale: string; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const initialReturn = toLocalInput(new Date(new Date(rental.returnAt).getTime() + 24 * 60 * 60 * 1000))
  const oldReturn = new Date(rental.returnAt)
  const defaultEstimate = Math.ceil((new Date(initialReturn).getTime() - oldReturn.getTime()) / 86400000) * rental.dailyPrice
  const [newReturn, setNewReturn] = useState(initialReturn)
  const previewCost = Math.ceil((new Date(newReturn).getTime() - oldReturn.getTime()) / 86400000) * rental.dailyPrice
  return (
    <form className="rental-modal-form" onSubmit={onSubmit}>
      <p className="client-modal-note">{t('extensionDemoNotice')}</p>
      <div className="extension-current"><span>{t('currentReturn')}</span><strong>{formatDateTime(rental.returnAt, locale)}</strong></div>
      <label>{t('newReturnDate')}<input name="newReturn" type="datetime-local" value={newReturn} min={toLocalInput(oldReturn)} onChange={(event) => setNewReturn(event.target.value)} required /></label>
      <div className="extension-cost"><span>{t('estimatedExtensionCost')}</span><strong>{formatMoney(Number.isFinite(previewCost) && previewCost > 0 ? previewCost : defaultEstimate)} MAD</strong></div>
      <p className="extension-check-note"><CalendarClock size={16} />{t('extensionCalendarCheck')}</p>
      {error && <p className="client-form-error" role="alert">{error}</p>}
      <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={onCancel}>{t('cancel')}</button><button type="submit" className="clients-primary-button">{t('confirmExtension')}</button></div>
    </form>
  )
}

function PaymentForm({ rental, t, error, onSubmit, onCancel }: { rental: Rental; t: (key: string) => string; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form className="rental-modal-form" onSubmit={onSubmit}>
      <p className="client-modal-note">{t('paymentDemoNotice')}</p>
      <div className="extension-cost"><span>{t('outstandingBalance')}</span><strong>{formatMoney(getOutstanding(rental))} MAD</strong></div>
      <label>{t('rentalPaymentAmount')}<input name="amount" type="number" min="1" max={getOutstanding(rental)} step="0.01" required /></label>
      <label>{t('paymentMethod')}<select name="method" defaultValue="cash"><option value="cash">{t('method_cash')}</option><option value="transfer">{t('method_transfer')}</option><option value="card">{t('method_card')}</option></select></label>
      {error && <p className="client-form-error" role="alert">{error}</p>}
      <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={onCancel}>{t('cancel')}</button><button type="submit" className="clients-primary-button">{t('recordPayment')}</button></div>
    </form>
  )
}

function ReturnForm({ rental, t, error, onSubmit, onCancel }: { rental: Rental; t: (key: string) => string; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form className="rental-modal-form" onSubmit={onSubmit}>
      <p className="client-modal-note">{t('returnDemoNotice')}</p>
      <div className="return-form-grid">
        <label>{t('mileage')}<input name="mileage" type="number" min={rental.mileage} defaultValue={rental.mileage} required /></label>
        <label>{t('fuelLevel')} (%)<input name="fuel" type="number" min="0" max="100" defaultValue={rental.fuel} required /></label>
        <label>{t('additionalCharges')} (MAD)<input name="additionalCharges" type="number" min="0" defaultValue="0" /></label>
        <label className="return-photo-label">{t('returnPhotos')}<input name="returnPhotos" type="file" accept="image/*" multiple /></label>
      </div>
      <label>{t('damages')}<textarea name="damages" rows={3} placeholder={t('damagesPlaceholder')} /></label>
      {error && <p className="client-form-error" role="alert">{error}</p>}
      <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={onCancel}>{t('cancel')}</button><button type="submit" className="clients-primary-button"><Check size={16} />{t('confirmVehicleReturn')}</button></div>
    </form>
  )
}

function getRentalStatus(rental: Rental, now: number): RentalStatus {
  const remaining = new Date(rental.returnAt).getTime() - now
  if (remaining < 0) return 'overdue'
  if (remaining <= 6 * 3_600_000) return 'urgent'
  if (remaining <= 24 * 3_600_000) return 'dueSoon'
  return 'normal'
}

function getRemainingText(returnAt: string, now: number, t: (key: string) => string) {
  const remaining = new Date(returnAt).getTime() - now
  if (remaining < 0) {
    const lateMinutes = Math.floor(Math.abs(remaining) / 60_000)
    const hours = Math.floor(lateMinutes / 60)
    const minutes = lateMinutes % 60
    return t('overdueBy').replace('{hours}', String(hours)).replace('{minutes}', String(minutes))
  }
  const totalMinutes = Math.floor(remaining / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return t('timeRemaining').replace('{hours}', String(hours)).replace('{minutes}', String(minutes))
}

function getOutstanding(rental: Rental) {
  return getRentalOutstanding(rental)
}

function sumPayments(rental: Rental) {
  return getRentalPaid(rental)
}

function formatDateTime(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(value)
}

function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
