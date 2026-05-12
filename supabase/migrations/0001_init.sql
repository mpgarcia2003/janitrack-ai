-- =============================================================================
-- JaniTrackAI — Initial schema
-- Paste this entire file into your Supabase project's SQL editor and run it.
-- (Or use `supabase db push` if you have the Supabase CLI configured.)
-- =============================================================================

-- ---------- Extensions ------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------- Helper: updated_at trigger --------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Helper: caller's tenant_id from JWT-bound profile ---------------
-- Wrapping this in a stable function (with empty search_path) keeps RLS
-- policies fast and avoids the well-known auth.uid() recursion problem.
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- Tenants ---------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  tagline text,
  contact_name text,
  contact_email text,
  contact_phone text,
  brand_color text default '#1B7A3D',
  company_name_color text default '#000000',
  settings jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- ---------- Profiles (1:1 with auth.users) ----------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  tenant_id uuid references public.tenants(id) on delete set null,
  user_role text default 'cleaner' check (
    user_role in ('tenant_owner', 'tenant_admin', 'client_admin', 'supervisor', 'cleaner', 'auditor')
  ),
  role text default 'user' check (role in ('user', 'admin')),
  active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create index profiles_tenant_id_idx on public.profiles(tenant_id);

-- Auto-create a profile row when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Subscription plans (global) -------------------------------------
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  price_monthly numeric default 0,
  price_yearly numeric default 0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  limits jsonb default '{}'::jsonb,
  features text[] default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger subscription_plans_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- ---------- Subscriptions (per-tenant) --------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text default 'trial' check (
    status in ('trial', 'active', 'past_due', 'canceled', 'paused')
  ),
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create unique index subscriptions_tenant_unique on public.subscriptions(tenant_id);
create index subscriptions_stripe_sub_idx on public.subscriptions(stripe_subscription_id);
create index subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);

-- ---------- Clients (facility locations) ------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  timezone text default 'America/New_York',
  contact_name text,
  contact_email text,
  contact_phone text,
  project_qr_token text unique,
  feedback_qr_token text unique,
  inventory_qr_token text unique,
  sheets_enabled boolean default false,
  sheet_id text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create index clients_tenant_idx on public.clients(tenant_id);

-- ---------- Areas (cleaning zones within a client) --------------------------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  location_desc text,
  qr_token text unique not null,
  risk_level text default 'normal' check (risk_level in ('normal', 'trouble')),
  cadence_minutes integer default 240,
  last_cleaned_at timestamptz,
  complaint_count integer default 0,
  latitude numeric,
  longitude numeric,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger areas_updated_at before update on public.areas
  for each row execute function public.set_updated_at();
create index areas_tenant_idx on public.areas(tenant_id);
create index areas_client_idx on public.areas(client_id);

-- ---------- Cleaning events -------------------------------------------------
create table public.cleaning_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  cleaner_id uuid references public.profiles(id) on delete set null,
  cleaner_name text not null,
  notes text,
  photo_url text,
  server_timestamp timestamptz not null default now(),
  device_timestamp timestamptz,
  timezone text default 'America/New_York',
  ip_address text,
  user_agent text,
  latitude numeric,
  longitude numeric,
  location_accuracy numeric,
  status text default 'completed' check (status in ('completed', 'flagged', 'verified')),
  created_at timestamptz default now()
);
create index cleaning_events_tenant_created_idx on public.cleaning_events(tenant_id, created_at desc);
create index cleaning_events_area_idx on public.cleaning_events(area_id);

-- ---------- Feedback --------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  submitted_by_name text,
  submitted_by_email text,
  ip_address text,
  user_agent text,
  feedback_timestamp timestamptz not null default now(),
  created_at timestamptz default now()
);
create index feedback_tenant_idx on public.feedback(tenant_id, feedback_timestamp desc);
create index feedback_client_idx on public.feedback(client_id);

-- ---------- Inventory -------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sku text not null,
  name text not null,
  category text default 'cleaning_supplies' check (
    category in ('cleaning_supplies', 'paper_products', 'chemicals', 'equipment', 'other')
  ),
  unit text default 'ea' check (unit in ('ea', 'roll', 'bottle', 'case', 'gallon', 'box')),
  par_level numeric,
  on_hand numeric default 0,
  reorder_point numeric,
  vendor text,
  vendor_sku text,
  unit_cost numeric,
  last_count_at timestamptz,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger inventory_items_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();
create index inventory_items_tenant_idx on public.inventory_items(tenant_id);
create index inventory_items_client_idx on public.inventory_items(client_id);

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  inventory_id uuid not null references public.inventory_items(id) on delete cascade,
  counted_by_id uuid references public.profiles(id) on delete set null,
  counted_by_name text not null,
  quantity numeric not null,
  previous_quantity numeric,
  photo_url text,
  notes text,
  ip_address text,
  count_timestamp timestamptz not null default now(),
  created_at timestamptz default now()
);
create index inventory_counts_tenant_idx on public.inventory_counts(tenant_id, count_timestamp desc);
create index inventory_counts_item_idx on public.inventory_counts(inventory_id);

create table public.inventory_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  inventory_id uuid not null references public.inventory_items(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  used_by_id uuid references public.profiles(id) on delete set null,
  used_by_name text not null,
  quantity numeric not null,
  note text,
  usage_timestamp timestamptz not null default now(),
  created_at timestamptz default now()
);
create index inventory_usage_tenant_idx on public.inventory_usage(tenant_id, usage_timestamp desc);
create index inventory_usage_item_idx on public.inventory_usage(inventory_id);

