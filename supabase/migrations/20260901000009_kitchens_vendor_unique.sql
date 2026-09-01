-- Enforce a 1:1 relationship between vendors and kitchens
-- Prevents a race condition in the React Native UI from generating multiple kitchens,
-- which would fatally crash the PostgREST .single() Dashboard queries.
ALTER TABLE kitchens ADD CONSTRAINT kitchens_vendor_id_unique UNIQUE (vendor_id);
