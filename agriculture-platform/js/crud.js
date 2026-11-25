import { all, saveAll, uid, logActivity } from '../utils/storage.js';

const PREFIX = { farmers: 'FRM', crops: 'CRP', equipment: 'EQP', products: 'PRD', expenses: 'EXP' };

export function saveRecord(collection, payload, id = '') {
  const rows = all(collection);
  const record = { ...payload, id: id || uid(PREFIX[collection] || 'REC') };
  const index = rows.findIndex((row) => row.id === record.id);
  if (index >= 0) rows[index] = { ...rows[index], ...record };
  else rows.unshift(record);
  if (!saveAll(collection, rows)) throw new Error('Could not save this record. Check browser storage.');
  logActivity(`${index >= 0 ? 'Updated' : 'Added'} ${collection.slice(0, -1)}: ${record.name || record.description || record.id}`, collection);
  return record;
}

export function deleteRecord(collection, id) {
  const rows = all(collection);
  const target = rows.find((row) => row.id === id);
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) return false;
  if (!saveAll(collection, next)) throw new Error('Could not delete this record.');
  logActivity(`Deleted ${collection.slice(0, -1)}: ${target?.name || id}`, collection);
  return true;
}