-- ---------- Projects / Tasks ------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open' check (
    status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')
  ),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_to_id uuid references public.profiles(id) on delete set null,
  assigned_to_name text,
  estimated_hours numeric,
  actual_hours numeric,
  file_urls text[],
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create index projects_tenant_idx on public.projects(tenant_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assigned_to_id uuid references public.profiles(id) on delete set null,
  assigned_to_name text,
  checklist jsonb default '[]'::jsonb,
  due_date date,
  file_urls text[],
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create index tasks_tenant_idx on public.tasks(tenant_id);

-- ---------- Audit log -------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamptz not null default now()
);
create index audit_logs_tenant_idx on public.audit_logs(tenant_id, timestamp desc);

-- ---------- Usage metrics ---------------------------------------------------
create table public.usage_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index usage_metrics_tenant_idx on public.usage_metrics(tenant_id, period_start desc);

-- ---------- Processed Stripe events (webhook idempotency) -------------------
create table public.processed_stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- All tables get RLS enabled. The pattern:
--   - Reads/writes within the user's tenant via current_tenant_id()
--   - Public reads of subscription_plans (so the landing page can show pricing)
--   - server-only tables (processed_stripe_events) have NO policies -> blocked
-- The server-side API routes use the service_role key, which bypasses RLS.
-- =============================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.clients enable row level security;
alter table public.areas enable row level security;
alter table public.cleaning_events enable row level security;
alter table public.feedback enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_usage enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_metrics enable row level security;
alter table public.processed_stripe_events enable row level security;

-- --- profiles ---
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: same-tenant read" on public.profiles
  for select using (
    tenant_id is not null and tenant_id = public.current_tenant_id()
  );
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid());
create policy "profiles: self insert" on public.profiles
  for insert with check (id = auth.uid());

-- --- tenants ---
create policy "tenants: read own" on public.tenants
  for select using (id = public.current_tenant_id());
create policy "tenants: owner update" on public.tenants
  for update using (
    id = public.current_tenant_id() and public.current_role() in ('admin')
    or id = public.current_tenant_id() and exists (
      select 1 from public.profiles where id = auth.uid() and user_role = 'tenant_owner'
    )
  );
create policy "tenants: any authenticated insert" on public.tenants
  for insert with check (auth.uid() is not null);

-- --- subscription_plans (publicly readable) ---
create policy "subscription_plans: anyone read" on public.subscription_plans
  for select using (true);

-- --- subscriptions ---
create policy "subscriptions: tenant read" on public.subscriptions
  for select using (tenant_id = public.current_tenant_id());
-- writes happen server-side via service role

-- --- clients ---
create policy "clients: tenant CRUD" on public.clients
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- --- areas ---
create policy "areas: tenant CRUD" on public.areas
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- --- cleaning_events (most writes go through API routes / service role) ---
create policy "cleaning_events: tenant read" on public.cleaning_events
  for select using (tenant_id = public.current_tenant_id());
create policy "cleaning_events: tenant insert" on public.cleaning_events
  for insert with check (tenant_id = public.current_tenant_id());

-- --- feedback ---
create policy "feedback: tenant read" on public.feedback
  for select using (tenant_id = public.current_tenant_id());

-- --- inventory_items / counts / usage ---
create policy "inventory_items: tenant CRUD" on public.inventory_items
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
create policy "inventory_counts: tenant CRUD" on public.inventory_counts
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
create policy "inventory_usage: tenant CRUD" on public.inventory_usage
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- --- projects / tasks ---
create policy "projects: tenant CRUD" on public.projects
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
create policy "tasks: tenant CRUD" on public.tasks
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- --- audit_logs ---
create policy "audit_logs: tenant read" on public.audit_logs
  for select using (tenant_id = public.current_tenant_id());

-- --- usage_metrics ---
create policy "usage_metrics: tenant read" on public.usage_metrics
  for select using (tenant_id = public.current_tenant_id());

-- processed_stripe_events: NO policies => no anon access; server-only.

-- =============================================================================
-- Seed: default Free subscription plan (required by signup flow)
-- =============================================================================

insert into public.subscription_plans (name, slug, price_monthly, price_yearly, limits, features, active)
values (
  'Free',
  'free',
  0,
  0,
  '{"max_clients":1,"max_areas":10,"max_users":3,"max_projects":5,"max_inventory_items":25}'::jsonb,
  array['QR check-ins', 'Customer feedback', 'Basic inventory', '14-day trial of paid features'],
  true
)
on conflict (slug) do nothing;

insert into public.subscription_plans (name, slug, price_monthly, price_yearly, limits, features, active)
values (
  'Pro',
  'pro',
  49,
  490,
  '{"max_clients":null,"max_areas":null,"max_users":null,"max_projects":null,"max_inventory_items":null}'::jsonb,
  array['Unlimited everything', 'Branded QR printouts', 'CSV exports', 'Email + SMS escalation'],
  true
)
on conflict (slug) do nothing;

-- =============================================================================
-- Storage bucket for user uploads (logos, cleaning photos, etc.)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Allow any authenticated user to upload to the uploads bucket.
create policy "uploads: auth users can insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads');

create policy "uploads: anyone can read"
  on storage.objects for select to public
  using (bucket_id = 'uploads');

create policy "uploads: owners can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid());
