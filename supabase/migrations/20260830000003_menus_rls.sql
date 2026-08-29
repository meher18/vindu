-- ==========================================
-- VINDU - MENUS RLS
-- ==========================================

-- Anyone can view active menus
CREATE POLICY "Anyone can view active menus" ON menus 
FOR SELECT USING (status = 'active');

-- Vendors can view their own menus regardless of status
CREATE POLICY "Vendors can view own menus" ON menus 
FOR SELECT USING (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);

-- Vendors can insert their own menus
CREATE POLICY "Vendors can insert own menus" ON menus 
FOR INSERT WITH CHECK (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);

-- Vendors can update their own menus
CREATE POLICY "Vendors can update own menus" ON menus 
FOR UPDATE USING (
  kitchen_id IN (SELECT id FROM kitchens WHERE vendor_id = auth.uid())
);
