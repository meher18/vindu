-- Function to extend customer subscriptions by 1 day when a kitchen declares a holiday
CREATE OR REPLACE FUNCTION extend_subscriptions_on_holiday()
RETURNS trigger AS $$
BEGIN
  UPDATE customer_subscriptions
  SET end_date = end_date + INTERVAL '1 day'
  WHERE status = 'active'
    AND start_date <= NEW.holiday_date
    AND end_date >= NEW.holiday_date
    AND subscription_id IN (
      SELECT id FROM subscriptions WHERE kitchen_id = NEW.kitchen_id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_kitchen_holiday_created
  AFTER INSERT ON kitchen_holidays
  FOR EACH ROW EXECUTE PROCEDURE extend_subscriptions_on_holiday();

-- Function to revert customer subscriptions by 1 day if a kitchen cancels a holiday
CREATE OR REPLACE FUNCTION shrink_subscriptions_on_holiday_removed()
RETURNS trigger AS $$
BEGIN
  UPDATE customer_subscriptions
  SET end_date = end_date - INTERVAL '1 day'
  WHERE status = 'active'
    AND start_date <= OLD.holiday_date
    AND end_date > OLD.holiday_date -- greater than, since they were already extended
    AND subscription_id IN (
      SELECT id FROM subscriptions WHERE kitchen_id = OLD.kitchen_id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_kitchen_holiday_deleted
  AFTER DELETE ON kitchen_holidays
  FOR EACH ROW EXECUTE PROCEDURE shrink_subscriptions_on_holiday_removed();

