CREATE INDEX IF NOT EXISTS "alert_notification_delivery_status_created_idx" ON "alert_notification_delivery" USING btree ("status","created_at");
