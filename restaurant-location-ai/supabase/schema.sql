-- ============================================================
-- Restaurant Site Selection — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- ============================================================

-- Locations table
create table if not exists public.locations (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  address          text not null,
  city             text not null,
  state            text,
  lat              numeric(10, 7) not null,
  lng              numeric(10, 7) not null,
  status           text default 'candidate'
                     check (status in ('candidate', 'under_review', 'active', 'rejected')),
  -- Scoring dimensions (0-100)
  foot_traffic_score   integer default 50 check (foot_traffic_score  between 0 and 100),
  competition_score    integer default 50 check (competition_score   between 0 and 100),
  demographics_score   integer default 50 check (demographics_score  between 0 and 100),
  accessibility_score  integer default 50 check (accessibility_score between 0 and 100),
  rent_score           integer default 50 check (rent_score          between 0 and 100),
  -- Meta
  monthly_rent     numeric(10, 2),
  square_footage   integer,
  parking_spaces   integer,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- Surveys table
create table if not exists public.surveys (
  id                uuid default gen_random_uuid() primary key,
  location_id       uuid references public.locations(id) on delete set null,
  respondent_name   text,
  respondent_email  text,
  age_group         text check (age_group in ('18-24','25-34','35-44','45-54','55-64','65+')),
  income_level      text check (income_level in ('under_30k','30k_50k','50k_75k','75k_100k','over_100k')),
  visit_frequency   text check (visit_frequency in ('daily','weekly','monthly','rarely')),
  preferred_cuisine text,
  location_rating   integer check (location_rating between 1 and 5),
  would_visit       boolean,
  travel_distance   text check (travel_distance in ('0_1mi','1_3mi','3_5mi','5_10mi','over_10mi')),
  comments          text,
  created_at        timestamptz default now()
);

-- Row Level Security
alter table public.locations enable row level security;
alter table public.surveys   enable row level security;

-- Open policies for demo (tighten for production)
create policy "locations_select" on public.locations for select using (true);
create policy "locations_insert" on public.locations for insert with check (true);
create policy "locations_update" on public.locations for update using (true);
create policy "locations_delete" on public.locations for delete using (true);

create policy "surveys_select" on public.surveys for select using (true);
create policy "surveys_insert" on public.surveys for insert with check (true);
create policy "surveys_update" on public.surveys for update using (true);
create policy "surveys_delete" on public.surveys for delete using (true);

-- ============================================================
-- Sample seed data (Austin, TX)
-- ============================================================
insert into public.locations (name, address, city, state, lat, lng, status, foot_traffic_score, competition_score, demographics_score, accessibility_score, rent_score, monthly_rent, square_footage, parking_spaces, notes)
values
  ('Downtown Corner Spot',   '123 Main St',         'Austin', 'TX', 30.2672, -97.7431, 'candidate',    88, 62, 75, 90, 55, 8500,  2400, 20, 'High foot traffic from office workers.'),
  ('Riverside Promenade',    '456 River Walk Blvd', 'Austin', 'TX', 30.2559, -97.7506, 'under_review', 72, 45, 83, 68, 70, 6200,  1900, 35, 'Great weekend traffic. Families and tourists.'),
  ('East Side Hub',          '789 E 6th St',        'Austin', 'TX', 30.2595, -97.7251, 'candidate',    65, 80, 71, 60, 85, 4800,  1600, 12, 'Emerging neighborhood, lower competition.'),
  ('South Congress Prime',   '321 S Congress Ave',  'Austin', 'TX', 30.2448, -97.7503, 'active',       95, 38, 90, 85, 40, 12000, 3100, 45, 'Premium SoCo location. Highest foot traffic.'),
  ('North Loop Neighborhood','654 N Loop Blvd',     'Austin', 'TX', 30.3082, -97.7231, 'candidate',    50, 90, 62, 72, 92, 3600,  1400, 18, 'Low competition, suburban, low rent.');
