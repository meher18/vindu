const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://omztihguzcpkdfcxfhwk.supabase.co', 'sb_publishable_Ol3wu-0u6Wyk7gUYo_HQ9Q_MTudP7xh');

async function seed() {
  console.log('Seeding mock data for UX demonstration...');

  // 1. Get a vendor
  const { data: users, error: uErr } = await supabase.from('profiles').select('id').eq('role', 'vendor').limit(1);
  if (!users || users.length === 0) { console.log('No vendor found. Please create an account in the app first.'); return; }
  const vendorId = users[0].id;

  // 2. Ensure kitchen exists
  let { data: kitchen } = await supabase.from('kitchens').select('id').eq('vendor_id', vendorId).single();
  if (!kitchen) {
    const { data: newKitchen } = await supabase.from('kitchens').insert([{ vendor_id: vendorId, name: 'Demo Cloud Kitchen', address: 'Tech Park, Block B', fssai_number: '12345678901234', delivery_radius_km: 10, status: 'active' }]).select().single();
    kitchen = newKitchen;
  } else {
    await supabase.from('kitchens').update({ status: 'active' }).eq('id', kitchen.id);
  }

  // 3. Create a Fast-Selling Lunch Plan (to trigger 🔥 SELLING FAST)
  let { data: plan1 } = await supabase.from('subscriptions').select('id').eq('kitchen_id', kitchen.id).eq('slot_name', 'lunch').single();
  if (!plan1) {
    const { data: newPlan } = await supabase.from('subscriptions').insert([{
      kitchen_id: kitchen.id, diet_type: 'veg', slot_name: 'lunch', slot_target_time: '13:00:00', price_per_day: 120, vendor_fee: 84, delivery_fee: 24, capacity: 50, operating_days: ['mon','tue','wed','thu','fri'], status: 'active'
    }]).select().single();
    plan1 = newPlan;
  }

  // 4. Create a Sold Out Dinner Plan (to trigger 🚫 SOLD OUT)
  let { data: plan2 } = await supabase.from('subscriptions').select('id').eq('kitchen_id', kitchen.id).eq('slot_name', 'dinner').single();
  if (!plan2) {
    const { data: newPlan } = await supabase.from('subscriptions').insert([{
      kitchen_id: kitchen.id, diet_type: 'non-veg', slot_name: 'dinner', slot_target_time: '20:00:00', price_per_day: 180, vendor_fee: 126, delivery_fee: 36, capacity: 20, operating_days: ['mon','tue','wed','thu','fri','sat','sun'], status: 'active'
    }]).select().single();
    plan2 = newPlan;
  }

  // 5. Create a fake customer
  let { data: customer } = await supabase.from('profiles').select('id').eq('role', 'customer').limit(1).single();
  if (!customer) {
    // Cannot easily create a user via raw SQL due to auth, so we just pick ANY profile and cast them to customer temporarily for the seed
    const { data: anyProfile } = await supabase.from('profiles').select('id').neq('id', vendorId).limit(1).single();
    if (anyProfile) {
        customer = anyProfile;
    }
  }

  if (customer) {
    // 6. Add Customer Subscriptions to max out the capacities
    console.log('Injecting subscriptions to trigger gamification badges...');
    // Plan 1: 45 / 50 (90% capacity -> SELLING FAST)
    await supabase.from('customer_subscriptions').insert([{
      customer_id: customer.id, subscription_id: plan1.id, start_date: '2026-09-01', end_date: '2026-09-30', quantity: 45, status: 'active'
    }]);

    // Plan 2: 20 / 20 (100% capacity -> SOLD OUT)
    await supabase.from('customer_subscriptions').insert([{
      customer_id: customer.id, subscription_id: plan2.id, start_date: '2026-09-01', end_date: '2026-09-30', quantity: 20, status: 'active'
    }]);
  } else {
    console.log('No secondary profile found to attach subscriptions to.');
  }

  console.log('Seed complete! UI will now light up.');
}
seed().catch(console.error);
