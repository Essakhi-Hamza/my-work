import { createContext, useContext } from 'react'
import type { PaymentTransaction, Rental } from '../rentals/rentalTypes'

export type RentalStore = {
  rentals: Rental[]
  history: Rental[]
  addRental: (rental: Rental) => void
  updateRental: (id: number, update: (rental: Rental) => Rental) => void
  completeRental: (id: number, completed: Rental) => void
  addTransaction: (id: number, transaction: Omit<PaymentTransaction, 'id'>) => void
}

export const RentalStoreContext = createContext<RentalStore | null>(null)

export function useRentalStore() {
  const store = useContext(RentalStoreContext)
  if (!store) throw new Error('useRentalStore must be used within RentalStoreProvider')
  return store
}
