-- ============================================================================
-- 0001_core.sql — Identity, roles, catalog schema
-- Wedding Invitation Platform — run in Supabase SQL editor or `supabase db push`
-- ============================================================================

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------- RBAC --------------------------------------
create table if not exists public.roles (
  id text primary key check (id in ('admin','editor','support','customer'))
);

insert into public.roles (id) values ('admin'), ('editor'), ('support'), ('customer')
on conflict (id) do nothing;

create table if not exists public.permissions (
  id text primary key,
  description text
);

insert into public.permissions (id, description) values
  ('catalog.manage','Create and edit products, categories, themes'),
  ('orders.manage','View and update orders'),
  ('customers.manage','View customers'),
  ('settings.manage','Edit branding and site settings'),
  ('offers.manage','Manage coupons and offers'),
  ('content.manage','Manage quotes, pages, FAQs')
on conflict (id) do nothing;

create table if not exists public.role_permissions (
  role text references public.roles(id) on delete cascade,
  permission text references public.permissions(id) on delete cascade,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission)
select 'admin', id from public.permissions
on conflict do nothing;
insert into public.role_permissions (role, permission)
select 'editor', id from public.permissions where id in ('catalog.manage','content.manage')
on conflict do nothing;
insert into public.role_permissions (role, permission)
select 'support', id from public.permissions where id in ('orders.manage','customers.manage')
on conflict do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Helper: current-user admin check (SECURITY DEFINER avoids RLS recursion).
-- Defined AFTER user_roles exists (SQL-language functions are validated at creation).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;

create or replace function public.has_role(r text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r) $$;

-- New user bootstrap: profile + customer role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------ Catalog ------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  kind text not null default 'other' check (kind in ('video','website','card','quote','service','other')),
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null default 'other' check (kind in ('video','website','card','quote','service','other')),
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  description text,
  long_description text,
  thumbnail_path text,
  preview_video_path text,
  demo_url text,
  price_original numeric(12,2) not null default 0 check (price_original >= 0),
  price_selling numeric(12,2) not null default 0 check (price_selling >= 0),
  price_sale numeric(12,2) check (price_sale is null or price_sale >= 0),
  customization_fee numeric(12,2) not null default 0 check (customization_fee >= 0),
  extra_revision_fee numeric(12,2) not null default 0 check (extra_revision_fee >= 0),
  tax_rate numeric(5,2) check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  customization_enabled boolean not null default false,
  customization_schema jsonb not null default '[]'::jsonb,
  service_addons jsonb not null default '[]'::jsonb,
  related_ids uuid[] not null default '{}',
  delivery_estimate text,
  revision_policy text,
  license_terms text,
  status text not null default 'draft' check (status in ('draft','published','archived','unavailable')),
  is_featured boolean not null default false,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','video')),
  path text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  preview_image_path text,
  demo_url text,
  price numeric(12,2) check (price is null or price >= 0),
  tags text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  text_ta text,
  author text,
  category text not null default 'wedding',
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------ Indexes -------------------------------------
create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_categories_kind on public.categories(kind);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_featured on public.products(is_featured) where is_featured = true;
create index if not exists idx_products_kind_status on public.products(kind, status);
create index if not exists idx_products_created on public.products(created_at desc);
create index if not exists idx_product_media_product on public.product_media(product_id);
create index if not exists idx_themes_slug on public.themes(slug);
create index if not exists idx_quotes_category on public.quotes(category);

-- --------------------------- updated_at triggers ----------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','products','themes'] loop
    execute format('drop trigger if exists trg_%I_updated on public.%I;', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I
                    for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;
