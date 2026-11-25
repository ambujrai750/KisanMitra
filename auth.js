import { KEYS } from '../config/storage-keys.js';
import { all, read, write, uid, logActivity } from '../utils/storage.js';
import { emailIsValid } from '../utils/validation.js';

const encoder = new TextEncoder();

export async function hashPassword(password, saltText = null) {
  if (!window.crypto?.subtle) throw new Error('Secure browser cryptography is unavailable. Open Kisan Mitra through http://localhost:8000 instead of opening the HTML file directly.');
  const salt = saltText || [...crypto.getRandomValues(new Uint8Array(16))].map((n) => n.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  const hash = [...new Uint8Array(bits)].map((n) => n.toString(16).padStart(2, '0')).join('');
  return { salt, hash };
}

export async function verifyPassword(password, salt, expectedHash) {
  const result = await hashPassword(password, salt);
  return result.hash === expectedHash;
}

export async function registerFarmer({ name, email, phone, password, village = '', district = '', state = '', address = '' }) {
  if (!name || !emailIsValid(email) || !phone || String(password).length < 8) throw new Error('Enter a valid name, email, phone number and a password of at least 8 characters.');
  const users = all('users');
  if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('An account with this email already exists.');
  const credentials = await hashPassword(password);
  const userId = uid('USR');
  const farmerId = uid('FRM');
  const user = { id: userId, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role: 'farmer', salt: credentials.salt, passwordHash: credentials.hash, createdAt: new Date().toISOString(), farmerId };
  const farmer = { id: farmerId, userId, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), address: address.trim(), village: village.trim(), district: district.trim(), state: state.trim(), image: '', registeredAt: new Date().toISOString(), status: 'Active' };
  if (!write(KEYS.users, [...users, user])) throw new Error('Could not save the new account. Check browser storage.');
  const farmers = all('farmers');
  if (!write(KEYS.farmers, [...farmers, farmer])) {
    write(KEYS.users, users);
    throw new Error('Could not save the farmer profile. Check browser storage.');
  }
  write(KEYS.session, { userId, role: 'farmer', issuedAt: new Date().toISOString() });
  logActivity(`${user.name} registered as a farmer`, 'user');
  return user;
}

export async function login(email, password) {
  const user = all('users').find((item) => item.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || !user.salt || !user.passwordHash) throw new Error('Email or password is incorrect.');
  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) throw new Error('Email or password is incorrect.');
  write(KEYS.session, { userId: user.id, role: user.role, issuedAt: new Date().toISOString() });
  logActivity(`${user.name} signed in`, 'login');
  return user;
}

export function logout() {
  const session = read(KEYS.session, null);
  const user = session ? all('users').find((item) => item.id === session.userId) : null;
  localStorage.removeItem(KEYS.session);
  if (user) logActivity(`${user.name} signed out`, 'logout');
  window.location.href = 'login.html';
}
