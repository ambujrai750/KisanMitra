export const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
export const phoneIsValid = (phone) => /^[+\d][\d\s-]{8,15}$/.test(String(phone || '').trim());
export const required = (value) => String(value ?? '').trim().length > 0;
export const numberIsValid = (value, minimum = 0) => Number.isFinite(Number(value)) && Number(value) >= minimum;
