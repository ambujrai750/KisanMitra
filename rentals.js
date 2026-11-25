import { all, saveAll, uid, logActivity } from '../utils/storage.js';
import { daysBetween, isDateOverlap, today } from '../utils/helpers.js';

export function farmerProfileFor(user) {
  return all('farmers').find((farmer) => farmer.userId === user.id || farmer.id === user.farmerId) || null;
}

export function requestRental(user, equipmentId, startDate, endDate, hoursPerDay = 8) {
  if (!startDate || !endDate || endDate < startDate || startDate < today()) throw new Error('Choose a valid rental period. The start date cannot be in the past.');
  const equipment = all('equipment').find((item) => item.id === equipmentId);
  if (!equipment || equipment.status === 'Maintenance') throw new Error('This equipment is currently in maintenance.');
  const days = daysBetween(startDate, endDate);
  if (days < 1 || days > 365) throw new Error('Rental duration must be between 1 and 365 days.');
  const rentals = all('rentals');
  const conflict = rentals.some((rental) => rental.equipmentId === equipmentId && ['Approved', 'Active'].includes(rental.status) && isDateOverlap(startDate, endDate, rental.startDate, rental.endDate));
  if (conflict) throw new Error('These dates overlap with an approved rental. Choose another period.');
  const profile = farmerProfileFor(user);
  const hourly = equipment.unit === 'hour';
  const hours = Number(hoursPerDay);
  if (hourly && (!Number.isInteger(hours) || hours < 1 || hours > 24)) throw new Error('For hourly equipment, choose between 1 and 24 hours per day.');
  const durationUnits = hourly ? days * hours : days;
  const rental = {
    id: uid('RNT'), equipmentId, equipmentName: equipment.name, unit: equipment.unit,
    farmerId: profile?.id || user.farmerId || user.id, farmerName: user.name,
    startDate, endDate, days, hoursPerDay: hourly ? hours : null, durationUnits, amount: durationUnits * Number(equipment.price),
    status: 'Pending', createdAt: new Date().toISOString()
  };
  rentals.unshift(rental);
  if (!saveAll('rentals', rentals)) throw new Error('Could not save the rental request.');
  logActivity(`${user.name} requested ${equipment.name} for ${days} day(s)`, 'rental');
  return rental;
}

export function updateRentalStatus(rentalId, nextStatus) {
  const rentals = all('rentals');
  const rental = rentals.find((item) => item.id === rentalId);
  if (!rental) throw new Error('Rental request not found.');
  const allowed = ['Approved', 'Rejected', 'Active', 'Returned', 'Cancelled'];
  if (!allowed.includes(nextStatus)) throw new Error('Unsupported rental status.');
  if (['Approved', 'Active'].includes(nextStatus)) {
    const conflict = rentals.some((other) => other.id !== rentalId && other.equipmentId === rental.equipmentId && ['Approved', 'Active'].includes(other.status) && isDateOverlap(rental.startDate, rental.endDate, other.startDate, other.endDate));
    if (conflict) throw new Error('Cannot approve: another approved rental overlaps these dates.');
    const equipment = all('equipment').find((item) => item.id === rental.equipmentId);
    if (!equipment || equipment.status === 'Maintenance') throw new Error('This equipment is in maintenance.');
  }
  rental.status = nextStatus;
  const equipmentRows = all('equipment');
  const equipment = equipmentRows.find(item => item.id === rental.equipmentId);
  if (equipment) {
    if (nextStatus === 'Active') equipment.status = 'Rented';
    else if (nextStatus === 'Approved') equipment.status = 'Booked';
    else if (['Returned','Rejected','Cancelled'].includes(nextStatus)) {
      const remaining = rentals.filter(item => item.id !== rentalId && item.equipmentId === rental.equipmentId && ['Approved','Active'].includes(item.status));
      equipment.status = remaining.some(item => item.status === 'Active') ? 'Rented' : remaining.length ? 'Booked' : 'Available';
    }
  }
  if (!saveAll('rentals', rentals)) throw new Error('Could not update rental status.');
  if (equipment && !saveAll('equipment', equipmentRows)) throw new Error('Rental status changed, but equipment availability could not be saved.');
  logActivity(`${rental.equipmentName} rental marked ${nextStatus.toLowerCase()}`, 'rental');
  return rental;
}
