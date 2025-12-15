-- Add property_units table for storing property's own floorplan and pricing data
-- This mirrors competitor_units but for the property itself

create table if not exists property_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  
  -- Unit details
  unit_type text not null, -- "Studio", "1BR-A", "2BR Deluxe"
  bedrooms int not null default 0,
  bathrooms numeric(3,1) default 1.0,
  
  -- Size
  sqft_min int,
  sqft_max int,
  
  -- Pricing
  rent_min numeric(10,2),
  rent_max numeric(10,2),
  deposit numeric(10,2),
  
  -- Availability
  available_count int default 0,
  move_in_specials text,
  
  -- Metadata
  last_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  
  -- Source tracking
  source text default 'manual', -- 'manual', 'scraped', 'pms_integration'
  source_url text
);

create index if not exists idx_property_units_property on property_units(property_id);
create index if not exists idx_property_units_bedrooms on property_units(bedrooms);
create index if not exists idx_property_units_updated on property_units(last_updated_at);

-- Enable RLS
alter table property_units enable row level security;

-- Policy: Users can view units for properties in their org
create policy "Users can view property units in their org"
  on property_units for select
  using (
    exists (
      select 1 from properties p
      inner join profiles pr on pr.org_id = p.org_id
      where p.id = property_units.property_id
      and pr.id = auth.uid()
    )
  );

-- Policy: Users can manage units for properties in their org
create policy "Users can manage property units in their org"
  on property_units for all
  using (
    exists (
      select 1 from properties p
      inner join profiles pr on pr.org_id = p.org_id
      where p.id = property_units.property_id
      and pr.id = auth.uid()
    )
  );

-- Optional: Price history tracking
create table if not exists property_price_history (
  id uuid primary key default gen_random_uuid(),
  property_unit_id uuid references property_units(id) on delete cascade,
  
  rent_min numeric(10,2),
  rent_max numeric(10,2),
  available_count int,
  
  recorded_at timestamptz default now(),
  source text default 'scraper'
);

create index if not exists idx_property_price_history_unit on property_price_history(property_unit_id);
create index if not exists idx_property_price_history_date on property_price_history(recorded_at);

-- Enable RLS
alter table property_price_history enable row level security;

-- Policy: Users can view price history for properties in their org
create policy "Users can view property price history in their org"
  on property_price_history for select
  using (
    exists (
      select 1 from property_units pu
      inner join properties p on p.id = pu.property_id
      inner join profiles pr on pr.org_id = p.org_id
      where pu.id = property_price_history.property_unit_id
      and pr.id = auth.uid()
    )
  );

