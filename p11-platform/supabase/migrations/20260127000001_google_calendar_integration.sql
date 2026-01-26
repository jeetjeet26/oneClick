-- Google Calendar Integration for LumaLeasing Tour Booking
-- Enables property managers to sync their Google Calendar for dynamic tour availability

-- Agent Calendar Configuration
create table if not exists agent_calendars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  google_email text not null,
  calendar_id text default 'primary',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  sync_enabled boolean default true,
  working_hours jsonb default '{
    "mon": {"start": "09:00", "end": "18:00", "enabled": true},
    "tue": {"start": "09:00", "end": "18:00", "enabled": true},
    "wed": {"start": "09:00", "end": "18:00", "enabled": true},
    "thu": {"start": "09:00", "end": "18:00", "enabled": true},
    "fri": {"start": "09:00", "end": "18:00", "enabled": true},
    "sat": {"start": "10:00", "end": "16:00", "enabled": true},
    "sun": {"start": "00:00", "end": "00:00", "enabled": false}
  }'::jsonb,
  tour_duration_minutes int default 30,
  buffer_minutes int default 15,
  timezone text default 'America/Chicago',
  -- Token health monitoring columns
  token_status text default 'healthy', -- 'healthy' | 'expiring_soon' | 'expired' | 'revoked'
  last_health_check_at timestamptz,
  health_check_error text,
  alert_sent_at timestamptz,
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id, property_id)
);

create index idx_agent_calendars_property on agent_calendars(property_id);
create index idx_agent_calendars_profile on agent_calendars(profile_id);
create index idx_agent_calendars_token_status on agent_calendars(token_status) where sync_enabled = true;

-- Calendar Events (tracks Google Calendar event IDs for two-way sync)
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  agent_calendar_id uuid references agent_calendars(id) on delete cascade,
  tour_booking_id uuid references tour_bookings(id) on delete cascade,
  google_event_id text not null,
  sync_status text default 'synced', -- 'synced' | 'pending' | 'failed'
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(tour_booking_id)
);

create index idx_calendar_events_booking on calendar_events(tour_booking_id);
create index idx_calendar_events_google_id on calendar_events(google_event_id);
create index idx_calendar_events_agent_calendar on calendar_events(agent_calendar_id);

-- Calendar Token Refresh Audit (optional but recommended for diagnostics)
create table if not exists calendar_token_refreshes (
  id uuid primary key default gen_random_uuid(),
  agent_calendar_id uuid references agent_calendars(id) on delete cascade,
  refresh_status text not null, -- 'success' | 'failed' | 'revoked'
  error_message text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz default now()
);

create index idx_calendar_token_refreshes_agent on calendar_token_refreshes(agent_calendar_id);
create index idx_calendar_token_refreshes_status on calendar_token_refreshes(refresh_status);
create index idx_calendar_token_refreshes_created on calendar_token_refreshes(created_at desc);

-- Row Level Security
alter table agent_calendars enable row level security;
alter table calendar_events enable row level security;
alter table calendar_token_refreshes enable row level security;

-- Policies: Users can only access calendars for their properties
create policy "Users view org agent calendars" on agent_calendars
  for select
  using (
    exists (
      select 1 from profiles pr
      join properties p on p.org_id = pr.org_id
      where pr.id = auth.uid() and p.id = agent_calendars.property_id
    )
  );

create policy "Users manage org agent calendars" on agent_calendars
  for all
  using (
    exists (
      select 1 from profiles pr
      join properties p on p.org_id = pr.org_id
      where pr.id = auth.uid() and p.id = agent_calendars.property_id
    )
  );

create policy "Users view org calendar events" on calendar_events
  for select
  using (
    exists (
      select 1 from agent_calendars ac
      join properties p on p.id = ac.property_id
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid() and ac.id = calendar_events.agent_calendar_id
    )
  );

create policy "System manage calendar events" on calendar_events
  for all
  using (true) -- Service role handles all event management
  with check (true);

create policy "Users view token refresh history" on calendar_token_refreshes
  for select
  using (
    exists (
      select 1 from agent_calendars ac
      join properties p on p.id = ac.property_id
      join profiles pr on pr.org_id = p.org_id
      where pr.id = auth.uid() and ac.id = calendar_token_refreshes.agent_calendar_id
    )
  );

-- Comments for documentation
comment on table agent_calendars is 'Google Calendar OAuth configuration per property manager';
comment on table calendar_events is 'Links tour_bookings to Google Calendar events for two-way sync';
comment on table calendar_token_refreshes is 'Audit log of OAuth token refresh attempts for diagnostics';
