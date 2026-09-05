-- Function to calculate the next valid operating date based on the plan's schedule
CREATE OR REPLACE FUNCTION get_next_valid_operating_date(current_end_date DATE, op_days TEXT[])
RETURNS DATE AS $$
DECLARE
  next_date DATE := current_end_date + INTERVAL '1 day';
  day_str TEXT;
BEGIN
  IF op_days IS NULL OR array_length(op_days, 1) = 0 THEN
    RETURN next_date;
  END IF;

  LOOP
    day_str := lower(to_char(next_date, 'dy'));
    IF day_str = ANY(op_days) THEN
      RETURN next_date;
    END IF;
    next_date := next_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate the previous valid operating date
CREATE OR REPLACE FUNCTION get_prev_valid_operating_date(current_end_date DATE, op_days TEXT[])
RETURNS DATE AS $$
DECLARE
  prev_date DATE := current_end_date - INTERVAL '1 day';
  day_str TEXT;
BEGIN
  IF op_days IS NULL OR array_length(op_days, 1) = 0 THEN
    RETURN prev_date;
  END IF;

  LOOP
    day_str := lower(to_char(prev_date, 'dy'));
    IF day_str = ANY(op_days) THEN
      RETURN prev_date;
    END IF;
    prev_date := prev_date - INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Redefine the trigger function to dynamically calculate the extension based on operating days
CREATE OR REPLACE FUNCTION extend_subscriptions_on_holiday()
RETURNS trigger AS $$
BEGIN
  UPDATE customer_subscriptions cs
  SET end_date = get_next_valid_operating_date(cs.end_date, s.operating_days)
  FROM subscriptions s
  WHERE cs.subscription_id = s.id
    AND cs.status = 'active'
    AND cs.start_date <= NEW.holiday_date
    AND cs.end_date >= NEW.holiday_date
    AND s.kitchen_id = NEW.kitchen_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine the shrink function
CREATE OR REPLACE FUNCTION shrink_subscriptions_on_holiday_removed()
RETURNS trigger AS $$
BEGIN
  UPDATE customer_subscriptions cs
  SET end_date = get_prev_valid_operating_date(cs.end_date, s.operating_days)
  FROM subscriptions s
  WHERE cs.subscription_id = s.id
    AND cs.status = 'active'
    AND cs.start_date <= OLD.holiday_date
    AND cs.end_date > OLD.holiday_date
    AND s.kitchen_id = OLD.kitchen_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
