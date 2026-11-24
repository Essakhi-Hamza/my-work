import type { Rental } from './rentalTypes'

export function getRentalPaid(rental: Rental) {
  return rental.payments.reduce((total, transaction) => {
    if (transaction.kind === 'rental') return total + transaction.amount
    if (transaction.kind === 'rentalRefund') return total - transaction.amount
    return total
  }, 0)
}

export function getDepositReceived(rental: Rental) {
  return rental.payments.reduce((total, transaction) =>
    transaction.kind === 'deposit' ? total + transaction.amount : total, 0)
}

export function getDepositHeld(rental: Rental) {
  return rental.payments.reduce((total, transaction) => {
    if (transaction.kind === 'deposit') return total + transaction.amount
    if (transaction.kind === 'depositRefund') return total - transaction.amount
    return total
  }, 0)
}

export function getRentalOutstanding(rental: Rental) {
  const totalDue = rental.rentalTotal + rental.additionalCharges + rental.extensionCharges
  return Math.max(0, totalDue - getRentalPaid(rental))
}

export function getDepositRemaining(rental: Rental) {
  return Math.max(0, rental.deposit - getDepositReceived(rental))
}
