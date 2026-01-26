-- Add reminder tracking columns to tour_bookings table
-- Required for LumaLeasing tour reminder emails (24hr + 1hr before tour)

alter table tour_bookings
  add column if not exists reminder_24h_sent_at timestamptz,
  add column if not exists reminder_1h_sent_at timestamptz;

-- Create index for efficient cron job queries
create index if not exists idx_tour_bookings_reminders 
  on tour_bookings(scheduled_date, scheduled_time, status)
  where status = 'confirmed';

-- Add comment for documentation
comment on column tour_bookings.reminder_24h_sent_at is 'Timestamp when 24-hour advance reminder was sent';
comment on column tour_bookings.reminder_1h_sent_at is 'Timestamp when 1-hour advance reminder was sent';
