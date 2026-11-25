import { all } from '../utils/storage.js';
import { saveRecord, deleteRecord } from './crud.js';

export function expensesFor(user) {
  const profile = all('farmers').find((farmer) => farmer.userId === user.id || farmer.id === user.farmerId);
  const ownerId = profile?.id || user.farmerId || user.id;
  return all('expenses').filter((expense) => expense.farmerId === ownerId);
}

export function saveExpense(user, payload, id = '') {
  const profile = all('farmers').find((farmer) => farmer.userId === user.id || farmer.id === user.farmerId);
  return saveRecord('expenses', { ...payload, farmerId: profile?.id || user.farmerId || user.id }, id);
}
export function removeExpense(id) { return deleteRecord('expenses', id); }
export function expenseTotals(expenses) { return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0); }
