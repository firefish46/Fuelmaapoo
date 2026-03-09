/**
 * Seed script — run with: npm run seed
 * Reads MONGODB_URI from .env.local automatically (no dotenv package required)
 */
const fs = require('fs');
const path = require('path');

// Manually load .env.local without dotenv
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fuelmonitor';

async function seed() {
  console.log(`\n🔌 Connecting to MongoDB...`);
  console.log(`   URI: ${MONGODB_URI.replace(/:\/\/.*@/, '://***@')}\n`);
  
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear collections
  await mongoose.connection.dropDatabase();
  console.log('🗑  Database cleared\n');

  // Define inline schemas
  const PumpSchema = new mongoose.Schema(
    { name: String, location: String, status: { type: String, default: 'online' } },
    { timestamps: true }
  );
  const FuelLimitSchema = new mongoose.Schema(
    { vehicleClass: String, dailyLimitLiters: Number, icon: String },
    { timestamps: true }
  );
  const UserSchema = new mongoose.Schema(
    {
      username: String,
      password: String,
      name: String,
      role: String,
      pumpId: mongoose.Schema.Types.ObjectId,
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  const TransactionSchema = new mongoose.Schema(
    {
      vehicleReg: String, ownerName: String, vehicleClass: String, amountLiters: Number,
      pumpId: mongoose.Schema.Types.ObjectId, pumpName: String,
      operatorId: mongoose.Schema.Types.ObjectId, operatorName: String,
      status: String, rejectionReason: String, dailyTotalAfter: Number, dailyLimit: Number,
    },
    { timestamps: true }
  );

  const Pump = mongoose.model('Pump', PumpSchema);
  const FuelLimit = mongoose.model('FuelLimit', FuelLimitSchema);
  const User = mongoose.model('User', UserSchema);
  const Transaction = mongoose.model('Transaction', TransactionSchema);

  // ── Pumps ──────────────────────────────────────────
  const pumps = await Pump.insertMany([
    { name: 'Capital Fuel Station',  location: '12 Parliament Road, Capital City', status: 'online' },
    { name: 'North Gate Depot',      location: 'Ring Road North, Industrial Area',  status: 'online' },
    { name: 'Southside Fuel Hub',    location: 'Southside Ave, Market District',    status: 'offline' },
    { name: 'East Highway Station',  location: 'Highway 7, East Junction',          status: 'online' },
  ]);
  console.log(`✅ Seeded ${pumps.length} pump stations`);

  // ── Fuel Limits ────────────────────────────────────
  const limits = [
    { vehicleClass: 'Motorcycle',    dailyLimitLiters: 5,   icon: '🏍' },
    { vehicleClass: 'Private Car',   dailyLimitLiters: 20,  icon: '🚗' },
    { vehicleClass: 'Pickup / SUV',  dailyLimitLiters: 30,  icon: '🚙' },
    { vehicleClass: 'Microbus',      dailyLimitLiters: 40,  icon: '🚐' },
    { vehicleClass: 'Minibus',       dailyLimitLiters: 50,  icon: '🚌' },
    { vehicleClass: 'Bus',           dailyLimitLiters: 80,  icon: '🚌' },
    { vehicleClass: 'Light Truck',   dailyLimitLiters: 60,  icon: '🚛' },
    { vehicleClass: 'Heavy Truck',   dailyLimitLiters: 120, icon: '🚚' },
    { vehicleClass: 'Agricultural',  dailyLimitLiters: 100, icon: '🚜' },
    { vehicleClass: 'Emergency',     dailyLimitLiters: 999, icon: '🚑' },
  ];
  await FuelLimit.insertMany(limits);
  console.log(`✅ Seeded ${limits.length} fuel limits`);

  // ── Users ──────────────────────────────────────────
  const hashPw = (p) => bcrypt.hashSync(p, 12);
  const users = await User.insertMany([
    { username: 'govt_admin', password: hashPw('admin123'), name: 'Minister Fuel Dept.',  role: 'govt', pumpId: null },
    { username: 'pump_op1',   password: hashPw('pump123'),  name: 'Ahmed Raza',            role: 'pump', pumpId: pumps[0]._id },
    { username: 'pump_op2',   password: hashPw('pump123'),  name: 'Sara Khan',             role: 'pump', pumpId: pumps[1]._id },
    { username: 'pump_op3',   password: hashPw('pump123'),  name: 'Khalid Mehmood',        role: 'pump', pumpId: pumps[3]._id },
  ]);
  console.log(`✅ Seeded ${users.length} users`);

  // ── Sample Transactions ────────────────────────────
  const now = new Date();
  const vehicles = [
    { reg: 'ABC-1234', owner: 'Muhammad Ali',  cls: 'Private Car',  limit: 20 },
    { reg: 'XYZ-5678', owner: 'Fatima Noor',   cls: 'Motorcycle',   limit: 5  },
    { reg: 'DEF-9012', owner: 'Ahmed Nawaz',   cls: 'Bus',          limit: 80 },
    { reg: 'GHI-3456', owner: 'Amina Bibi',    cls: 'Heavy Truck',  limit: 120 },
    { reg: 'JKL-7890', owner: 'Bilal Ahmed',   cls: 'Pickup / SUV', limit: 30 },
  ];

  const txns = [];
  for (let i = 0; i < 25; i++) {
    const v    = vehicles[i % vehicles.length];
    const pump = pumps[i % 2];
    const op   = users[1 + (i % 2)];
    const hoursAgo  = Math.floor(Math.random() * 96);
    const createdAt = new Date(now.getTime() - hoursAgo * 3_600_000);
    const amount    = Math.floor(Math.random() * 12) + 3;
    const isRejected = (i === 4 || i === 13);

    txns.push({
      vehicleReg: v.reg, ownerName: v.owner, vehicleClass: v.cls,
      amountLiters: amount,
      pumpId: pump._id, pumpName: pump.name,
      operatorId: op._id, operatorName: op.name,
      status: isRejected ? 'rejected' : 'valid',
      rejectionReason: isRejected ? 'Daily limit reached' : null,
      dailyLimit: v.limit,
      dailyTotalAfter: isRejected ? v.limit : Math.min(amount + 5, v.limit),
      createdAt, updatedAt: createdAt,
    });
  }
  await Transaction.insertMany(txns);
  console.log(`✅ Seeded ${txns.length} sample transactions`);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('┌─────────────────────────────────────┐');
  console.log('│         LOGIN CREDENTIALS            │');
  console.log('├─────────────────┬───────────────────┤');
  console.log('│ Govt Admin      │ govt_admin/admin123│');
  console.log('│ Pump Operator 1 │ pump_op1/pump123   │');
  console.log('│ Pump Operator 2 │ pump_op2/pump123   │');
  console.log('│ Pump Operator 3 │ pump_op3/pump123   │');
  console.log('└─────────────────┴───────────────────┘');
  console.log('\nRun `npm run dev` then open http://localhost:3000\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
