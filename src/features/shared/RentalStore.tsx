import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { createDemoRentals } from '../rentals/demoRentals'
import type { PaymentTransaction, Rental } from '../rentals/rentalTypes'
import { RentalStoreContext } from './RentalStoreContext'

export function RentalStoreProvider({ children }: PropsWithChildren) {
  const [rentals, setRentals] = useState<Rental[]>(loadPreviewRentals)
  const [history, setHistory] = useState<Rental[]>(loadPreviewHistory)
  const nextTransactionId = useRef(1000)
  useEffect(() => {
    localStorage.setItem('luxrent-preview-rentals', JSON.stringify(rentals))
  }, [rentals])
  useEffect(() => {
    localStorage.setItem('luxrent-preview-rental-history', JSON.stringify(history))
  }, [history])

  const updateRental = (id: number, update: (rental: Rental) => Rental) => {
    setRentals((current) => current.map((rental) => rental.id === id ? update(rental) : rental))
    setHistory((current) => current.map((rental) => rental.id === id ? update(rental) : rental))
  }

  const addRental = (rental: Rental) => {
    setRentals((current) => [rental, ...current.filter((item) => item.id !== rental.id)])
  }

  function loadPreviewRentals(): Rental[] {
    try {
      const stored = localStorage.getItem('luxrent-preview-rentals')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed as Rental[]
      }
    } catch {
      // Keep labeled demo rentals if browser storage is unavailable or invalid.
    }
    return createDemoRentals()
  }

  function loadPreviewHistory(): Rental[] {
    try {
      const stored = localStorage.getItem('luxrent-preview-rental-history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed as Rental[]
      }
    } catch {
      // Keep history empty if browser storage is unavailable or invalid.
    }
    return []
  }

  const completeRental = (id: number, completed: Rental) => {
    setRentals((current) => current.filter((rental) => rental.id !== id))
    setHistory((current) => [completed, ...current.filter((rental) => rental.id !== id)])
  }

  const addTransaction = (id: number, transaction: Omit<PaymentTransaction, 'id'>) => {
    const transactionWithId = { ...transaction, id: nextTransactionId.current++ }
    updateRental(id, (rental) => ({ ...rental, payments: [...rental.payments, transactionWithId] }))
  }

  return (
    <RentalStoreContext.Provider value={{ rentals, history, addRental, updateRental, completeRental, addTransaction }}>
      {children}
    </RentalStoreContext.Provider>
  )
}
