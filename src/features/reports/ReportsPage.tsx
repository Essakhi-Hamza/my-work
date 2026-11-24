import { useEffect, useState } from 'react'
import { ChartNoAxesCombined, Clock3, Download, FileSpreadsheet, ShieldAlert, TriangleAlert } from 'lucide-react'
import { getDepositHeld, getRentalOutstanding, getRentalPaid } from '../rentals/rentalFinance'
import type { Rental } from '../rentals/rentalTypes'
import { useRentalStore } from '../shared/RentalStoreContext'

type Props = { t: (key: string) => string; language: string }

export default function ReportsPage({ t, language }: Props) {
  const { rentals, history } = useRentalStore()
  const allRentals = [...rentals, ...history]
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [now, setNow] = useState(() => Date.now())
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const cutoff = now - period * 86_400_000
  const reportRentals = allRentals.filter((rental) => new Date(rental.startAt).getTime() >= cutoff)
  const reportTransactions = reportRentals.flatMap((rental) => rental.payments)
    .filter((transaction) => new Date(transaction.date).getTime() >= cutoff)
  const revenue = reportTransactions.reduce((total, transaction) => {
    if (transaction.kind === 'rental') return total + transaction.amount
    if (transaction.kind === 'rentalRefund') return total - transaction.amount
    return total
  }, 0)
  const deposits = allRentals.reduce((total, rental) => total + getDepositHeld(rental), 0)
  const refunds = reportTransactions.reduce((total, transaction) =>
    transaction.kind.endsWith('Refund') ? total + transaction.amount : total, 0)
  const outstanding = allRentals.reduce((total, rental) => total + getRentalOutstanding(rental), 0)
  const dueWithinDay = rentals.filter((rental) => {
    const remaining = new Date(rental.returnAt).getTime() - now
    return remaining >= 0 && remaining <= 24 * 3_600_000
  }).length
  const overdue = rentals.filter((rental) => new Date(rental.returnAt).getTime() < now).length
  const reportRows = [...reportRentals].sort((first, second) => second.startAt.localeCompare(first.startAt))

  const formatMoney = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  const exportExcel = () => downloadExcelReport(reportRows, formatMoney, formatDate)
  const exportPdf = () => printPdfReport(reportRows, formatMoney, formatDate)

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t('reportsTitle')}</h2><p>{t('reportsSubtitle')}</p></div>
        <label className="report-period-filter"><span>{t('reportPeriod')}</span><select value={period} onChange={(event) => setPeriod(Number(event.target.value) as 7 | 30 | 90)}><option value={7}>{t('reportLast7Days')}</option><option value={30}>{t('reportLast30Days')}</option><option value={90}>{t('reportLast90Days')}</option></select></label>
      </div>

      <div className="clients-demo-notice"><ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('reportsDemoNotice')}</span></div></div>

      <div className="report-summary-grid">
        <article className="report-summary-card"><span className="report-summary-icon report-revenue-icon"><ChartNoAxesCombined size={19} /></span><div><span>{t('reportRentalRevenue')}</span><strong>{formatMoney(revenue)} MAD</strong></div></article>
        <article className="report-summary-card"><span className="report-summary-icon report-deposit-icon"><FileSpreadsheet size={19} /></span><div><span>{t('depositsHeld')}</span><strong>{formatMoney(deposits)} MAD</strong></div></article>
        <article className="report-summary-card"><span className="report-summary-icon report-refund-icon"><Download size={19} /></span><div><span>{t('refundsIssued')}</span><strong>{formatMoney(refunds)} MAD</strong></div></article>
        <article className="report-summary-card"><span className="report-summary-icon report-outstanding-icon"><TriangleAlert size={19} /></span><div><span>{t('totalOutstanding')}</span><strong>{formatMoney(outstanding)} MAD</strong></div></article>
      </div>

      <section className="report-operations-grid">
        <article className="panel report-operation-card"><span className="report-operation-icon"><Clock3 size={19} /></span><div><span>{t('reportActiveRentals')}</span><strong>{rentals.length}</strong><small>{t('reportActiveRentalsHint')}</small></div></article>
        <article className="panel report-operation-card"><span className="report-operation-icon report-alert-icon"><TriangleAlert size={19} /></span><div><span>{t('reportReturnsDue')}</span><strong>{dueWithinDay}</strong><small>{t('reportReturnsDueHint')}</small></div></article>
        <article className="panel report-operation-card"><span className="report-operation-icon report-overdue-icon"><Clock3 size={19} /></span><div><span>{t('reportOverdue')}</span><strong>{overdue}</strong><small>{t('reportOverdueHint')}</small></div></article>
        <article className="panel report-operation-card"><span className="report-operation-icon report-completed-icon"><ChartNoAxesCombined size={19} /></span><div><span>{t('reportCompletedRentals')}</span><strong>{history.length}</strong><small>{t('reportCompletedHint')}</small></div></article>
      </section>

      <section className="panel reports-directory">
        <div className="panel-heading">
          <div><h3>{t('reportRentalActivity')}</h3><p>{reportRows.length} {t('reportRowsShown')}</p></div>
          <div className="report-export-actions">
            <button type="button" onClick={exportPdf}><Download size={15} />PDF</button>
            <button type="button" onClick={exportExcel}><FileSpreadsheet size={15} />Excel</button>
          </div>
        </div>
        {reportRows.length ? (
          <div className="report-table-scroll">
            <table className="report-table">
              <thead><tr><th>{t('reportRental')}</th><th>{t('reportStartDate')}</th><th>{t('rentalPrice')}</th><th>{t('receivedPayments')}</th><th>{t('outstandingBalance')}</th></tr></thead>
                <tbody>{reportRows.map((rental) => <ReportRow key={rental.id} rental={rental} formatMoney={formatMoney} formatDate={formatDate} />)}</tbody>
            </table>
          </div>
        ) : <div className="document-empty-state"><ChartNoAxesCombined size={22} /><p>{t('noReportData')}</p></div>}
      </section>
    </div>
  )
}

