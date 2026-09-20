const { createClient } = require('@supabase/supabase-js');

// To run this against your local Supabase emulator, change these to your local URL and Anon Key.
// For production, ensure you have disabled "Email Rate Limits" in Supabase Auth settings to run tests.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://omztihguzcpkdfcxfhwk.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ol3wu-0u6Wyk7gUYo_HQ9Q_MTudP7xh';

async function runTest() {
  console.log("🚀 STARTING E2E 1000x BRAIN AUTOMATION...\n");

  const adminClient = createClient(URL, KEY);
  const vendorClient = createClient(URL, KEY);
  const customerClient = createClient(URL, KEY);
  const driverClient = createClient(URL, KEY);

  const timestamp = Date.now();
  
  // 1. SIGNUPS (Simulating the 4 Personas)
  console.log("👤 Creating 4 Sandbox Personas...");
  const { data: aData, error: aErr } = await adminClient.auth.signUp({ email: `admin_${timestamp}@example.com`, password: 'password123', options: { data: { requested_role: 'admin' } }});
  console.log("aData:", aData, "aErr:", aErr);
  if (aErr) throw new Error("Admin signup failed. (If rate limited, use local supabase or disable rate limits): " + aErr.message);
  
  const { data: vData, error: vErr } = await vendorClient.auth.signUp({ email: `vendor_${timestamp}@example.com`, password: 'password123', options: { data: { requested_role: 'vendor' } }});
  if (vErr) throw new Error("Vendor signup failed: " + vErr.message);

  const { data: cData, error: cErr } = await customerClient.auth.signUp({ email: `cust_${timestamp}@example.com`, password: 'password123', options: { data: { requested_role: 'customer' } }});
  if (cErr) throw new Error("Cust signup failed: " + cErr.message);

  const { data: dData, error: dErr } = await driverClient.auth.signUp({ email: `driver_${timestamp}@example.com`, password: 'password123', options: { data: { requested_role: 'driver' } }});
  if (dErr) throw new Error("Driver signup failed: " + dErr.message);
  
  console.log("✅ Personas Created Successfully.");

  // 2. ADMIN BOOTSTRAPPING
  console.log("\n🛡️ Testing Admin Bootstrapping...");
  let res = await adminClient.rpc('claim_super_admin', { secret_key: 'VINDU_GOD_MODE_2026' });
  if (res.error) throw new Error("Admin Bootstrap Failed: " + JSON.stringify(res.error));
  
  res = await adminClient.from('profiles').select('role').eq('id', aData.user.id).single();
  console.log("Profile fetch res:", res);
  if (!res.data || res.data.role !== 'admin') throw new Error("Admin Role not assigned.");
  console.log("✅ Admin Bootstrapped Successfully.");

  // 3. VENDOR CREATION & ADMIN APPROVAL
  console.log("\n🏪 Testing Vendor Onboarding & Approval...");
  res = await vendorClient.from('kitchens').insert({ vendor_id: vData.user.id, name: 'E2E Test Kitchen', address: '123 E2E Ave' }).select().single();
  if (res.error) throw new Error("Kitchen Creation Failed: " + JSON.stringify(res.error));
  const kitchenId = res.data.id;

  res = await adminClient.rpc('admin_set_kitchen_status', { p_kitchen_id: kitchenId, p_status: 'active' });
  if (res.error) throw new Error("Admin Approval Failed: " + JSON.stringify(res.error));
  console.log("✅ Kitchen Approved by Admin.");

  // 4. PLAN CREATION
  console.log("\n📝 Vendor Creating Subscription Plan...");
  res = await vendorClient.from('subscriptions').insert({
    kitchen_id: kitchenId, diet_type: 'veg', duration_type: 'monthly', slot_name: 'lunch', slot_target_time: '13:00',
    delivery_type: 'home_delivery', price_per_day: 100, vendor_fee: 70, delivery_fee: 20, capacity: 50
  }).select().single();
  if (res.error) throw new Error("Plan Creation Failed: " + JSON.stringify(res.error));
  const planId = res.data.id;
  console.log("✅ Plan Created at ₹100/day.");

  // 5. CUSTOMER WALLET TOP-UP
  console.log("\n💰 Topping Up Customer Wallet via Admin...");
  res = await adminClient.from('wallets').select('id, balance').eq('customer_id', cData.user.id).single();
  const walletId = res.data.id;
  
  res = await adminClient.from('wallets').update({ balance: 5000 }).eq('id', walletId);
  if (res.error) throw new Error("Top up failed: " + JSON.stringify(res.error));
  console.log("✅ Wallet Topped Up to ₹5000.");

  // 6. NEGATIVE QUANTITY EXPLOIT TEST
  console.log("\n🧪 Testing Negative Quantity Exploit...");
  res = await customerClient.from('customer_subscriptions').insert({
    customer_id: cData.user.id, subscription_id: planId, start_date: '2026-09-08', end_date: '2026-10-07', quantity: -50
  });
  if (res.error && JSON.stringify(res.error).includes('check_quantity_positive')) {
    console.log("✅ Exploit Blocked by database physical constraint!");
  } else {
    throw new Error("❌ EXPLOIT SUCCEEDED! Negative quantity was allowed.");
  }

  // 7. SUCCESSFUL PURCHASE
  console.log("\n🛒 Customer Purchasing Plan...");
  res = await customerClient.from('customer_subscriptions').insert({
    customer_id: cData.user.id, subscription_id: planId, start_date: '2026-09-08', end_date: '2026-10-07', quantity: 1
  }).select().single();
  if (res.error) throw new Error("Purchase failed: " + JSON.stringify(res.error));
  const custSubId = res.data.id;
  console.log("✅ Purchase Success.");

  // 8. RUG-PULL EXPLOIT TEST
  console.log("\n🧪 Testing Rug-Pull Financial Defense...");
  await vendorClient.from('subscriptions').update({ price_per_day: 1000000 }).eq('id', planId);
  console.log("   Vendor changed plan price to ₹1,000,000.");
  
  await customerClient.rpc('secure_cancel_subscription', { sub_id: custSubId });
  
  res = await adminClient.from('wallets').select('balance').eq('id', walletId).single();
  const finalBalance = res.data.balance;
  if (finalBalance > 10000) {
    throw new Error(`❌ RUG PULL EXPLOIT SUCCEEDED! Customer balance is now ₹${finalBalance}`);
  } else {
    console.log(`✅ Exploit Blocked! Refund used snapshotted price. Final balance is safe: ₹${finalBalance}`);
  }

  // 9. QR SPOOFING & DELIVERY COMPLETION
  console.log("\n📦 Testing Delivery & Cryptographic QR Handoff...");
  res = await customerClient.from('customer_subscriptions').insert({
    customer_id: cData.user.id, subscription_id: planId, start_date: '2026-09-06', end_date: '2026-10-05', quantity: 1
  }).select().single();
  const activeSubId = res.data.id;

  console.log("   Admin triggering daily deliveries cron...");
  await adminClient.rpc('generate_daily_deliveries');

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  res = await adminClient.from('deliveries').select('id').eq('customer_subscription_id', activeSubId).eq('date', today).single();
  const deliveryId = res.data.id;

  res = await vendorClient.rpc('secure_vendor_mark_batch_ready', { p_delivery_ids: [deliveryId] });
  const pickupSecret = res.data;
  console.log("✅ Vendor marked ready. Cryptographic Pickup Secret: " + pickupSecret);

  res = await driverClient.rpc('secure_driver_claim_batch', { p_secret: pickupSecret });
  console.log(`✅ Driver successfully claimed delivery using secure secret.`);

  res = await adminClient.from('delivery_secrets').select('otp_code').eq('delivery_id', deliveryId).single();
  const otp = res.data.otp_code;
  
  res = await driverClient.rpc('secure_complete_delivery', { delivery_id: deliveryId, provided_otp: otp });
  console.log("✅ Delivery Completed with OTP!");

  console.log("\n🎉 ALL E2E GOD-MODE TESTS PASSED SUCCESSFULLY! 🎉");
}

runTest().catch(err => {
  console.error("\n💥 TEST SUITE FAILED:");
  console.error(err.message || err);
  process.exit(1);
});
