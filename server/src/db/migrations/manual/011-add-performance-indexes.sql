-- 011: Add missing indexes for hot query columns
-- These indexes improve performance for dashboard, dispatch, and report queries.
-- Run in Supabase SQL Editor.

-- dispatch_records: route_id is used in GROUP BY for route breakdown, filters, and JOINs
CREATE INDEX IF NOT EXISTS dispatch_route_idx ON dispatch_records(route_id);

-- dispatch_records: composite index for dashboard date-range + status queries
-- Covers: getStatsSQL (today, status filters), getChartDataSQL (hour grouping), getWeeklyStatsSQL (7-day range)
CREATE INDEX IF NOT EXISTS dispatch_status_created_idx ON dispatch_records(status, created_at);

-- invoices: created_at is used for date-range filtering in reports
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);
