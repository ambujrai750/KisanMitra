import { all, saveAll, uid, logActivity } from '../utils/storage.js';

function cartFor(userId) {
  const carts = all('cart');
  return carts.find((cart) => cart.userId === userId) || { userId, items: [] };
}
function persistCart(cart) {
  const carts = all('cart').filter((item) => item.userId !== cart.userId);
  carts.push(cart);
  if (!saveAll('cart', carts)) throw new Error('Could not save the cart.');
  return cart;
}
export function getCart(userId) { return cartFor(userId); }

export function addToCart(userId, productId, quantity = 1) {
  const product = all('products').find((item) => item.id === productId);
  if (!product || product.status !== 'Active') throw new Error('This product is not available.');
  const cart = cartFor(userId);
  const item = cart.items.find((row) => row.productId === productId);
  const nextQuantity = (item?.quantity || 0) + Number(quantity);
  if (nextQuantity > Number(product.stock)) throw new Error(`Only ${product.stock} item(s) are currently in stock.`);
  if (item) item.quantity = nextQuantity;
  else cart.items.push({ productId, quantity: nextQuantity });
  persistCart(cart);
  return cart;
}

export function setCartQuantity(userId, productId, quantity) {
  const cart = cartFor(userId);
  const product = all('products').find((item) => item.id === productId);
  const item = cart.items.find((row) => row.productId === productId);
  if (!item || !product) throw new Error('Cart item no longer exists.');
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) throw new Error('Quantity must be at least 1.');
  if (Number(quantity) > Number(product.stock)) throw new Error(`Only ${product.stock} item(s) are currently in stock.`);
  item.quantity = Number(quantity);
  return persistCart(cart);
}

export function removeFromCart(userId, productId) {
  const cart = cartFor(userId);
  cart.items = cart.items.filter((item) => item.productId !== productId);
  return persistCart(cart);
}

export function checkout(user) {
  const cart = cartFor(user.id);
  if (!cart.items.length) throw new Error('Your cart is empty.');
  const products = all('products');
  const orderItems = cart.items.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    if (!product || product.status !== 'Active') throw new Error('A cart product is no longer available.');
    if (Number(item.quantity) > Number(product.stock)) throw new Error(`${product.name} does not have enough stock. Update your cart quantity.`);
    return { productId: product.id, name: product.name, category: product.category, price: Number(product.price), quantity: Number(item.quantity), subtotal: Number(product.price) * Number(item.quantity) };
  });
  orderItems.forEach((item) => {
    const product = products.find((row) => row.id === item.productId);
    product.stock = Number(product.stock) - item.quantity;
  });
  const profile = all('farmers').find((farmer) => farmer.userId === user.id || farmer.id === user.farmerId);
  const order = {
    id: uid('ORD'), farmerId: profile?.id || user.farmerId || user.id, farmerName: user.name,
    items: orderItems, total: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
    status: 'Pending', createdAt: new Date().toISOString()
  };
  const orders = all('orders');
  orders.unshift(order);
  if (!saveAll('products', products)) throw new Error('Could not update product stock.');
  if (!saveAll('orders', orders)) {
    orderItems.forEach((item) => { const product = products.find((row) => row.id === item.productId); product.stock += item.quantity; });
    saveAll('products', products);
    throw new Error('Could not place the order.');
  }
  persistCart({ userId: user.id, items: [] });
  logActivity(`${user.name} placed order ${order.id}`, 'order');
  return order;
}

export function updateOrderStatus(orderId, nextStatus) {
  const orders = all('orders');
  const order = orders.find((item) => item.id === orderId);
  if (!order) throw new Error('Order not found.');
  const allowed = ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'];
  if (!allowed.includes(nextStatus)) throw new Error('Unsupported order status.');
  if (['Delivered', 'Cancelled'].includes(order.status) && nextStatus !== order.status) throw new Error(`A ${order.status.toLowerCase()} order cannot be reopened or changed.`);
  if (nextStatus === 'Cancelled' && order.status !== 'Cancelled') {
    const products = all('products');
    order.items.forEach((item) => {
      const product = products.find((row) => row.id === item.productId);
      if (product) product.stock = Number(product.stock) + Number(item.quantity);
    });
    if (!saveAll('products', products)) throw new Error('Could not restore product stock.');
  }
  order.status = nextStatus;
  if (!saveAll('orders', orders)) throw new Error('Could not update order status.');
  logActivity(`Order ${order.id} marked ${nextStatus.toLowerCase()}`, 'order');
  return order;
}
