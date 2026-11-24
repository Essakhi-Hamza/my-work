export type PaymentMethod = 'cash' | 'transfer' | 'card'
export type PaymentKind = 'rental' | 'deposit' | 'rentalRefund' | 'depositRefund'
export type PaymentTransaction = {
  id: number
  amount: number
  method: PaymentMethod
  kind: PaymentKind
  date: string
}

export type RentalStatus = 'normal' | 'dueSoon' | 'urgent' | 'overdue' | 'completed'
export type Rental = {
  id: number
  client: string
  phone: string
  vehicle: string
  vehicleId: number
  plate: string
  startAt: string
  returnAt: string
  dailyPrice: number
  rentalTotal: number
  deposit: number
  payments: PaymentTransaction[]
  destination: string
  destinationStatus: 'inside' | 'outside'
  mileage: number
  fuel: number
  additionalCharges: number
  extensionCharges: number
  status: RentalStatus
  damages?: string
  returnPhotos?: string[]
  returnedAt?: string
}
