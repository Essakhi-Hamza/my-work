import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

type ClientRecord = {
  id: number
  name: string
  email: string
  phone: string
  city: string
  rentals: number
  joined: string
  cin?: string
  passport?: string
  drivingLicence?: string
  accessCode?: string
}

const demoClients: ClientRecord[] = [
  { id: 1, name: 'Sarah El Amrani', email: 'sarah.elamrani@example.test', phone: '+212 6 12 34 56 78', city: 'Casablanca', rentals: 8, joined: '12 Feb 2024' },
  { id: 2, name: 'Youssef Benali', email: 'youssef.benali@example.test', phone: '+212 6 23 45 67 89', city: 'Rabat', rentals: 5, joined: '04 Jun 2024' },
  { id: 3, name: 'Nadia Karim', email: 'nadia.karim@example.test', phone: '+212 6 34 56 78 90', city: 'Marrakech', rentals: 3, joined: '19 Sep 2024' },
  { id: 4, name: 'Omar Haddad', email: 'omar.haddad@example.test', phone: '+212 6 45 67 89 01', city: 'Tangier', rentals: 1, joined: '07 Jan 2025' },
]

type ClientsPageProps = { t: (key: string) => string }

export default function ClientsPage({ t }: ClientsPageProps) {
  const [clients, setClients] = useState<ClientRecord[]>(loadClientPreview)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formError, setFormError] = useState('')
  useEffect(() => {
    const safeClients = clients.map(({ cin: _cin, passport: _passport, drivingLicence: _drivingLicence, accessCode: _accessCode, ...client }) => client)
    localStorage.setItem('luxrent-preview-clients', JSON.stringify(safeClients))
  }, [clients])
  useEffect(() => {
    const openNew = () => { setFormError(''); setIsAdding(true) }
    window.addEventListener('luxrent-open-clients', openNew)
    return () => window.removeEventListener('luxrent-open-clients', openNew)
  }, [])
  const selectedClient = clients.find((client) => client.id === selectedId)
  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return clients
    return clients.filter((client) =>
      [client.name, client.email, client.phone, client.city]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
    )
  }, [clients, query])

  const deleteClient = (clientId: number) => {
    if (!window.confirm(t('deleteClientConfirm'))) return
    setClients((current) => current.filter((client) => client.id !== clientId))
    setSelectedId((current) => current === clientId ? null : current)
  }

  const addClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    const city = String(formData.get('city') ?? '').trim()
    const cin = String(formData.get('cin') ?? '').trim()
    const passport = String(formData.get('passport') ?? '').trim()
    const drivingLicence = String(formData.get('drivingLicence') ?? '').trim()

    if (!name || !email || !phone) {
      setFormError(t('clientRequiredFields'))
      return
    }

    const newClient: ClientRecord = {
      id: Date.now(),
      name,
      email,
      phone,
      city: city || t('notProvided'),
      rentals: 0,
      joined: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date()),
      cin: cin || undefined,
      passport: passport || undefined,
      drivingLicence: drivingLicence || undefined,
      accessCode: createPreviewAccessCode(),
    }
    setClients((current) => [newClient, ...current])
    setSelectedId(newClient.id)
    setIsAdding(false)
  }

  return (
    <div className="clients-page">
      <div className="clients-heading">
        <div>
          <p className="section-kicker">LUXRENT</p>
          <h2>{t('clientDirectory')}</h2>
          <p className="clients-subtitle">{t('clientDirectorySubtitle')}</p>
        </div>
        {!selectedClient && (
          <button type="button" className="clients-primary-button" onClick={() => { setFormError(''); setIsAdding(true) }}>
            <Plus size={18} />{t('addClient')}
          </button>
        )}
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} />
        <div><strong>{t('demoTag')}</strong><span>{t('clientDemoNotice')}</span></div>
      </div>

      {selectedClient ? (
        <section className="client-profile panel">
          <button type="button" className="client-back-button" onClick={() => setSelectedId(null)}>
            <ArrowLeft size={17} />{t('backToClients')}
          </button>
          <div className="client-profile-heading">
            <div className="client-avatar">{getInitials(selectedClient.name)}</div>
            <div className="client-profile-name"><h3>{selectedClient.name}</h3><span>{t('clientSince')} {selectedClient.joined}</span></div>
            <span className="client-demo-badge">{t('demoTag')}</span>
          </div>

          <div className="client-stat-grid">
            <div><span>{t('rentalHistoryCount')}</span><strong>{selectedClient.rentals}</strong></div>
            <div><span>{t('activeRentals')}</span><strong>0</strong></div>
            <div><span>{t('outstandingBalance')}</span><strong>—</strong></div>
          </div>

          <div className="client-profile-columns">
            <section className="client-info-card">
              <h4>{t('contactInformation')}</h4>
              <div className="client-info-row"><Mail size={17} /><div><span>{t('emailAddress')}</span><strong>{selectedClient.email}</strong></div></div>
              <div className="client-info-row"><Phone size={17} /><div><span>{t('phoneNumber')}</span><strong>{selectedClient.phone}</strong></div></div>
              <div className="client-info-row"><MapPin size={17} /><div><span>{t('city')}</span><strong>{selectedClient.city}</strong></div></div>
            </section>
            <section className="client-info-card">
              <h4>{t('identityDocuments')}</h4>
              {selectedClient.cin || selectedClient.passport || selectedClient.drivingLicence ? (
                <div className="client-document-list">
                  {selectedClient.cin && <div><span>{t('cinNumber')}</span><strong>{selectedClient.cin}</strong></div>}
                  {selectedClient.passport && <div><span>{t('passportNumber')}</span><strong>{selectedClient.passport}</strong></div>}
                  {selectedClient.drivingLicence && <div><span>{t('drivingLicenceNumber')}</span><strong>{selectedClient.drivingLicence}</strong></div>}
                </div>
              ) : (
                <div className="client-empty-state"><ShieldAlert size={20} /><p>{t('documentsNotConnected')}</p></div>
              )}
              {selectedClient.accessCode && (
                <div className="client-access-code"><span>{t('clientAccessCode')}</span><strong>{selectedClient.accessCode}</strong><small>{t('accessCodePreviewOnly')}</small></div>
              )}
            </section>
          </div>

          <section className="client-info-card client-history-card">
            <h4>{t('rentalHistory')}</h4>
            <div className="client-empty-state"><UserRound size={20} /><p>{t('historyNotConnected')}</p></div>
          </section>
        </section>
      ) : (
        <section className="panel client-directory">
          <div className="client-list-toolbar">
            <div className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchClients')} aria-label={t('searchClients')} /></div>
            <span className="client-result-count">{filteredClients.length} {t('clientsShown')}</span>
          </div>

          {filteredClients.length ? (
            <div className="client-table-scroll">
              <table className="client-table">
                <thead><tr><th>{t('clientName')}</th><th>{t('contactInformation')}</th><th>{t('city')}</th><th>{t('rentalHistoryCount')}</th><th aria-label={t('openClientProfile')} /><th aria-label={t('deleteClient')} /></tr></thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td><button type="button" className="client-name-button" onClick={() => setSelectedId(client.id)}><span className="client-avatar-small">{getInitials(client.name)}</span><strong>{client.name}</strong></button></td>
                      <td><span className="client-table-email">{client.email}</span><span className="client-table-phone">{client.phone}</span></td>
                      <td>{client.city}</td>
                      <td><span className="rental-count-pill">{client.rentals}</span></td>
                      <td><button type="button" className="client-open-button" onClick={(event) => { event.stopPropagation(); setSelectedId(client.id) }} aria-label={`${t('openClientProfile')}: ${client.name}`}><ChevronRight size={17} /></button></td>
                      <td><button type="button" className="client-delete-button" onClick={(event) => { event.stopPropagation(); deleteClient(client.id) }} aria-label={`${t('deleteClient')}: ${client.name}`} title={t('deleteClient')}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="client-no-results"><Search size={22} /><p>{t('noClientsFound')}</p></div>
          )}
        </section>
      )}

      {isAdding && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false) }}>
          <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="add-client-title">{t('addClient')}</h3></div><button type="button" className="icon-quiet" onClick={() => setIsAdding(false)} aria-label={t('close')}><X size={19} /></button></div>
            <p className="client-modal-note">{t('clientFormDemoNotice')}</p>
            <form onSubmit={addClient}>
              <label>{t('fullName')}<input name="name" autoComplete="name" required /></label>
              <label>{t('emailAddress')}<input name="email" type="email" autoComplete="email" required /></label>
              <label>{t('phoneNumber')}<input name="phone" type="tel" autoComplete="tel" required /></label>
              <label>{t('city')}<input name="city" autoComplete="address-level2" /></label>
              <label>{t('cinNumber')}<input name="cin" /></label>
              <label>{t('passportNumber')}<input name="passport" /></label>
              <label>{t('drivingLicenceNumber')}<input name="drivingLicence" /></label>
              {formError && <p className="client-form-error" role="alert">{formError}</p>}
              <div className="client-modal-actions">
                <button type="button" className="client-cancel-button" onClick={() => setIsAdding(false)}>{t('cancel')}</button>
                <button type="submit" className="clients-primary-button">{t('addClient')}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toLocaleUpperCase()
}

function loadClientPreview(): ClientRecord[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-clients')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return (parsed as Array<Record<string, unknown>>).map((client) => ({
          id: Number(client.id),
          name: String(client.name ?? ''),
          email: String(client.email ?? ''),
          phone: String(client.phone ?? ''),
          city: String(client.city ?? ''),
          rentals: Number(client.rentals ?? 0),
          joined: String(client.joined ?? ''),
        }))
      }
    }
  } catch {
    // Keep the labeled demo records if browser storage is unavailable or invalid.
  }
  return demoClients
}

function createPreviewAccessCode() {
  const random = globalThis.crypto?.getRandomValues
  if (!random) return `LR-${Date.now().toString(36).slice(-6).toUpperCase()}`
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return `LR-${values[0].toString(36).padStart(6, '0').slice(-6).toUpperCase()}`
}
