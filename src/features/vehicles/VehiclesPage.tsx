import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ChevronRight,
  Fuel,
  Gauge,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'

type VehicleStatus = 'available' | 'reserved' | 'rented' | 'maintenance'
const currentYear = new Date().getFullYear()
type Vehicle = {
  id: number
  brand: string
  model: string
  year: number
  plate: string
  price: number
  transmission: string
  fuel: string
  seats: number
  status: VehicleStatus
  insuranceExpiry: string
  inspectionExpiry: string
  mileage: number
  images?: string[]
}

const demoVehicles: Vehicle[] = [
  { id: 1, brand: 'Mercedes-Benz', model: 'C-Class', year: 2024, plate: '12345-A-6', price: 850, transmission: 'Automatic', fuel: 'Diesel', seats: 5, status: 'rented', insuranceExpiry: '2027-03-12', inspectionExpiry: '2027-06-20', mileage: 18400 },
  { id: 2, brand: 'Volkswagen', model: 'Tiguan', year: 2023, plate: '67890-B-6', price: 620, transmission: 'Automatic', fuel: 'Diesel', seats: 5, status: 'available', insuranceExpiry: '2026-12-05', inspectionExpiry: '2027-04-15', mileage: 32600 },
  { id: 3, brand: 'Range Rover', model: 'Evoque', year: 2024, plate: '24680-C-6', price: 1100, transmission: 'Automatic', fuel: 'Hybrid', seats: 5, status: 'reserved', insuranceExpiry: '2027-08-19', inspectionExpiry: '2027-09-10', mileage: 12100 },
  { id: 4, brand: 'Dacia', model: 'Duster', year: 2022, plate: '13579-D-6', price: 420, transmission: 'Manual', fuel: 'Diesel', seats: 5, status: 'maintenance', insuranceExpiry: '2027-01-30', inspectionExpiry: '2026-12-02', mileage: 54200 },
]

type VehiclesPageProps = { t: (key: string) => string }

