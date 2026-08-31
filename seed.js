const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:GoodWorksByVinduOz8@db.omztihguzcpkdfcxfhwk.supabase.co:5432/postgres';
const db = new Client({ connectionString: DB_URL });

async function run() {
  await db.connect();
  console.log('✅ Connected to database\n');

  try {
    // ─────────────────────────────────────────────
    // STEP 1: Get existing users
    // ─────────────────────────────────────────────
    console.log('👤 Fetching existing users...');
    const usersRes = await db.query(`SELECT id, email FROM auth.users ORDER BY created_at`);
    console.log('  Found:', usersRes.rows.map(u => u.email));

    const vendorUser = usersRes.rows.find(u => u.email === 'msr@vindu.com');
    const customerUser = usersRes.rows.find(u => u.email === 'tmehersairam@gmail.com');

    if (!vendorUser) throw new Error('Vendor user msr@vindu.com not found!');
    if (!customerUser) throw new Error('Customer user tmehersairam@gmail.com not found!');

    const vendorId = vendorUser.id;
    const customerId = customerUser.id;

    // ─────────────────────────────────────────────
    // STEP 2: Fix roles
    // ─────────────────────────────────────────────
    console.log('\n🔑 Setting correct roles...');
    await db.query(`UPDATE profiles SET role='vendor', full_name='Annapurna Kitchen' WHERE id='${vendorId}'`);
    await db.query(`
      UPDATE profiles 
      SET role='customer', 
          full_name='Meher Sairam', 
          phone='+91 9876543210', 
          delivery_address='Flat 203, Sunshine Apartments, Banjara Hills, Hyderabad - 500034',
          lat=17.4123,
          lng=78.4480
      WHERE id='${customerId}'
    `);
    console.log('  ✓ msr@vindu.com → vendor');
    console.log('  ✓ tmehersairam@gmail.com → customer');

    // ─────────────────────────────────────────────
    // STEP 3: Fix kitchen to active
    // ─────────────────────────────────────────────
    console.log('\n🍳 Setting up kitchen...');
    await db.query(`DELETE FROM kitchens WHERE vendor_id='${vendorId}'`);
    const kitchenRes = await db.query(`
      INSERT INTO kitchens (vendor_id, name, address, lat, lng, status, fssai_number)
      VALUES (
        '${vendorId}', 
        'Annapurna Tiffins', 
        '12, Krishnanagar Colony, Mehdipatnam, Hyderabad - 500028', 
        17.3850, 78.4867, 
        'active',
        '12345678901234'
      )
      RETURNING id, name
    `);
    const kitchenId = kitchenRes.rows[0].id;
    const kitchenName = kitchenRes.rows[0].name;
    console.log(`  ✓ Kitchen "${kitchenName}" is ACTIVE (id: ${kitchenId})`);

    // ─────────────────────────────────────────────
    // STEP 4: Create rich subscription plans
    // ─────────────────────────────────────────────
    console.log('\n📋 Seeding meal plans...');
    await db.query(`DELETE FROM subscriptions WHERE kitchen_id='${kitchenId}'`);

    const plans = [
      { diet: 'veg', slot: 'lunch', time: '13:00:00', price: 120, capacity: 50 },
      { diet: 'veg', slot: 'dinner', time: '20:00:00', price: 110, capacity: 40 },
      { diet: 'non-veg', slot: 'lunch', time: '13:00:00', price: 150, capacity: 30 },
    ];

    const subIds = [];
    for (const plan of plans) {
      const r = await db.query(`
        INSERT INTO subscriptions 
          (kitchen_id, diet_type, duration_type, slot_name, slot_target_time, delivery_type, price_per_day, vendor_fee, delivery_fee, capacity, status)
        VALUES 
          ('${kitchenId}', '${plan.diet}', 'monthly', '${plan.slot}', '${plan.time}', 'home_delivery', ${plan.price}, ${plan.price * 0.8}, ${plan.price * 0.2}, ${plan.capacity}, 'active')
        RETURNING id
      `);
      subIds.push(r.rows[0].id);
      console.log(`  ✓ ${plan.diet.toUpperCase()} ${plan.slot} @ ₹${plan.price}/day`);
    }

    // ─────────────────────────────────────────────
    // STEP 5: Seed menus for today + next 3 days
    // ─────────────────────────────────────────────
    console.log('\n📝 Seeding daily menus...');
    await db.query(`DELETE FROM menus WHERE kitchen_id='${kitchenId}'`);

    const today = new Date();
    const fmtDate = (offset) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];

    const menuData = [
      {
        date: fmtDate(0), slot: 'lunch',
        items: ['Dal Makhani', '2 Butter Roti', 'Jeera Rice', 'Gulab Jamun (2 pcs)', 'Papad']
      },
      {
        date: fmtDate(0), slot: 'dinner',
        items: ['Paneer Butter Masala', '3 Roti', 'Raita', 'Salad', 'Kheer']
      },
      {
        date: fmtDate(1), slot: 'lunch',
        items: ['Chana Masala', '2 Roti', 'Steamed Rice', 'Pickle', 'Buttermilk']
      },
      {
        date: fmtDate(1), slot: 'dinner',
        items: ['Aloo Matar', '3 Phulka', 'Dal Tadka', 'Rice', 'Mukhwas']
      },
      {
        date: fmtDate(2), slot: 'lunch',
        items: ['Rajma', '2 Roti', 'Rice', 'Papad', 'Pickle']
      },
    ];

    for (const menu of menuData) {
      await db.query(`
        INSERT INTO menus (kitchen_id, slot_name, effective_date, items, status)
        VALUES ('${kitchenId}', '${menu.slot}', '${menu.date}', '${JSON.stringify(menu.items).replace(/'/g, "''")}', 'active')
      `);
      console.log(`  ✓ ${menu.date} ${menu.slot}: ${menu.items.join(', ')}`);
    }

    // ─────────────────────────────────────────────
    // STEP 6: Create customer wallet with balance
    // ─────────────────────────────────────────────
    console.log('\n💰 Setting up customer wallet...');
    await db.query(`DELETE FROM wallets WHERE customer_id='${customerId}'`);
    await db.query(`INSERT INTO wallets (customer_id, balance) VALUES ('${customerId}', 250.00)`);
    console.log('  ✓ Customer wallet: ₹250 balance');

    // ─────────────────────────────────────────────
    // STEP 7: Final verification
    // ─────────────────────────────────────────────
    console.log('\n🔍 Verifying data...');
    const v = await db.query(`SELECT name, status FROM kitchens WHERE id='${kitchenId}'`);
    const s = await db.query(`SELECT diet_type, slot_name, price_per_day FROM subscriptions WHERE kitchen_id='${kitchenId}'`);
    const m = await db.query(`SELECT effective_date, slot_name FROM menus WHERE kitchen_id='${kitchenId}' ORDER BY effective_date`);
    const w = await db.query(`SELECT balance FROM wallets WHERE customer_id='${customerId}'`);
    const p = await db.query(`SELECT full_name, role FROM profiles`);

    console.log('  Profiles:', p.rows.map(r => `${r.full_name} (${r.role})`));
    console.log('  Kitchen:', v.rows[0]);
    console.log('  Plans:', s.rows.map(r => `${r.diet_type} ${r.slot_name} ₹${r.price_per_day}`));
    console.log('  Menus:', m.rows.map(r => `${r.effective_date} ${r.slot_name}`));
    console.log('  Wallet:', w.rows[0]);

    console.log('\n✅ DATABASE SEEDED SUCCESSFULLY!\n');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│                 TEST CREDENTIALS                     │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ VENDOR:   msr@vindu.com | your password              │');
    console.log('│           → Open Vindu Partners app                  │');
    console.log('│                                                       │');
    console.log('│ CUSTOMER: tmehersairam@gmail.com | your password      │');
    console.log('│           → Open Vindu (customer) app                 │');
    console.log('└─────────────────────────────────────────────────────┘');

  } catch (e) {
    console.error('❌ ERROR:', e.message);
    console.error(e.stack);
  }

  await db.end();
}

run();
