import { KEYS } from './config/storage-keys.js';
import { read, write, all, currentUser, logActivity } from './utils/storage.js';
import { requireUser } from './utils/auth-guard.js';
import { applyTheme, toggleTheme } from './theme.js';
import { seedDemoData } from './modules/seed.js';
import { login, registerFarmer, logout } from './modules/auth.js';
import { renderShell, renderContent, renderAuthPage, renderFormDialog } from './modules/render.js';
import { saveRecord, deleteRecord } from './modules/crud.js';
import { requestRental, updateRentalStatus } from './modules/rentals.js';
import { addToCart, setCartQuantity, removeFromCart, checkout, updateOrderStatus } from './modules/cart.js';
import { saveExpense, removeExpense } from './modules/expenses.js';
import { attachImagePreview } from './utils/image-preview.js';
import { escapeHTML } from './utils/helpers.js';

const page = document.body.dataset.page || 'dashboard';

function toast(message, type = 'success') {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div'); region.id = 'toast-region'; region.className = 'toast-region'; document.body.append(region);
  }
  const node = document.createElement('div');
  node.className = `p2-toast ${type === 'error' ? 'is-error' : ''}`;
  node.textContent = message;
  region.append(node);
  window.setTimeout(() => node.remove(), 4200);
}

function showAuthError(message) {
  const box = document.getElementById('auth-message');
  if (box) { box.hidden = false; box.textContent = message; box.classList.add('is-error'); }
  else toast(message, 'error');
}

function closeDialog() {
  const dialog = document.getElementById('record-dialog');
  if (dialog?.open) dialog.close();
  dialog?.remove();
}

function openDialog(entity, id = '') {
  closeDialog();
  const collection = entity === 'profile' ? 'farmers' : entity;
  const record = id ? all(collection).find((item) => item.id === id) : null;
  const html = renderFormDialog(entity, record);
  if (!html) return;
  document.getElementById('app').insertAdjacentHTML('beforeend', html);
  const dialog = document.getElementById('record-dialog');
  const form = dialog?.querySelector('form');
  if (form) attachImagePreview(form);
  dialog?.showModal();
}

function refresh() {
  const user = currentUser();
  if (!user) { window.location.href = 'login.html'; return; }
  const access = {
    admin: ['cart', 'expenses'],
    farmer: ['reports']
  };
  if (access[user.role]?.includes(page)) { window.location.href = 'dashboard.html'; return; }
  renderShell(user, page, renderContent(page, user));
}

function changeFilters(form) {
  const values = new FormData(form);
  const params = new URLSearchParams();
  for (const [key, value] of values.entries()) if (String(value).trim()) params.set(key, value);
  const query = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  refresh();
}

