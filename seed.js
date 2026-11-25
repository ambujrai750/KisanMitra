import { KEYS } from '../config/storage-keys.js';
import { read, write, uid } from '../utils/storage.js';
import { hashPassword } from './auth.js';

const base = '../agriculture-platform/images/';

export async function seedDemoData() {
  if (read(KEYS.users, null)?.length) return;
  const adminHash = await hashPassword('Admin@123');
  const farmerHash = await hashPassword('Farmer@123');
  const adminId = uid('USR');
  const farmerUserId = uid('USR');
  const farmerId = uid('FRM');
  const now = new Date().toISOString();

  write(KEYS.users, [
    { id: adminId, name: 'Kisan Mitra Admin', email: 'admin@kisanmitra.demo', phone: '9000000001', role: 'admin', salt: adminHash.salt, passwordHash: adminHash.hash, createdAt: now },
    { id: farmerUserId, name: 'Rahul Sharma', email: 'farmer@kisanmitra.demo', phone: '9876543210', role: 'farmer', ...farmerHash, passwordHash: farmerHash.hash, createdAt: now, farmerId }
  ]);

  const farmers = [
    { id: farmerId, userId: farmerUserId, name: 'Rahul Sharma', email: 'farmer@kisanmitra.demo', phone: '9876543210', address: 'Ward 4, near primary school', village: 'Kosi', district: 'Mathura', state: 'Uttar Pradesh', image: `${base}farmers/farmer-1.svg`, registeredAt: now, status: 'Active' },
    { id: uid('FRM'), name: 'Anita Devi', email: 'anita.devi@example.com', phone: '9876501234', address: 'Main road', village: 'Shahpur', district: 'Mathura', state: 'Uttar Pradesh', image: `${base}farmers/farmer-2.svg`, registeredAt: '2026-10-18T09:00:00.000Z', status: 'Active' },
    { id: uid('FRM'), name: 'Mohan Singh', email: 'mohan.singh@example.com', phone: '9876502345', address: 'Canal side', village: 'Baldeo', district: 'Mathura', state: 'Uttar Pradesh', image: `${base}farmers/farmer-3.svg`, registeredAt: '2026-10-12T09:00:00.000Z', status: 'Active' },
    { id: uid('FRM'), name: 'Pooja Yadav', email: 'pooja.yadav@example.com', phone: '9876503456', address: 'Near cooperative society', village: 'Farah', district: 'Mathura', state: 'Uttar Pradesh', image: `${base}farmers/farmer-4.svg`, registeredAt: '2026-09-24T09:00:00.000Z', status: 'Inactive' },
    { id: uid('FRM'), name: 'Ramesh Kumar', email: 'ramesh.kumar@example.com', phone: '9876504567', address: 'Village centre', village: 'Naujheel', district: 'Mathura', state: 'Uttar Pradesh', image: `${base}farmers/farmer-5.svg`, registeredAt: '2026-09-10T09:00:00.000Z', status: 'Active' }
  ];
  write(KEYS.farmers, farmers);

  write(KEYS.crops, [
    { id: uid('CRP'), name: 'Wheat', category: 'Cereal', season: 'Rabi', soil: 'Loamy', water: 'Moderate', description: 'A major winter cereal crop. Prepare a fine seedbed and irrigate at critical growth stages.', image: `${base}crops/wheat.svg`, status: 'Active' },
    { id: uid('CRP'), name: 'Rice', category: 'Cereal', season: 'Kharif', soil: 'Clayey', water: 'High', description: 'A monsoon crop that performs well in fields with reliable water availability.', image: `${base}crops/rice.svg`, status: 'Active' },
    { id: uid('CRP'), name: 'Maize', category: 'Cereal', season: 'Kharif', soil: 'Well-drained loam', water: 'Moderate', description: 'Avoid waterlogging and maintain timely weed management.', image: `${base}crops/maize.svg`, status: 'Active' },
    { id: uid('CRP'), name: 'Potato', category: 'Vegetable', season: 'Rabi', soil: 'Sandy loam', water: 'Moderate', description: 'Use healthy seed tubers and maintain loose soil around the plants.', image: `${base}crops/potato.svg`, status: 'Active' },
    { id: uid('CRP'), name: 'Mustard', category: 'Oilseed', season: 'Rabi', soil: 'Loamy', water: 'Low', description: 'A cool-season oilseed crop that needs good drainage.', image: `${base}crops/mustard.svg`, status: 'Active' },
    { id: uid('CRP'), name: 'Sugarcane', category: 'Cash crop', season: 'Annual', soil: 'Deep loam', water: 'High', description: 'A long-duration crop requiring planned irrigation and nutrient management.', image: `${base}crops/sugarcane.svg`, status: 'Active' }
  ]);

  write(KEYS.equipment, [
    { id: uid('EQP'), name: 'Mahindra Tractor', category: 'Tractor', description: '45 HP tractor suitable for ploughing, haulage and field preparation.', price: 850, unit: 'day', image: `${base}equipment/tractor.svg`, status: 'Available' },
    { id: uid('EQP'), name: 'Combine Harvester', category: 'Harvester', description: 'Combine harvesting machine for cereal crops.', price: 5200, unit: 'day', image: `${base}equipment/harvester.svg`, status: 'Available' },
    { id: uid('EQP'), name: 'Seed Drill', category: 'Sowing', description: 'Seed drill for even seed placement and row spacing.', price: 650, unit: 'day', image: `${base}equipment/seeder.svg`, status: 'Available' },
    { id: uid('EQP'), name: 'Power Sprayer', category: 'Sprayer', description: 'Portable sprayer for crop protection applications.', price: 250, unit: 'day', image: `${base}equipment/sprayer.svg`, status: 'Available' },
    { id: uid('EQP'), name: 'Cultivator', category: 'Tillage', description: 'Tractor-mounted cultivator for secondary tillage.', price: 500, unit: 'day', image: `${base}equipment/cultivator.svg`, status: 'Available' },
    { id: uid('EQP'), name: 'Drip Irrigation Set', category: 'Irrigation', description: 'A portable demonstration kit for small field irrigation.', price: 180, unit: 'day', image: `${base}equipment/irrigation.svg`, status: 'Maintenance' }
  ]);

  write(KEYS.products, [
    { id: uid('PRD'), name: 'Wheat Seeds – HD 3086', category: 'Seeds', description: 'Certified wheat seeds for the Rabi season.', price: 1850, stock: 30, image: `${base}products/wheat-seeds.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Paddy Seeds', category: 'Seeds', description: 'Quality paddy seed pack for Kharif sowing.', price: 1250, stock: 24, image: `${base}products/paddy-seeds.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'DAP Fertilizer', category: 'Fertilizers', description: '50 kg demonstration listing. Follow local agronomy guidance.', price: 1350, stock: 18, image: `${base}products/fertilizer-dap.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Organic Manure', category: 'Fertilizers', description: 'Composted organic manure for soil improvement.', price: 420, stock: 40, image: `${base}products/organic-manure.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Crop Protection Spray', category: 'Pesticides', description: 'Product listing demo. Follow label and local safety directions.', price: 650, stock: 12, image: `${base}products/pesticide.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Knapsack Sprayer', category: 'Farming Tools', description: 'Manual sprayer for small farms and gardens.', price: 1450, stock: 9, image: `${base}products/knapsack-sprayer.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Drip Irrigation Kit', category: 'Irrigation Products', description: 'Basic drip irrigation kit for demonstration purposes.', price: 2400, stock: 7, image: `${base}products/drip-kit.svg`, status: 'Active' },
    { id: uid('PRD'), name: 'Farm Hand Tools Set', category: 'Farming Tools', description: 'A set of commonly used hand tools.', price: 780, stock: 15, image: `${base}products/farm-tools.svg`, status: 'Active' }
  ]);

  for (const key of [KEYS.rentals, KEYS.cart, KEYS.orders, KEYS.expenses]) write(key, []);
  write(KEYS.activity, [
    { id: uid('ACT'), message: 'Sample farmers, crops, equipment and products loaded', type: 'system', createdAt: now },
    { id: uid('ACT'), message: 'Kisan Mitra Phase 2 demo is ready to use', type: 'system', createdAt: now }
  ]);
  if (!localStorage.getItem(KEYS.theme)) write(KEYS.theme, 'light');
}
