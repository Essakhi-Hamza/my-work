import type { Rental } from './rentalTypes'

export function createDemoRentals(): Rental[] {
  const start = (hours: number) => relativeDateTime(hours)
  const time = Date.now()
  return [
    { id: 501, client: 'Sarah El Amrani', phone: '+212 6 12 34 56 78', vehicle: 'Mercedes-Benz C-Class', vehicleId: 1, plate: '12345-A-6', startAt: start(-48), returnAt: start(48), dailyPrice: 850, rentalTotal: 3400, deposit: 2000, payments: [{ id: 1, amount: 1700, method: 'cash', kind: 'rental', date: new Date(time - 24 * 3600000).toISOString() }], destination: 'Casablanca city centre', destinationStatus: 'inside', mileage: 18400, fuel: 80, additionalCharges: 0, extensionCharges: 0, status: 'normal' },
    { id: 502, client: 'Youssef Benali', phone: '+212 6 23 45 67 89', vehicle: 'Volkswagen Tiguan', vehicleId: 2, plate: '67890-B-6', startAt: start(-72), returnAt: start(20), dailyPrice: 620, rentalTotal: 2480, deposit: 1200, payments: [{ id: 2, amount: 1240, method: 'card', kind: 'rental', date: new Date(time - 48 * 3600000).toISOString() }], destination: 'Rabat', destinationStatus: 'inside', mileage: 32600, fuel: 55, additionalCharges: 0, extensionCharges: 0, status: 'dueSoon' },
    { id: 503, client: 'Nadia Karim', phone: '+212 6 34 56 78 90', vehicle: 'Range Rover Evoque', vehicleId: 3, plate: '24680-C-6', startAt: start(-96), returnAt: start(5), dailyPrice: 1100, rentalTotal: 5500, deposit: 3000, payments: [{ id: 3, amount: 1100, method: 'transfer', kind: 'rental', date: new Date(time - 72 * 3600000).toISOString() }], destination: 'Agadir — outside permitted area', destinationStatus: 'outside', mileage: 12100, fuel: 42, additionalCharges: 0, extensionCharges: 0, status: 'urgent' },
    { id: 504, client: 'Omar Haddad', phone: '+212 6 45 67 89 01', vehicle: 'Dacia Duster', vehicleId: 4, plate: '13579-D-6', startAt: start(-120), returnAt: start(-1), dailyPrice: 420, rentalTotal: 2100, deposit: 1000, payments: [{ id: 4, amount: 840, method: 'cash', kind: 'rental', date: new Date(time - 96 * 3600000).toISOString() }], destination: 'Tangier', destinationStatus: 'inside', mileage: 54200, fuel: 60, additionalCharges: 0, extensionCharges: 0, status: 'overdue' },
  ]
}

export function relativeDateTime(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}