function exportReport() {
  const rows = [
    ['Metric', 'Value'], ['Farmers', all('farmers').length], ['Crops', all('crops').length],
    ['Equipment', all('equipment').length], ['Products', all('products').length],
    ['Orders', all('orders').length], ['Rental requests', all('rentals').length],
    ['Expenses (₹)', all('expenses').reduce((sum, x) => sum + Number(x.amount || 0), 0)]
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kisan-mitra-report-${new Date().toISOString().slice(0,10)}.csv`; anchor.click();
  URL.revokeObjectURL(url);
  toast('Report exported as CSV.');
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  const entity = target.dataset.entity;
  const user = currentUser();
  try {
    if (action === 'theme-toggle') { const next = toggleTheme(); toast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled.`); }
    else if (action === 'logout') logout();
    else if (action === 'open-form') openDialog(entity);
    else if (action === 'edit-record') openDialog(entity, id);
    else if (action === 'edit-profile') openDialog('profile', id);
    else if (action === 'close-dialog') closeDialog();
    else if (action === 'delete-record') {
      const label = all(entity).find(row => row.id === id)?.name || 'this record';
      if (window.confirm(`Delete ${label}? This action cannot be undone.`)) {
        if (entity === 'expenses') removeExpense(id); else deleteRecord(entity, id);
        closeDialog(); refresh(); toast('Record deleted.');
      }
    }
    else if (action === 'reset-filters') { window.history.replaceState({}, '', window.location.pathname); refresh(); }
    else if (action === 'request-rental') openDialog('rental');
    else if (action === 'rental-status') {
      const rental = all('rentals').find(item => item.id === id);
      if (user.role === 'farmer' && (rental?.farmerId !== (user.farmerId || user.id)) && !all('farmers').some(f => f.userId === user.id && f.id === rental?.farmerId)) throw new Error('You can only update your own rental requests.');
      updateRentalStatus(id, target.dataset.status); refresh(); toast(`Rental marked ${target.dataset.status.toLowerCase()}.`);
    }
    else if (action === 'cart-add') { addToCart(user.id, id, 1); toast('Added to your cart.'); }
    else if (action === 'cart-quantity') {
      const cart = read(KEYS.cart, []); const current = cart.find(c=>c.userId===user.id)?.items.find(i=>i.productId===id)?.quantity || 1;
      const next = current + Number(target.dataset.delta);
      if (next < 1) removeFromCart(user.id,id); else setCartQuantity(user.id,id,next);
      refresh();
    }
    else if (action === 'cart-remove') { removeFromCart(user.id,id); refresh(); toast('Item removed from cart.'); }
    else if (action === 'checkout') {
      const order = checkout(user); refresh(); toast(`Order ${order.id} placed successfully.`);
    }
    else if (action === 'order-cancel') {
      const order = all('orders').find(item => item.id === id);
      const profile = all('farmers').find(f => f.userId === user.id || f.id === user.farmerId);
      const ownerId = profile?.id || user.farmerId || user.id;
      if (user.role !== 'admin' && order?.farmerId !== ownerId) throw new Error('You can only cancel your own orders.');
      if (window.confirm('Cancel this order? Available stock will be restored.')) { updateOrderStatus(id,'Cancelled'); refresh(); toast('Order cancelled and stock restored.'); }
    }
    else if (action === 'export-report') exportReport();
  } catch (error) { toast(error.message || 'Something went wrong.', 'error'); }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === 'login-form') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Signing in…';
    try { await login(values.email, values.password); window.location.href = 'dashboard.html'; }
    catch (error) { showAuthError(error.message); button.disabled = false; button.textContent = 'Sign in'; }
  }
  else if (form.id === 'register-form') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (values.password !== values.confirmPassword) { showAuthError('The password and confirmation do not match.'); return; }
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Creating account…';
    try { await registerFarmer(values); window.location.href = 'dashboard.html'; }
    catch (error) { showAuthError(error.message); button.disabled = false; button.textContent = 'Create farmer account'; }
  }
  else if (form.id === 'filter-form') {
    event.preventDefault(); changeFilters(form);
  }
  else if (form.id === 'record-form') {
    event.preventDefault();
    const entity = form.dataset.entity; const id = form.dataset.id || '';
    const values = Object.fromEntries(new FormData(form));
    for (const key of ['price','stock','amount']) if (values[key] !== undefined && values[key] !== '') values[key] = Number(values[key]);
    try {
      if (entity === 'expenses') saveExpense(currentUser(), values, id);
      else if (entity === 'profile') {
        const user = currentUser();
        if (all('farmers').some(f => f.email?.toLowerCase() === values.email?.toLowerCase() && f.id !== id)) throw new Error('A farmer with this email already exists.');
        saveRecord('farmers', values, id);
        const users = all('users'); const account = users.find(item => item.id === user.id);
        if (account) { account.name = values.name; account.email = values.email.toLowerCase(); account.phone = values.phone; write(KEYS.users, users); }
      }
      else {
        if (entity === 'farmers' && all('farmers').some(f => f.email?.toLowerCase() === values.email?.toLowerCase() && f.id !== id)) throw new Error('A farmer with this email already exists.');
        if (entity === 'farmers' && !id) values.registeredAt = new Date().toISOString();
        saveRecord(entity, values, id);
      }
      closeDialog(); refresh(); toast(id ? 'Changes saved.' : 'Record added successfully.');
    } catch (error) { toast(error.message, 'error'); }
  }
  else if (form.id === 'rental-form') {
    event.preventDefault(); const values = Object.fromEntries(new FormData(form));
    try { const rental = requestRental(currentUser(), values.equipmentId, values.startDate, values.endDate, values.hoursPerDay || 8); closeDialog(); refresh(); toast(`Rental request submitted. Estimated charge: ₹${rental.amount.toLocaleString('en-IN')}.`); }
    catch (error) { toast(error.message, 'error'); }
  }
  else if (form.id === 'income-form') {
    event.preventDefault(); const amount = Number(new FormData(form).get('income'));
    if (!Number.isFinite(amount) || amount < 0) { toast('Enter a valid income estimate.', 'error'); return; }
    write(`km_estimated_income_${currentUser().id}`, amount); refresh(); toast('Income estimate saved.');
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.matches('#rental-form [name=equipmentId]')) {
    const selected = target.selectedOptions[0];
    const hourly = selected?.dataset.unit === 'hour';
    const field = document.getElementById('hourly-duration');
    if (field) { field.hidden = !hourly; field.querySelector('select').required = hourly; }
  }
  if (target.matches('[data-order-status]')) {
    try { updateOrderStatus(target.dataset.orderStatus, target.value); refresh(); toast('Order status updated.'); }
    catch (error) { toast(error.message, 'error'); refresh(); }
  }
}

function handleKeydown(event) {
  if (event.key === 'Enter' && event.target.id === 'global-search') {
    const query = event.target.value.trim();
    if (!query) return;
    const destination = ['products','cart','orders'].includes(page) ? 'products.html' : 'crops.html';
    window.location.href = `${destination}?q=${encodeURIComponent(query)}`;
  }
}

async function init() {
  try { await seedDemoData(); }
  catch (error) {
    if (page === 'login' || page === 'register') renderAuthPage(page);
    showAuthError(error.message || 'The demo data could not be initialized.');
    return;
  }
  applyTheme();
  if (page === 'login' || page === 'register') {
    if (currentUser()) { window.location.href = 'dashboard.html'; return; }
    renderAuthPage(page);
  } else if (page !== 'home') {
    const user = requireUser();
    if (!user) return;
    refresh();
    if ((window.location.search.includes('action=create') || window.location.pathname.endsWith('/add-farmer.html')) && ['farmers','crops','equipment','products'].includes(page) && user.role === 'admin') {
      const entity = page; openDialog(entity);
    }
  }
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('change', handleChange);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('km:toast', (event) => toast(event.detail?.message || 'Notice', event.detail?.type || 'success'));
  window.addEventListener('km:storage-error', (event) => toast(event.detail || 'Browser storage could not save the data.', 'error'));
}

init();
