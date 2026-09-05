CREATE OR REPLACE FUNCTION test_func() RETURNS TEXT AS $$
DECLARE
  d DATE := '2026-10-16'; -- A Friday
  res TEXT;
BEGIN
  res := lower(to_char(d, 'dy'));
  RETURN res;
END;
$$ LANGUAGE plpgsql;
