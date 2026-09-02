-- FIX: The UI expects menus to be bound to specific subscriptions (Meal Plans), not generic slot names.
-- Otherwise, Veg and Non-Veg plans would share the same menu!
ALTER TABLE menus DROP COLUMN slot_name;
ALTER TABLE menus ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE;
ALTER TABLE menus ADD COLUMN notes TEXT;

-- Enforce a unique menu per plan per day
ALTER TABLE menus ADD CONSTRAINT menus_subscription_date_unique UNIQUE (subscription_id, effective_date);