export default function VehiclesPage({ t }: VehiclesPageProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(loadVehiclePreview)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const temporaryImageUrls = useRef<string[]>([])
  useEffect(() => () => temporaryImageUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    const serializable = vehicles.map((vehicle) => ({ ...vehicle, images: undefined }))
    localStorage.setItem('luxrent-preview-vehicles', JSON.stringify(serializable))
  }, [vehicles])
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedId)
  const editingVehicle = vehicles.find((vehicle) => vehicle.id === editingId)
  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return vehicles.filter((vehicle) => {
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
      const matchesSearch = !normalizedQuery || [vehicle.brand, vehicle.model, vehicle.plate]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesSearch
    })
  }, [query, statusFilter, vehicles])

  const closeForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setError('')
  }

  const saveVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const brand = String(formData.get('brand') ?? '').trim()
    const model = String(formData.get('model') ?? '').trim()
    const plate = String(formData.get('plate') ?? '').trim()
    const year = Number(formData.get('year'))
    const price = Number(formData.get('price'))
    const seats = Number(formData.get('seats'))

    if (!brand || !model || !plate || !Number.isInteger(year) || price <= 0 || !Number.isInteger(seats) || seats < 1) {
      setError(t('vehicleRequiredFields'))
      return
    }

    const files = formData.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0)
    const images = files.length
      ? files.map((file) => {
          const imageUrl = URL.createObjectURL(file)
          temporaryImageUrls.current.push(imageUrl)
          return imageUrl
        })
      : editingVehicle?.images ?? []
    const vehicleData = {
      brand,
      model,
      plate,
      year,
      price,
      seats,
      transmission: String(formData.get('transmission') ?? 'Automatic'),
      fuel: String(formData.get('fuel') ?? 'Petrol'),
      status: String(formData.get('status') ?? 'available') as VehicleStatus,
      insuranceExpiry: String(formData.get('insuranceExpiry') ?? ''),
      inspectionExpiry: String(formData.get('inspectionExpiry') ?? ''),
      mileage: Number(formData.get('mileage') ?? 0),
      images,
    }

    if (editingVehicle) {
      setVehicles((current) => current.map((vehicle) => vehicle.id === editingVehicle.id ? { ...vehicle, ...vehicleData } : vehicle))
      setSelectedId(editingVehicle.id)
    } else {
      const newVehicle = { ...vehicleData, id: Date.now() }
      setVehicles((current) => [newVehicle, ...current])
      setSelectedId(newVehicle.id)
    }
    closeForm()
  }

  const openAddForm = () => {
    setSelectedId(null)
    setEditingId(null)
    setError('')
    setIsAdding(true)
  }

  useEffect(() => {
    const openNew = () => openAddForm()
    window.addEventListener('luxrent-open-vehicles', openNew)
    return () => window.removeEventListener('luxrent-open-vehicles', openNew)
  }, [])

  return (
    <div className="vehicles-page">
      <div className="vehicles-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t('fleetManagement')}</h2><p>{t('fleetSubtitle')}</p></div>
        {!selectedVehicle && <button type="button" className="clients-primary-button" onClick={openAddForm}><Plus size={18} />{t('addVehicle')}</button>}
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('vehicleDemoNotice')}</span></div>
      </div>

      {selectedVehicle ? (
        <VehicleDetails
          vehicle={selectedVehicle}
          t={t}
          now={now}
          onBack={() => setSelectedId(null)}
          onEdit={() => { setEditingId(selectedVehicle.id); setError('') }}
        />
      ) : (
        <>
          <div className="vehicle-summary">
            {(['available', 'reserved', 'rented', 'maintenance'] as const).map((status) => (
              <button type="button" className={`vehicle-summary-item ${statusFilter === status ? 'vehicle-summary-selected' : ''}`} key={status} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
                <span className={`vehicle-summary-dot status-${status}`} />
                <span>{t(`vehicleStatus_${status}`)}</span>
                <strong>{vehicles.filter((vehicle) => vehicle.status === status).length}</strong>
              </button>
            ))}
          </div>

          <section className="panel vehicle-directory">
            <div className="vehicle-toolbar">
              <div className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchVehicles')} aria-label={t('searchVehicles')} /></div>
              <label className="vehicle-status-filter"><span>{t('filterByStatus')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | VehicleStatus)}><option value="all">{t('allStatuses')}</option>{(['available', 'reserved', 'rented', 'maintenance'] as const).map((status) => <option value={status} key={status}>{t(`vehicleStatus_${status}`)}</option>)}</select></label>
            </div>

            {filteredVehicles.length ? (
              <div className="vehicle-card-grid">
                {filteredVehicles.map((vehicle) => (
                  <article className="vehicle-card" key={vehicle.id}>
                    <button type="button" className="vehicle-card-open" onClick={() => setSelectedId(vehicle.id)} aria-label={`${t('openVehicleDetails')}: ${vehicle.brand} ${vehicle.model}`}>
                      <VehicleImage vehicle={vehicle} t={t} />
                      <div className="vehicle-card-body">
                        <div className="vehicle-name-row"><div><p>{vehicle.brand}</p><h3>{vehicle.model}</h3></div><ChevronRight size={17} /></div>
                        <div className="vehicle-plate">{vehicle.plate} <span>·</span> {vehicle.year}</div>
                        <div className="vehicle-spec-row"><span><Users size={15} />{vehicle.seats}</span><span><Fuel size={15} />{vehicle.fuel}</span><span><Gauge size={15} />{vehicle.transmission}</span></div>
                        <div className="vehicle-card-footer"><span className={`vehicle-status-badge status-${vehicle.status}`}><i />{t(`vehicleStatus_${vehicle.status}`)}</span><strong>{formatPrice(vehicle.price)} <small>MAD / {t('day')}</small></strong></div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            ) : <div className="client-no-results"><Search size={22} /><p>{t('noVehiclesFound')}</p></div>}
          </section>
        </>
      )}

      {(isAdding || editingVehicle) && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
          <section className="client-modal vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="vehicle-form-title">{editingVehicle ? t('editVehicle') : t('addVehicle')}</h3></div><button type="button" className="icon-quiet" onClick={closeForm} aria-label={t('close')}><X size={19} /></button></div>
            <p className="client-modal-note">{t('vehicleFormDemoNotice')}</p>
            <form key={editingVehicle?.id ?? 'new'} onSubmit={saveVehicle}>
              <div className="vehicle-form-grid">
                <label>{t('brand')}<input name="brand" defaultValue={editingVehicle?.brand} required /></label>
                <label>{t('model')}<input name="model" defaultValue={editingVehicle?.model} required /></label>
                <label>{t('year')}<input name="year" type="number" min="1980" max="2100" defaultValue={editingVehicle?.year ?? currentYear} required /></label>
                <label>{t('registrationNumber')}<input name="plate" defaultValue={editingVehicle?.plate} required /></label>
                <label>{t('dailyPrice')}<input name="price" type="number" min="1" step="1" defaultValue={editingVehicle?.price} required /></label>
                <label>{t('numberOfSeats')}<input name="seats" type="number" min="1" max="50" defaultValue={editingVehicle?.seats ?? 5} required /></label>
                <label>{t('transmission')}<select name="transmission" defaultValue={editingVehicle?.transmission ?? 'Automatic'}><option>Automatic</option><option>Manual</option></select></label>
                <label>{t('fuelType')}<select name="fuel" defaultValue={editingVehicle?.fuel ?? 'Petrol'}><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></label>
                <label>{t('vehicleStatus')}<select name="status" defaultValue={editingVehicle?.status ?? 'available'}>{(['available', 'reserved', 'rented', 'maintenance'] as const).map((status) => <option value={status} key={status}>{t(`vehicleStatus_${status}`)}</option>)}</select></label>
                <label>{t('mileage')}<input name="mileage" type="number" min="0" defaultValue={editingVehicle?.mileage ?? 0} /></label>
                <label>{t('insuranceExpiry')}<input name="insuranceExpiry" type="date" defaultValue={editingVehicle?.insuranceExpiry} /></label>
                <label>{t('inspectionExpiry')}<input name="inspectionExpiry" type="date" defaultValue={editingVehicle?.inspectionExpiry} /></label>
              </div>
              <label className="vehicle-photo-input"><ImagePlus size={18} />{t('vehiclePhotos')}<input name="photos" type="file" accept="image/*" multiple /></label>
              {error && <p className="client-form-error" role="alert">{error}</p>}
              <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={closeForm}>{t('cancel')}</button><button type="submit" className="clients-primary-button">{editingVehicle ? t('saveChanges') : t('addVehicle')}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function VehicleImage({ vehicle, t }: { vehicle: Vehicle; t: (key: string) => string }) {
  return (
    <div className="vehicle-image">
      {vehicle.images?.[0] ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} /> : <div className="vehicle-image-placeholder"><CarFront size={54} strokeWidth={1.2} /><span>LUXRENT FLEET</span></div>}
      <span className={`vehicle-status-badge status-${vehicle.status}`}><i />{t(`vehicleStatus_${vehicle.status}`)}</span>
    </div>
  )
}

function VehicleDetails({ vehicle, t, onBack, onEdit, now }: { vehicle: Vehicle; t: (key: string) => string; onBack: () => void; onEdit: () => void; now: number }) {
  return (
    <section className="panel vehicle-detail">
      <div className="vehicle-detail-actions"><button type="button" className="client-back-button" onClick={onBack}><ArrowLeft size={17} />{t('backToFleet')}</button><button type="button" className="clients-primary-button" onClick={onEdit}><Pencil size={16} />{t('editVehicle')}</button></div>
      <div className="vehicle-detail-hero"><VehicleImage vehicle={vehicle} t={t} /><div><p className="section-kicker">{vehicle.year} · {vehicle.plate}</p><h3>{vehicle.brand} {vehicle.model}</h3><strong>{formatPrice(vehicle.price)} <small>MAD / {t('day')}</small></strong></div></div>
      {vehicle.images && vehicle.images.length > 1 && <div className="vehicle-image-gallery">{vehicle.images.map((image, index) => <img src={image} alt={`${vehicle.brand} ${vehicle.model} ${index + 1}`} key={image} />)}</div>}
      <div className="vehicle-detail-grid">
        <section className="client-info-card"><h4>{t('vehicleSpecifications')}</h4><div className="vehicle-spec-detail"><span>{t('transmission')}</span><strong>{vehicle.transmission}</strong></div><div className="vehicle-spec-detail"><span>{t('fuelType')}</span><strong>{vehicle.fuel}</strong></div><div className="vehicle-spec-detail"><span>{t('numberOfSeats')}</span><strong>{vehicle.seats}</strong></div><div className="vehicle-spec-detail"><span>{t('mileage')}</span><strong>{vehicle.mileage.toLocaleString()} km</strong></div></section>
        <section className="client-info-card"><h4>{t('vehicleDocuments')}</h4><div className="vehicle-document-row"><CalendarDays size={17} /><div><span>{t('insuranceExpiry')}</span><strong>{formatDate(vehicle.insuranceExpiry)}</strong></div><ExpiryStatus date={vehicle.insuranceExpiry} now={now} t={t} /></div><div className="vehicle-document-row"><CalendarDays size={17} /><div><span>{t('inspectionExpiry')}</span><strong>{formatDate(vehicle.inspectionExpiry)}</strong></div><ExpiryStatus date={vehicle.inspectionExpiry} now={now} t={t} /></div><div className="vehicle-empty-docs"><ShieldAlert size={17} /><p>{t('vehicleDocsNotUploaded')}</p></div></section>
      </div>
      <section className="client-info-card vehicle-history"><h4>{t('vehicleHistory')}</h4><div className="client-empty-state"><CarFront size={19} /><p>{t('vehicleHistoryNotConnected')}</p></div></section>
    </section>
  )
}

function ExpiryStatus({ date, now, t }: { date: string; now: number; t: (key: string) => string }) {
  const daysRemaining = date ? Math.ceil((new Date(`${date}T23:59:59`).getTime() - now) / 86400000) : null
  if (daysRemaining === null) return <span className="expiry-pill">{t('dateNotSet')}</span>
  if (daysRemaining < 0) return <span className="expiry-pill expiry-overdue">{t('expired')}</span>
  if (daysRemaining <= 30) return <span className="expiry-pill expiry-warning">{t('expiresSoon')}</span>
  return <span className="expiry-pill expiry-ok">{t('upToDate')}</span>
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-MA').format(price)
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))
}

function loadVehiclePreview(): Vehicle[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-vehicles')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed as Vehicle[]
    }
  } catch {
    // Keep the labeled demo fleet if browser storage is unavailable or invalid.
  }
  return demoVehicles
}
