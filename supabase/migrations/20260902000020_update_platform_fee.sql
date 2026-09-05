-- Update Platform configuration to take only 1% fee.
-- We are reallocating the remaining 9% margin directly to the Vendor.
-- Previous: Vendor (70%), Driver (20%), Platform (10%)
-- New: Vendor (79%), Driver (20%), Platform (1%)

UPDATE platform_config 
SET vendor_split_pct = 0.79, 
    driver_split_pct = 0.20 
WHERE id = 1;
