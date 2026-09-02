-- FIX: The Driver update matrix was mathematically exposed to Logistical Hijacking.
-- The previous RLS policy allowed ANY driver to update ANY delivery. 
-- A malicious driver could execute a script to overwrite the 'driver_id' of every 
-- delivery in the city, stealing active manifests from honest drivers and 
-- crashing the OTP verification system at the door.

DROP POLICY IF EXISTS "Drivers update deliveries" ON deliveries;

-- Inject Cryptographic Ownership Locks:
-- 1. USING (driver_id IS NULL OR driver_id = auth.uid()): A driver can only mutate a row if it is unassigned, or already belongs to them.
-- 2. WITH CHECK (driver_id = auth.uid()): A driver cannot maliciously assign a delivery to a rival driver's UUID.
CREATE POLICY "Drivers update deliveries" ON deliveries FOR UPDATE 
USING (
  (driver_id IS NULL OR driver_id = auth.uid()) 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
)
WITH CHECK (
  driver_id = auth.uid()
);
