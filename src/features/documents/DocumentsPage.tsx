import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { FileText, Plus, Search, ShieldAlert, Trash2, Upload, X } from 'lucide-react'

type DocumentType =
  | 'identity'
  | 'license'
  | 'insurance'
  | 'registration'
  | 'inspection'
  | 'contract'
  | 'receipt'
  | 'returnInspection'

type DocumentRecord = {
  id: number
  type: DocumentType
  owner: string
  reference: string
  expiresOn: string
}

const documentTypes: DocumentType[] = [
  'identity',
  'license',
  'insurance',
  'registration',
  'inspection',
  'contract',
  'receipt',
  'returnInspection',
]

const templates = documentTypes
type DocumentTemplate = (typeof templates)[number]

type Props = { t: (key: string) => string; language: string }

export default function DocumentsPage({ t, language }: Props) {
  const [records, setRecords] = useState<DocumentRecord[]>(loadDocumentPreview)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [printTemplate, setPrintTemplate] = useState<DocumentTemplate | null>(null)
  const [printError, setPrintError] = useState('')
  const [printPreview, setPrintPreview] = useState<string | null>(null)
  const previewFrame = useRef<HTMLIFrameElement>(null)
  const printForm = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    localStorage.setItem('luxrent-preview-documents', JSON.stringify(records))
  }, [records])
  const selectedRecord = records.find((record) => record.id === selectedId)
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return records.filter((record) =>
      (typeFilter === 'all' || record.type === typeFilter) &&
      (!normalized || [record.owner, record.reference, t(`documentType_${record.type}`)]
        .some((value) => value.toLocaleLowerCase().includes(normalized))),
    )
  }, [query, records, t, typeFilter])

  const addRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const owner = String(data.get('owner') ?? '').trim()
    const type = String(data.get('type') ?? '') as DocumentType
    const reference = String(data.get('reference') ?? '').trim()
    const expiresOn = String(data.get('expiresOn') ?? '')
    if (!owner || !documentTypes.includes(type)) {
      setError(t('documentRecordRequired'))
      return
    }

    const record = { id: Date.now(), type, owner, reference, expiresOn }
    setRecords((current) => [record, ...current])
    setQuery('')
    setTypeFilter('all')
    setSelectedId(record.id)
    setIsAdding(false)
    setError('')
  }

  const formatDate = (date: string) => {
    if (!date) return t('noExpiryDate')
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`))
  }

  const deleteSelectedRecord = () => {
    if (!selectedRecord) return
    if (!window.confirm(t('deleteDocumentConfirm'))) return
    setRecords((current) => current.filter((record) => record.id !== selectedRecord.id))
    setSelectedId(null)
  }

  const deleteRecord = (recordId: number) => {
    if (!window.confirm(t('deleteDocumentConfirm'))) return
    setRecords((current) => current.filter((record) => record.id !== recordId))
  }

  const printDocument = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!printTemplate) return
    const data = new FormData(event.currentTarget)
    const required = ['client', 'reference']
    if (printTemplate === 'contract' || printTemplate === 'receipt' || printTemplate === 'returnInspection' || printTemplate === 'inspection' || printTemplate === 'insurance' || printTemplate === 'registration') {
      required.push('vehicle')
    }
    if (printTemplate === 'contract') required.push('startDate', 'endDate')
    if (printTemplate === 'receipt') required.push('amount')
    if (printTemplate === 'returnInspection') required.push('mileage', 'fuel')
    const missing = required.some((key) => !String(data.get(key) ?? '').trim())
    if (missing) {
      setPrintError(t('documentPrintRequired'))
      return
    }
    const values = Object.fromEntries(
      Array.from(data.entries()).map(([key, value]) => [key, typeof value === 'string' ? value : value.name]),
    )
    setPrintPreview(buildDocumentPreview(printTemplate, t, values))
    setPrintTemplate(null)
    setPrintError('')
  }

  const saveTemplateRecord = () => {
    if (!printTemplate || !printForm.current) return
    const data = new FormData(printForm.current)
    const client = String(data.get('client') ?? '').trim()
    const vehicle = String(data.get('vehicle') ?? '').trim()
    const reference = String(data.get('reference') ?? '').trim()
    if (!client || !reference) {
      setPrintError(t('documentPrintRequired'))
      return
    }
    const owner = vehicle ? `${client} · ${vehicle}` : client
    const record: DocumentRecord = {
      id: Date.now(),
      type: printTemplate,
      owner,
      reference,
      expiresOn: String(data.get('expiryDate') ?? ''),
    }
    setRecords((current) => [record, ...current])
    setTypeFilter('all')
    setQuery('')
    setPrintTemplate(null)
    setPrintError('')
  }

  return (
    <div className="documents-page">
      <div className="documents-heading">
        <div>
          <p className="section-kicker">LUXRENT</p>
          <h2>{t('documentsTitle')}</h2>
          <p>{t('documentsSubtitle')}</p>
        </div>
        {!selectedRecord && (
          <button type="button" className="clients-primary-button" onClick={() => { setError(''); setIsAdding(true) }}>
            <Plus size={18} />{t('addDocumentRecord')}
          </button>
        )}
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} />
        <div><strong>{t('demoTag')}</strong><span>{t('documentsDemoNotice')}</span></div>
      </div>

      <section className="panel document-templates">
        <div className="panel-heading">
          <div><h3>{t('documentTemplates')}</h3><p>{t('documentTemplatesNotice')}</p></div>
        </div>
        <div className="document-template-grid">
          {templates.map((template) => (
            <article className="document-template" key={template}>
              <span className="document-template-icon"><FileText size={19} /></span>
              <div><strong>{t(`documentTemplate_${template}`)}</strong><span>{t('documentPreviewLocal')}</span></div>
              <button type="button" onClick={() => { setPrintError(''); setPrintTemplate(template) }} title={t('documentPrintAction')}>
                <FileText size={15} />{t('documentPrintAction')}
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedRecord ? (
        <section className="panel document-detail">
          <button type="button" className="client-back-button" onClick={() => setSelectedId(null)}>
            {t('backToDocuments')}
          </button>
          <div className="document-detail-heading">
            <span className="document-template-icon"><FileText size={20} /></span>
            <div><p>{t(`documentType_${selectedRecord.type}`)}</p><h3>{selectedRecord.owner}</h3></div>
            <span className="document-status-missing">{t('documentMissingFile')}</span>
          </div>
          <div className="document-detail-grid">
            <div><span>{t('documentReference')}</span><strong>{selectedRecord.reference || t('notProvided')}</strong></div>
            <div><span>{t('expiryDate')}</span><strong>{formatDate(selectedRecord.expiresOn)}</strong></div>
            {getExpiryStatus(selectedRecord.expiresOn) && <div><span>{t('documentExpiryStatus')}</span><strong className={`document-expiry-status document-expiry-${getExpiryStatus(selectedRecord.expiresOn)}`}>{t(`documentExpiry_${getExpiryStatus(selectedRecord.expiresOn)}`)}</strong></div>}
            <div><span>{t('documentStatus')}</span><strong>{t('documentMissingFile')}</strong></div>
          </div>
          <div className="document-storage-notice"><ShieldAlert size={18} /><p>{t('documentFileUnavailable')}</p></div>
          <div className="document-detail-actions">
            <button type="button" className="integration-unavailable" disabled title={t('documentFileUnavailable')}>
              <Upload size={15} />{t('uploadDocument')}
            </button>
            <button type="button" className="document-delete-button" onClick={deleteSelectedRecord} title={t('deleteDocument')}>
              <Trash2 size={15} />{t('deleteDocument')}
            </button>
          </div>
        </section>
      ) : (
        <section className="panel documents-directory">
          <div className="document-toolbar">
            <div className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchDocuments')} aria-label={t('searchDocuments')} /></div>
            <label className="document-type-filter"><span>{t('documentType')}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | DocumentType)}><option value="all">{t('allDocumentTypes')}</option>{documentTypes.map((type) => <option value={type} key={type}>{t(`documentType_${type}`)}</option>)}</select></label>
            <span className="document-result-count">{filteredRecords.length} {t('documentRecordsShown')}</span>
          </div>
          {filteredRecords.length ? (
            <div className="document-list">
              {filteredRecords.map((record) => (
                <article className="document-record" key={record.id}>
                  <button type="button" className="document-record-open" onClick={() => setSelectedId(record.id)}>
                    <span className="document-template-icon"><FileText size={18} /></span>
                    <span className="document-record-main"><strong>{t(`documentType_${record.type}`)}</strong><small>{record.owner}{record.reference ? ` · ${record.reference}` : ''}</small></span>
                    <span className="document-record-expiry"><small>{t('expiryDate')}</small><strong>{formatDate(record.expiresOn)}</strong>{getExpiryStatus(record.expiresOn) && <small className={`document-expiry-status document-expiry-${getExpiryStatus(record.expiresOn)}`}>{t(`documentExpiry_${getExpiryStatus(record.expiresOn)}`)}</small>}</span>
                    <span className="document-status-missing">{t('documentMissingFile')}</span>
                  </button>
                  <button type="button" className="document-record-delete" onClick={() => deleteRecord(record.id)} aria-label={`${t('deleteDocument')}: ${record.owner}`} title={t('deleteDocument')}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="document-empty-state"><Search size={22} /><p>{t('noDocumentsFound')}</p></div>
          )}
        </section>
      )}

      {isAdding && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false) }}>
          <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="add-document-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="add-document-title">{t('addDocumentRecordTitle')}</h3></div><button type="button" className="icon-quiet" onClick={() => setIsAdding(false)} aria-label={t('close')}><X size={19} /></button></div>
            <p className="client-modal-note">{t('documentRecordDemoNote')}</p>
            <form onSubmit={addRecord}>
              <label>{t('documentType')}<select name="type" defaultValue="identity">{documentTypes.map((type) => <option value={type} key={type}>{t(`documentType_${type}`)}</option>)}</select></label>
              <label>{t('documentOwner')}<input name="owner" required autoComplete="off" /></label>
              <label>{t('documentReference')}<input name="reference" autoComplete="off" /></label>
              <label>{t('expiryDate')}<input name="expiresOn" type="date" /></label>
              {error && <p className="client-form-error" role="alert">{error}</p>}
              <div className="client-modal-actions">
                <button type="button" className="client-cancel-button" onClick={() => setIsAdding(false)}>{t('cancel')}</button>
                <button type="submit" className="clients-primary-button">{t('addDocumentRecord')}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {printTemplate && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrintTemplate(null) }}>
          <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="print-document-title">
            <div className="client-modal-heading">
              <div><p className="section-kicker">{t('demoTag')}</p><h3 id="print-document-title">{t(`documentTemplate_${printTemplate}`)}</h3></div>
              <button type="button" className="icon-quiet" onClick={() => setPrintTemplate(null)} aria-label={t('close')}><X size={19} /></button>
            </div>
            <p className="client-modal-note">{t('documentPrintNote')}</p>
            <form ref={printForm} onSubmit={printDocument}>
              <div className="booking-form-grid">
                <label>{t('printClient')}<input name="client" required /></label>
                <label>{t('printVehicle')}<input name="vehicle" /></label>
                <label>{t('documentReference')}<input name="reference" required /></label>
                {printTemplate !== 'contract' && printTemplate !== 'receipt' && printTemplate !== 'returnInspection' && (
                  <label>{t('expiryDate')}<input name="expiryDate" type="date" /></label>
                )}
                {printTemplate === 'contract' && <>
                  <label>{t('pickupDateTime')}<input name="startDate" type="datetime-local" required /></label>
                  <label>{t('returnDateTime')}<input name="endDate" type="datetime-local" required /></label>
                  <label>{t('dailyPrice')}<input name="dailyPrice" type="number" min="0" /></label>
                  <label>{t('depositAmount')}<input name="deposit" type="number" min="0" /></label>
                </>}
                {printTemplate === 'receipt' && <>
                  <label>{t('printAmount')}<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                  <label>{t('paymentMethod')}<select name="paymentMethod" defaultValue="cash"><option value="cash">{t('method_cash')}</option><option value="transfer">{t('method_transfer')}</option><option value="card">{t('method_card')}</option></select></label>
                  <label>{t('printPaidOn')}<input name="paidOn" type="date" /></label>
                </>}
                {printTemplate === 'returnInspection' && <>
                  <label>{t('printMileage')}<input name="mileage" type="number" min="0" required /></label>
                  <label>{t('printFuel')}<input name="fuel" type="number" min="0" max="100" required /></label>
                  <label>{t('printDamages')}<input name="damages" /></label>
                  <label>{t('returnDateTime')}<input name="returnDate" type="datetime-local" /></label>
                </>}
              </div>
              {printError && <p className="client-form-error" role="alert">{printError}</p>}
              <div className="client-modal-actions">
                <button type="button" className="client-cancel-button" onClick={() => setPrintTemplate(null)}>{t('cancel')}</button>
                <button type="button" className="client-cancel-button" onClick={saveTemplateRecord}>{t('saveDocumentDetails')}</button>
                <button type="submit" className="clients-primary-button"><FileText size={16} />{t('printSavePdf')}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {printPreview && (
        <div className="client-modal-backdrop document-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrintPreview(null) }}>
          <section className="document-preview-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
            <div className="client-modal-heading">
              <div><p className="section-kicker">{t('demoTag')}</p><h3 id="document-preview-title">{t('documentPreviewTitle')}</h3></div>
              <button type="button" className="icon-quiet" onClick={() => setPrintPreview(null)} aria-label={t('close')}><X size={19} /></button>
            </div>
            <iframe ref={previewFrame} className="document-preview-frame" title={t('documentPreviewTitle')} srcDoc={printPreview} />
            <div className="client-modal-actions">
              <button type="button" className="client-cancel-button" onClick={() => setPrintPreview(null)}>{t('close')}</button>
              <button type="button" className="clients-primary-button" onClick={() => previewFrame.current?.contentWindow?.print()}>
                <FileText size={16} />{t('printSavePdf')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function createDemoRecords(): DocumentRecord[] {
  return [
    { id: 1, type: 'identity', owner: 'Sarah El Amrani', reference: 'Demo client record', expiresOn: addDays(180) },
    { id: 2, type: 'license', owner: 'Youssef Benali', reference: 'Demo client record', expiresOn: addDays(8) },
    { id: 3, type: 'insurance', owner: 'BMW X3', reference: 'Demo vehicle record', expiresOn: addDays(12) },
    { id: 4, type: 'inspection', owner: 'Dacia Duster', reference: 'Demo vehicle record', expiresOn: addDays(-10) },
    { id: 5, type: 'contract', owner: 'Nadia Karim · Range Rover Evoque', reference: 'Demo rental record', expiresOn: '' },
    { id: 6, type: 'receipt', owner: 'Omar Haddad · Dacia Duster', reference: 'Demo rental record', expiresOn: '' },
  ]
}

function loadDocumentPreview(): DocumentRecord[] {
  try {
    const stored = localStorage.getItem('luxrent-preview-documents')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed as DocumentRecord[]
    }
  } catch {
    // Keep labeled demo records if browser storage is unavailable or invalid.
  }
  return createDemoRecords()
}

function buildDocumentPreview(template: DocumentTemplate, t: (key: string) => string, values: Record<string, string>) {
  const title = t(`documentTemplate_${template}`)
  const today = new Intl.DateTimeFormat(document.documentElement.lang || 'fr', { dateStyle: 'long' }).format(new Date())
  const detailRows = template === 'contract'
    ? `<div class="field"><strong>${escapeDocumentHtml(t('pickupDateTime'))}</strong><br>${escapeDocumentHtml(formatPrintDate(values.startDate, document.documentElement.lang))}</div><div class="field"><strong>${escapeDocumentHtml(t('returnDateTime'))}</strong><br>${escapeDocumentHtml(formatPrintDate(values.endDate, document.documentElement.lang))}</div><div class="field"><strong>${escapeDocumentHtml(t('dailyPrice'))}</strong><br>${escapeDocumentHtml(values.dailyPrice || '0')} MAD</div><div class="field"><strong>${escapeDocumentHtml(t('depositAmount'))}</strong><br>${escapeDocumentHtml(values.deposit || '0')} MAD</div>`
    : template === 'receipt'
      ? `<div class="field"><strong>${escapeDocumentHtml(t('printAmount'))}</strong><br>${escapeDocumentHtml(values.amount || '0')} MAD</div><div class="field"><strong>${escapeDocumentHtml(t('paymentMethod'))}</strong><br>${escapeDocumentHtml(t(`method_${values.paymentMethod || 'cash'}`))}</div><div class="field"><strong>${escapeDocumentHtml(t('printPaidOn'))}</strong><br>${escapeDocumentHtml(formatPrintDate(values.paidOn, document.documentElement.lang))}</div>`
      : template === 'returnInspection'
        ? `<div class="field"><strong>${escapeDocumentHtml(t('printMileage'))}</strong><br>${escapeDocumentHtml(values.mileage || '0')} km</div><div class="field"><strong>${escapeDocumentHtml(t('printFuel'))}</strong><br>${escapeDocumentHtml(values.fuel || '0')}%</div><div class="field"><strong>${escapeDocumentHtml(t('printDamages'))}</strong><br>${escapeDocumentHtml(values.damages || '—')}</div><div class="field"><strong>${escapeDocumentHtml(t('returnDateTime'))}</strong><br>${escapeDocumentHtml(formatPrintDate(values.returnDate, document.documentElement.lang))}</div>`
        : `<div class="field"><strong>${escapeDocumentHtml(t('documentType'))}</strong><br>${escapeDocumentHtml(t(`documentType_${template}`))}</div><div class="field"><strong>${escapeDocumentHtml(t('documentStatus'))}</strong><br>${escapeDocumentHtml(t('demoTag'))}</div>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeDocumentHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#25282b;margin:0;padding:36px}.letterhead{display:flex;justify-content:space-between;border-bottom:2px solid #c2a36a;padding-bottom:18px}.brand{font-family:Georgia,serif;font-size:26px}.tag{color:#786849;font-size:11px;letter-spacing:2px}.content{margin-top:28px}.demo{border:1px solid #eadfc9;background:#fbf7ef;color:#786849;padding:10px;margin:18px 0;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{border-bottom:1px solid #ddd;padding:10px 0}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:50px}.signature{border-top:1px solid #777;padding-top:8px}@media print{.demo{background:#fff}}</style></head><body><div class="letterhead"><div><div class="brand">LuxRent</div><div class="tag">RENTAL MANAGEMENT</div></div><div>${escapeDocumentHtml(today)}</div></div><div class="content"><h1>${escapeDocumentHtml(title)}</h1><div class="demo">DEMO PREVIEW — Not an operational or signed document.</div><div class="grid"><div class="field"><strong>${escapeDocumentHtml(t('printClient'))}</strong><br>${escapeDocumentHtml(values.client)}</div><div class="field"><strong>${escapeDocumentHtml(t('printVehicle'))}</strong><br>${escapeDocumentHtml(values.vehicle)}</div><div class="field"><strong>${escapeDocumentHtml(t('documentReference'))}</strong><br>${escapeDocumentHtml(values.reference)}</div>${detailRows}</div><div class="signatures"><div class="signature">${escapeDocumentHtml(t('agency'))}</div><div class="signature">${escapeDocumentHtml(t('printClient'))}</div></div></div></body></html>`
}

function escapeDocumentHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatPrintDate(value: string | undefined, language: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(date)
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getExpiryStatus(expiresOn: string): 'expired' | 'soon' | 'current' | null {
  if (!expiresOn) return null
  const expiry = new Date(`${expiresOn}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= 30) return 'soon'
  return 'current'
}
