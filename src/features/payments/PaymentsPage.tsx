import { useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, FileText, Plus, Search, ShieldAlert, X } from 'lucide-react'
import { getDepositHeld, getDepositRemaining, getRentalOutstanding, getRentalPaid } from '../rentals/rentalFinance'
import type { PaymentKind, PaymentTransaction, Rental } from '../rentals/rentalTypes'
import { useRentalStore } from '../shared/RentalStoreContext'

const paymentKinds: PaymentKind[] = ['rental', 'deposit', 'rentalRefund', 'depositRefund']

type Props = { t: (key: string) => string; language: string }

export default function PaymentsPage({ t, language }: Props) {
  const { rentals, history, addTransaction } = useRentalStore()
  const allRentals = [...rentals, ...history]
  const historicalIds = new Set(history.map((rental) => rental.id))
  const locale = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | PaymentKind>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const [rentalId, setRentalId] = useState(String(rentals[0]?.id ?? ''))
  const [kind, setKind] = useState<PaymentKind>('rental')

  const transactions = allRentals.flatMap((rental) =>
    rental.payments.map((transaction) => ({ ...transaction, rental })),
  ).sort((first, second) => second.date.localeCompare(first.date))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredTransactions = transactions.filter(({ rental, ...transaction }) =>
    (kindFilter === 'all' || transaction.kind === kindFilter) &&
    (!normalizedQuery || [rental.client, rental.vehicle, rental.plate, transaction.method, t(`paymentKind_${transaction.kind}`)]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
  )

  const selectedRental = allRentals.find((rental) => rental.id === Number(rentalId))
  const allowedAmount = selectedRental ? getAllowedAmount(selectedRental, kind) : 0
  const rentalPayments = allRentals.reduce((total, rental) => total + getRentalPaid(rental), 0)
  const depositsHeld = allRentals.reduce((total, rental) => total + getDepositHeld(rental), 0)
  const refundsIssued = transactions.reduce((total, transaction) =>
    transaction.kind.endsWith('Refund') ? total + transaction.amount : total, 0)
  const totalOutstanding = allRentals.reduce((total, rental) => total + getRentalOutstanding(rental), 0)

  const saveTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const selectedId = Number(data.get('rentalId'))
    const selectedKind = String(data.get('kind')) as PaymentKind
    const amount = Number(data.get('amount'))
    const method = String(data.get('method')) as PaymentTransaction['method']
    const rental = allRentals.find((item) => item.id === selectedId)
    if (!rental || !paymentKinds.includes(selectedKind) || !['cash', 'transfer', 'card'].includes(method)) {
      setError(t('transactionRentalRequired'))
      return
    }
    if (historicalIds.has(selectedId) && (selectedKind === 'rental' || selectedKind === 'deposit')) {
      setError(t('completedRentalTransactionError'))
      return
    }
    const available = getAllowedAmount(rental, selectedKind)
    if (!Number.isFinite(amount) || amount <= 0 || amount > available) {
      setError(t('transactionAmountError').replace('{available}', formatMoney(available)))
      return
    }

    addTransaction(selectedId, {
      amount,
      method,
      kind: selectedKind,
      date: new Date().toISOString(),
    })
    setIsAdding(false)
    setError('')
  }

  const formatMoney = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

  return (
    <div className="payments-page">
      <div className="payments-heading">
        <div><p className="section-kicker">LUXRENT</p><h2>{t('paymentsTitle')}</h2><p>{t('paymentsSubtitle')}</p></div>
        <button type="button" className="clients-primary-button" onClick={() => { setError(''); setIsAdding(true) }}><Plus size={18} />{t('newTransaction')}</button>
      </div>

      <div className="clients-demo-notice">
        <ShieldAlert size={18} /><div><strong>{t('demoTag')}</strong><span>{t('paymentsDemoNotice')}</span></div>
      </div>

      <div className="payment-summary-grid">
        <article className="payment-summary-card"><span className="payment-summary-icon payment-summary-income"><ArrowDownLeft size={18} /></span><div><span>{t('paymentsReceived')}</span><strong>{formatMoney(rentalPayments)} MAD</strong></div></article>
        <article className="payment-summary-card"><span className="payment-summary-icon payment-summary-deposit"><CircleDollarSign size={18} /></span><div><span>{t('depositsHeld')}</span><strong>{formatMoney(depositsHeld)} MAD</strong></div></article>
        <article className="payment-summary-card"><span className="payment-summary-icon payment-summary-refund"><ArrowUpRight size={18} /></span><div><span>{t('refundsIssued')}</span><strong>{formatMoney(refundsIssued)} MAD</strong></div></article>
        <article className="payment-summary-card"><span className="payment-summary-icon payment-summary-due"><CircleDollarSign size={18} /></span><div><span>{t('totalOutstanding')}</span><strong>{formatMoney(totalOutstanding)} MAD</strong></div></article>
      </div>

      <section className="panel payments-directory">
        <div className="payment-toolbar">
          <label className="client-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPayments')} aria-label={t('searchPayments')} /></label>
          <label className="payment-type-filter"><span>{t('transactionType')}</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as 'all' | PaymentKind)}><option value="all">{t('allTransactions')}</option>{paymentKinds.map((value) => <option value={value} key={value}>{t(`paymentKind_${value}`)}</option>)}</select></label>
          <span className="payment-result-count">{filteredTransactions.length} {t('transactionsShown')}</span>
        </div>

        {filteredTransactions.length ? (
          <div className="payment-transaction-list">
            {filteredTransactions.map(({ rental, ...transaction }) => {
              const isRefund = transaction.kind.endsWith('Refund')
              return (
                <article className="payment-transaction" key={`${rental.id}-${transaction.id}`}>
                  <span className={`payment-transaction-icon ${isRefund ? 'payment-summary-refund' : 'payment-summary-income'}`}>{isRefund ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}</span>
                  <div className="payment-transaction-main"><strong>{t(`paymentKind_${transaction.kind}`)}</strong><span>{rental.client} · {rental.vehicle}</span></div>
                  <div className="payment-transaction-date"><span>{formatDate(transaction.date)}</span><small>{t(`method_${transaction.method}`)}</small></div>
                  <strong className={`payment-transaction-amount ${isRefund ? 'payment-amount-refund' : ''}`}>{isRefund ? '− ' : '+ '}{formatMoney(transaction.amount)} MAD</strong>
                </article>
              )
            })}
          </div>
        ) : <div className="document-empty-state"><Search size={22} /><p>{t('noTransactionsFound')}</p></div>}
      </section>

      <div className="payment-receipt-note"><FileText size={17} /><span>{t('receiptUnavailable')}</span></div>

      {isAdding && (
        <div className="client-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAdding(false) }}>
          <section className="client-modal rental-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
            <div className="client-modal-heading"><div><p className="section-kicker">{t('demoTag')}</p><h3 id="transaction-modal-title">{t('newTransactionTitle')}</h3></div><button type="button" className="icon-quiet" onClick={() => setIsAdding(false)} aria-label={t('close')}><X size={19} /></button></div>
            <form className="rental-modal-form" onSubmit={saveTransaction}>
              <p className="client-modal-note">{t('transactionDemoNote')}</p>
              <label>{t('transactionRental')}<select name="rentalId" value={rentalId} onChange={(event) => { const nextId = event.target.value; setRentalId(nextId); if (historicalIds.has(Number(nextId)) && (kind === 'rental' || kind === 'deposit')) setKind('rentalRefund') }} required>{allRentals.map((rental) => <option value={rental.id} key={rental.id}>{rental.client} · {rental.vehicle}{historicalIds.has(rental.id) ? ` · ${t('rentalStatus_completed')}` : ''}</option>)}</select></label>
              <label>{t('transactionType')}<select name="kind" value={kind} onChange={(event) => setKind(event.target.value as PaymentKind)}>{paymentKinds.map((value) => <option value={value} key={value} disabled={historicalIds.has(Number(rentalId)) && (value === 'rental' || value === 'deposit')}>{t(`paymentKind_${value}`)}</option>)}</select></label>
              <div className="extension-cost"><span>{t('availableAmount')}</span><strong>{formatMoney(allowedAmount)} MAD</strong></div>
              {allowedAmount <= 0 && <p className="client-form-error">{t('noAmountAvailable')}</p>}
              <label>{t('transactionAmount')} (MAD)<input name="amount" type="number" min="0.01" max={allowedAmount} step="0.01" required /></label>
              <label>{t('paymentMethod')}<select name="method" defaultValue="cash"><option value="cash">{t('method_cash')}</option><option value="transfer">{t('method_transfer')}</option><option value="card">{t('method_card')}</option></select></label>
              {error && <p className="client-form-error" role="alert">{error}</p>}
              <div className="client-modal-actions"><button type="button" className="client-cancel-button" onClick={() => setIsAdding(false)}>{t('cancel')}</button><button type="submit" className="clients-primary-button" disabled={allowedAmount <= 0}>{t('addTransaction')}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function getAllowedAmount(rental: Rental, kind: PaymentKind) {
  if (kind === 'rental') return getRentalOutstanding(rental)
  if (kind === 'deposit') return getDepositRemaining(rental)
  if (kind === 'rentalRefund') return Math.max(0, getRentalPaid(rental))
  return Math.max(0, getDepositHeld(rental))
}