function ReportRow({ rental, formatMoney, formatDate }: {
  rental: Rental
  formatMoney: (value: number) => string
  formatDate: (value: string) => string
}) {
  const total = rental.rentalTotal + rental.additionalCharges + rental.extensionCharges
  return (
    <tr>
      <td><strong>{rental.client}</strong><span>{rental.vehicle} · {rental.plate}</span></td>
      <td>{formatDate(rental.startAt)}</td>
      <td>{formatMoney(total)} MAD</td>
      <td>{formatMoney(getRentalPaid(rental))} MAD</td>
      <td>{formatMoney(getRentalOutstanding(rental))} MAD</td>
    </tr>
  )
}

function reportTableHtml(
  rentals: Rental[],
  formatMoney: (value: number) => string,
  formatDate: (value: string) => string,
) {
  const rows = rentals.map((rental) => {
    const total = rental.rentalTotal + rental.additionalCharges + rental.extensionCharges
    return `<tr><td>${escapeHtml(rental.client)}</td><td>${escapeHtml(`${rental.vehicle} · ${rental.plate}`)}</td><td>${escapeHtml(formatDate(rental.startAt))}</td><td>${escapeHtml(formatMoney(total))} MAD</td><td>${escapeHtml(formatMoney(getRentalPaid(rental)))} MAD</td><td>${escapeHtml(formatMoney(getRentalOutstanding(rental)))} MAD</td></tr>`
  }).join('')
  return `<table border="1" cellspacing="0" cellpadding="8"><thead><tr><th>Client</th><th>Vehicle</th><th>Start date</th><th>Total</th><th>Received</th><th>Outstanding</th></tr></thead><tbody>${rows}</tbody></table>`
}

function downloadExcelReport(
  rentals: Rental[],
  formatMoney: (value: number) => string,
  formatDate: (value: string) => string,
) {
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h2>LuxRent preview report</h2>${reportTableHtml(rentals, formatMoney, formatDate)}</body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `luxrent-preview-report-${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function printPdfReport(
  rentals: Rental[],
  formatMoney: (value: number) => string,
  formatDate: (value: string) => string,
) {
  const printWindow = window.open('', '_blank', 'width=1000,height=700')
  if (!printWindow) return
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>LuxRent report</title><style>body{font-family:Arial,sans-serif;color:#25282b;padding:32px}table{width:100%;border-collapse:collapse}th{background:#25282b;color:white}th,td{text-align:left;border:1px solid #ddd;padding:8px}h1{font-family:Georgia,serif}@media print{button{display:none}}</style></head><body><h1>LuxRent preview report</h1><p>Browser-generated preview report · ${escapeHtml(new Date().toLocaleDateString())}</p>${reportTableHtml(rentals, formatMoney, formatDate)}<script>window.onload=function(){window.print();}</script></body></html>`)
  printWindow.document.close()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
