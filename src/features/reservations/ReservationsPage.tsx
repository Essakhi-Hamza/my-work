import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useRentalStore } from '../shared/RentalStoreContext'
import type { Rental } from '../rentals/rentalTypes'

type BookingStatus = 'confirmed' | 'pending' | 'active' | 'maintenance' | 'cancelled'
type Booking = {
  id: number
  vehicleId: number
  vehicle: string
  client: string
  start: string
  end: string
  status: BookingStatus
  price: number
  deposit: number
  paid: number
}

const demoVehicles = [
  { id: 1, name: 'Mercedes-Benz C-Class', plate: '12345-A-6' },
  { id: 2, name: 'Volkswagen Tiguan', plate: '67890-B-6' },
  { id: 3, name: 'Range Rover Evoque', plate: '24680-C-6' },
  { id: 4, name: 'Dacia Duster', plate: '13579-D-6' },
]

type Props = { t: (key: string) => string; language: string }

export default function ReservationsPage({ t, language }: Props) {
  const { addRental } = useRentalStore()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [bookings, setBookings] = useState<Booking[]>(loadBookingPreview)
  const [query, setQuery] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mode, setMode] = useState<'reservation' | 'rental'>('reservation')
  const [formVehicleId, setFormVehicleId] = useState('1')
  const [formStart, setFormStart] = useState(() => toLocalInput(addDays(new Date(), 1)))
  const [formEnd, setFormEnd] = useState(() => toLocalInput(addDays(new Date(), 2)))
  const [reservationStatus, setReservationStatus] = useState<'confirmed' | 'pending'>('confirmed')
  const [formError, setFormError] = useState('')
  const [calendarVehicles] = useState(loadReservationVehicles)
  useEffect(() => {
    localStorage.setItem('luxrent-preview-bookings', JSON.stringify(bookings))
  }, [bookings])
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const selectedBooking = bookings.find((booking) => booking.id === selectedId)
  const filteredVehicles = calendarVehicles.filter((vehicle) => {
    const matchesVehicle = vehicleFilter === 'all' || String(vehicle.id) === vehicleFilter
    const matchesQuery = !query || `${vehicle.name} ${vehicle.plate}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    return matchesVehicle && matchesQuery
  })
  const filteredBookings = bookings.filter((booking) => booking.status !== 'cancelled' && (statusFilter === 'all' || booking.status === statusFilter))

  const resetForm = () => {
    setIsAdding(false)
    setFormError('')
    setMode('reservation')
    setFormStart(toLocalInput(addDays(new Date(), 1)))
    setFormEnd(toLocalInput(addDays(new Date(), 2)))
  }

  const saveBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const data = new FormData(event.currentTarget)
    const vehicle = calendarVehicles.find((item) => item.id === Number(data.get('vehicleId')))
    const client = String(data.get('client') ?? '').trim()
    const start = String(data.get('start') ?? '')
    const end = String(data.get('end') ?? '')
    const price = Number(data.get('price'))
    const deposit = Number(data.get('deposit') || 0)
    const paid = Number(data.get('paid') || 0)
    const status: BookingStatus = mode === 'rental' ? 'active' : reservationStatus

    if (!vehicle || !client || !start || !end || new Date(start) >= new Date(end) || price <= 0 || deposit < 0 || paid < 0) {
      setFormError(t('bookingInvalidFields'))
      return
    }

    if (status !== 'pending' && hasConflict(bookings, vehicle.id, start, end)) {
      setFormError(t('bookingConflict'))
      return
    }

    const newBooking: Booking = {
      id: Date.now(),
      vehicleId: vehicle.id,
      vehicle: vehicle.name,
      client,
      start,
      end,
      status,
      price,
      deposit,
      paid,
    }
    setBookings((current) => [...current, newBooking])
    if (mode === 'rental') {
      const startMs = new Date(start).getTime()
      const endMs = new Date(end).getTime()
      const days = Math.max(1, Math.ceil((endMs - startMs) / 86_400_000))
      const rental: Rental = {
        id: newBooking.id,
        client,
        phone: '',
        vehicle: vehicle.name,
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        startAt: new Date(start).toISOString(),
        returnAt: new Date(end).toISOString(),
        dailyPrice: price,
        rentalTotal: price * days,
        deposit,
        payments: paid > 0 ? [{ id: Date.now() + 1, amount: paid, method: 'cash', kind: 'rental', date: new Date().toISOString() }] : [],
        destination: '',
        destinationStatus: 'inside',
        mileage: 0,
        fuel: 100,
        additionalCharges: 0,
        extensionCharges: 0,
        status: 'normal',
      }
      addRental(rental)
    }
    resetForm()
  }

  const confirmPending = (booking: Booking) => {
    if (hasConflict(bookings, booking.vehicleId, booking.start, booking.end, booking.id)) {
      setFormError(t('bookingConflict'))
      return
    }
    setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status: 'confirmed' } : item))
    setSelectedId(null)
  }

  const cancelBooking = (booking: Booking) => {
    setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status: 'cancelled' } : item))
    setSelectedId(null)
  }

  const openNewBooking = () => {
    setFormError('')
    setFormVehicleId('1')
    setMode('reservation')
    setIsAdding(true)
  }

  useEffect(() => {
    const openNew = () => openNewBooking()
    window.addEventListener('luxrent-open-reservations', openNew)
    return () => window.removeEventListener('luxrent-open-reservations', openNew)
  }, [])

  const firstWeekDay = days[0]
  const lastWeekDay = days[6]
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'

  return (
    <div className="reservations-page">
      <div className="reservations-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t('fleetCalendar')}</h2><p>{t('calendarSubtitle')}</p></div>
        <button type="button" className="clients-primary-button" onClick={openNewBooking}><Plus size={18} />{t('newRental')}</button>
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('calendarDemoNotice')}</span></div>
      </div>

      <section className="panel fleet-calendar">
        <div className="calendar-toolbar">
          <div className="calendar-week-controls">
            <button type="button" className="calendar-icon-button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('previousWeek')}><ChevronLeft size={18} /></button>
            <button type="button" className="calendar-icon-button" onClick={() => setWeekStart(startOfWeek(new Date()))}>{t('today')}</button>
            <button type="button" className="calendar-icon-button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('nextWeek')}><ChevronRight size={18} /></button>
            <strong>{formatRange(firstWeekDay, lastWeekDay, locale)}</strong>
          </div>
          <div className="calendar-filters">
            <label className="client-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchFleet')} aria-label={t('searchFleet')} /></label>
            <label className="calendar-select"><span>{t('vehicle')}</span><select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}><option value="all">{t('allVehicles')}</option>{calendarVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.name}</option>)}</select></label>
            <label className="calendar-select"><span>{t('status')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | BookingStatus)}><option value="all">{t('allStatuses')}</option>{(['confirmed', 'pending', 'active', 'maintenance'] as const).map((status) => <option value={status} key={status}>{t(`booking_${status}`)}</option>)}</select></label>
          </div>
        </div>

        <div className="calendar-legend">
          {(['confirmed', 'pending', 'active', 'maintenance'] as const).map((status) => <span key={status}><i className={`legend-${status}`} />{t(`booking_${status}`)}</span>)}
        </div>

        <div className="calendar-scroll">
          <div className="calendar-grid">
            <div className="calendar-header-row"><div className="calendar-vehicle-heading">{t('vehicle')}</div><div className="calendar-day-headings">{days.map((day) => <div key={day.toISOString()} className={isSameDay(day, new Date()) ? 'calendar-today' : ''}><span>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong></div>)}</div></div>
            {filteredVehicles.map((vehicle) => {
              const vehicleBookings = filteredBookings.filter((booking) => booking.vehicleId === vehicle.id && overlapsWeek(booking, firstWeekDay, lastWeekDay))
              const laneById = allocateLanes(vehicleBookings)
              const laneCount = Math.max(1, ...laneById.values()) + 1
              return (
                <div className="calendar-vehicle-row" key={vehicle.id}>
                  <div className="calendar-vehicle-label"><CarFront size={17} /><span><strong>{vehicle.name}</strong><small>{vehicle.plate}</small></span></div>
                  <div className="calendar-track" style={{ height: `${Math.max(58, laneCount * 27 + 10)}px` }}>
                    {days.map((day, index) => <div key={day.toISOString()} className={`calendar-cell ${isSameDay(day, new Date()) ? 'calendar-cell-today' : ''}`} style={{ left: `${index * 100 / 7}%`, width: `${100 / 7}%` }} />)}
                    {vehicleBookings.map((booking) => {
                      const span = getBookingSpan(booking, firstWeekDay)
                      const lane = laneById.get(booking.id) ?? 0
                      return <button type="button" key={booking.id} className={`calendar-event event-${booking.status}`} style={{ left: `${span.start * 100 / 7}%`, width: `${span.days * 100 / 7}%`, top: `${7 + lane * 27}px` }} onClick={() => { setSelectedId(booking.id); setFormError('') }} aria-label={`${booking.vehicle}, ${booking.client}, ${t(`booking_${booking.status}`)}`}><strong>{booking.client}</strong><span>{formatClock(booking.start, locale)}–{formatClock(booking.end, locale)}</span></button>
                    })}
                    {!vehicleBookings.length && <span className="calendar-empty">{t('noBookings')}</span>}
                  </div>
                </div>
              )
            })}
            {!filteredVehicles.length && <div className="calendar-no-results">{t('noVehiclesFound')}</div>}
          </div>
        </div>

        <div className="calendar-footnote"><Clock3 size={15} /><span>{t('calendarTimeNote')}</span></div>
      </section>

      {isAdding && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) resetForm() }}>
          <section className="client-modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-form-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="booking-form-title">{mode === 'rental' ? t('startRentalNow') : t('newReservation')}</h3></div><button type="button" className="icon-quiet" onClick={resetForm} aria-label={t('close')}><X size={19} /></button></div>
            <p className="client-modal-note">{t('bookingFormDemoNotice')}</p>
            <form onSubmit={saveBooking}>
              <div className="booking-mode-switch"><button type="button" className={mode === 'reservation' ? 'mode-selected' : ''} onClick={() => setMode('reservation')}><CalendarDays size={16} />{t('saveAsReservation')}</button><button type="button" className={mode === 'rental' ? 'mode-selected' : ''} onClick={() => setMode('rental')}><CarFront size={16} />{t('startRentalNow')}</button></div>
              <label>{t('bookingClientLabel')}<input name="client" required placeholder={t('bookingClientLabel')} /></label>
              <label>{t('vehicle')}<select name="vehicleId" value={formVehicleId} onChange={(event) => setFormVehicleId(event.target.value)}>{calendarVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} · {vehicle.plate}</option>)}</select></label>
              <div className="booking-form-grid">
                <label>{t('pickupDateTime')}<input name="start" type="datetime-local" value={formStart} onChange={(event) => setFormStart(event.target.value)} required /></label>
                <label>{t('returnDateTime')}<input name="end" type="datetime-local" value={formEnd} onChange={(event) => setFormEnd(event.target.value)} required /></label>
                <label>{t('dailyPrice')}<input name="price" type="number" min="1" defaultValue="500" required /></label>
                <label>{t('depositAmount')}<input name="deposit" type="number" min="0" defaultValue="0" /></label>
                <label>{t('paymentAmount')}<input name="paid" type="number" min="0" defaultValue="0" /></label>
                {mode === 'reservation' && <label>{t('reservationStatus')}<select value={reservationStatus} onChange={(event) => setReservationStatus(event.target.value as 'confirmed' | 'pending')}><option value="confirmed">{t('booking_confirmed')}</option><option value="pending">{t('booking_pending')}</option></select></label>}
              </div>
              <AvailabilityNotice available={!formStart || !formEnd || !hasConflict(bookings, Number(formVehicleId), formStart, formEnd)} pending={mode === 'reservation' && reservationStatus === 'pending'} t={t} />
              {formError && <p className="client-form-error" role="alert">{formError}</p>}
              <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={resetForm}>{t('cancel')}</button><button type="submit" className="clients-primary-button">{mode === 'rental' ? t('startRentalNow') : t('saveAsReservation')}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedBooking && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedId(null); setFormError('') } }}>
          <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="booking-details-title">{selectedBooking.vehicle}</h3></div><button type="button" className="icon-quiet" onClick={() => { setSelectedId(null); setFormError('') }} aria-label={t('close')}><X size={19} /></button></div>
            <div className={`booking-detail-status event-${selectedBooking.status}`}>{t(`booking_${selectedBooking.status}`)}</div>
            <div className="booking-detail-list"><span>{t('bookingClientLabel')}<strong>{selectedBooking.client}</strong></span><span>{t('pickupDateTime')}<strong>{formatDateTime(selectedBooking.start, locale)}</strong></span><span>{t('returnDateTime')}<strong>{formatDateTime(selectedBooking.end, locale)}</strong></span><span>{t('dailyPrice')}<strong>{formatMoney(selectedBooking.price)} MAD</strong></span><span>{t('depositAmount')}<strong>{formatMoney(selectedBooking.deposit)} MAD</strong></span><span>{t('paymentAmount')}<strong>{formatMoney(selectedBooking.paid)} MAD</strong></span></div>
            {formError && <p className="client-form-error" role="alert">{formError}</p>}
            <p className="client-modal-note">{t('bookingMutationDemoNotice')}</p>
            <div className="client-modal-actions">
              {selectedBooking.status === 'pending' && <button type="button" className="client-cancel-button" onClick={() => confirmPending(selectedBooking)}>{t('confirmReservation')}</button>}
              {selectedBooking.status === 'confirmed' && <button type="button" className="client-cancel-button" onClick={() => cancelBooking(selectedBooking)}>{t('cancelReservation')}</button>}
              <button type="button" className="clients-primary-button" onClick={() => { setSelectedId(null); setFormError('') }}>{t('close')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function AvailabilityNotice({ available, pending, t }: { available: boolean; pending: boolean; t: (key: string) => string }) {
  const key = pending ? 'pendingDoesNotBlock' : available ? 'vehicleAvailable' : 'vehicleUnavailable'
  return <div className={`availability-notice ${pending || available ? 'availability-ok' : 'availability-conflict'}`}><span />{t(key)}</div>
}

function hasConflict(bookings: Booking[], vehicleId: number, start: string, end: string, ignoreId?: number) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) return false
  return bookings.some((booking) => {
    if (booking.id === ignoreId || booking.vehicleId !== vehicleId || !['confirmed', 'active', 'maintenance'].includes(booking.status)) return false
    return startTime < new Date(booking.end).getTime() && endTime > new Date(booking.start).getTime()
  })
}

function allocateLanes(bookings: Booking[]) {
  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start))
  const laneEnds: number[] = []
  const lanes = new Map<number, number>()
  for (const booking of sorted) {
    const startTime = new Date(booking.start).getTime()
    const lane = laneEnds.findIndex((end) => end <= startTime)
    const laneIndex = lane === -1 ? laneEnds.length : lane
    laneEnds[laneIndex] = new Date(booking.end).getTime()
    lanes.set(booking.id, laneIndex)
  }
  return lanes
}

function getBookingSpan(booking: Booking, first: Date) {
  const start = Math.max(0, differenceInDays(startOfDay(new Date(booking.start)), first))
  const end = Math.min(7, differenceInDays(startOfDay(new Date(booking.end)), first) + 1)
  return { start, days: Math.max(1, end - start) }
}

function overlapsWeek(booking: Booking, first: Date, last: Date) {
  const weekStart = startOfDay(first).getTime()
  const weekEnd = addDays(startOfDay(last), 1).getTime()
  return new Date(booking.start).getTime() < weekEnd && new Date(booking.end).getTime() > weekStart
}

function createDemoBookings(weekStart: Date): Booking[] {
  const at = (day: number, hour: number) => {
    const date = addDays(weekStart, day)
    date.setHours(hour, 0, 0, 0)
    return toLocalInput(date)
  }
  return [
    { id: 101, vehicleId: 1, vehicle: demoVehicles[0].name, client: 'Sarah El Amrani', start: at(0, 9), end: at(2, 10), status: 'active', price: 850, deposit: 2000, paid: 1700 },
    { id: 102, vehicleId: 2, vehicle: demoVehicles[1].name, client: 'Youssef Benali', start: at(1, 10), end: at(3, 13), status: 'confirmed', price: 620, deposit: 1000, paid: 620 },
    { id: 103, vehicleId: 3, vehicle: demoVehicles[2].name, client: 'Nadia Karim', start: at(2, 9), end: at(4, 17), status: 'pending', price: 1100, deposit: 0, paid: 0 },
    { id: 104, vehicleId: 4, vehicle: demoVehicles[3].name, client: 'Maintenance', start: at(1, 8), end: at(2, 18), status: 'maintenance', price: 0, deposit: 0, paid: 0 },
    { id: 105, vehicleId: 1, vehicle: demoVehicles[0].name, client: 'Omar Haddad', start: at(4, 10), end: at(6, 12), status: 'confirmed', price: 850, deposit: 1500, paid: 850 },
  ]
}

function loadBookingPreview(): Booking[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-bookings')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed as Booking[]
    }
  } catch {
    // Keep labeled demo bookings if browser storage is unavailable or invalid.
  }
  return createDemoBookings(startOfWeek(new Date()))
}

function loadReservationVehicles(): { id: number; name: string; plate: string }[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-vehicles')
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{ id: number; brand: string; model: string; plate: string }>
      if (Array.isArray(parsed)) {
        return parsed
          .filter((vehicle) => typeof vehicle.id === 'number' && vehicle.brand && vehicle.model)
          .map((vehicle) => ({ id: vehicle.id, name: `${vehicle.brand} ${vehicle.model}`, plate: vehicle.plate }))
      }
    }
  } catch {
    // Keep demo fleet names if browser vehicle storage is unavailable or invalid.
  }
  return demoVehicles
}

function startOfWeek(date: Date) {
  const result = startOfDay(date)
  const daysFromMonday = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - daysFromMonday)
  return result
}

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function differenceInDays(date: Date, base: Date) {
  return Math.round((startOfDay(date).getTime() - startOfDay(base).getTime()) / 86400000)
}

function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}

function formatRange(first: Date, last: Date, locale: string) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startText = new Intl.DateTimeFormat(locale, options).format(first)
  const endText = new Intl.DateTimeFormat(locale, { ...options, year: 'numeric' }).format(last)
  return `${startText} – ${endText}`
}

function formatClock(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

function formatDateTime(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value)
}
