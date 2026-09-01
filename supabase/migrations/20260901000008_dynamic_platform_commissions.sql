-- Create a centralized configuration table for dynamic business rules
CREATE TABLE platform_config (
  id INT PRIMARY KEY DEFAULT 1, -- Single row constraint
  vendor_split_pct NUMERIC NOT NULL DEFAULT 0.70,
  driver_split_pct NUMERIC NOT NULL DEFAULT 0.20,
  CHECK (id = 1), -- Ensures only one configuration row exists
  CHECK (vendor_split_pct + driver_split_pct <= 1.0) -- Prevents mathematically impossible margins
);

-- Insert the initial default values (70% Vendor, 20% Driver, 10% Vindu)
INSERT INTO platform_config (id, vendor_split_pct, driver_split_pct) VALUES (1, 0.70, 0.20);

-- Enable read access for authenticated users so the Vendor App can fetch the rates
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read platform config" ON platform_config FOR SELECT USING (true);
