-- ============================================================================
-- 0002_commerce.sql — Coupons, offers, orders, payments, customer content
-- ============================================================================

-- ------------------------------ Coupons ------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(12,2) not null check (value >= 0),
  min_purchase numeric(12,2) not null default 0 check (min_purchase >= 0),
  max_discount numeric(12,2) check (max_discount is null or max_discount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit >= 0),
  per_user_limit int not null default 1,
  first_order_only boolean not null default false,
  applies_to text not null default 'all' check (applies_to in ('all','product','category')),
  product_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid,
  discount_amount numeric(12,2) not null default 0,
  used_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

-- Promotional banners (announcement bar / hero strips / content banners)
create table if not exists public.offer_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_label text,
  cta_url text,
  image_path text,
  coupon_code text,
  placement text not null default 'banner' check (placement in ('announcement','hero_strip','banner')),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------ Orders -------------------------------------
create sequence if not exists public.wip_order_seq start 1;

create or replace function public.next_order_number()
returns text language plpgsql as $$
begin
  return 'WIP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.wip_order_seq')::text, 6, '0');
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.next_order_number(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  phone text,
  customer jsonb not null default '{}'::jsonb,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','in_progress','awaiting_info','ready_for_review','delivered','cancelled','refunded')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded','partially_refunded')),
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  coupon_code text,
  currency text not null default 'INR',
  notes_internal text,
  notes_customer text,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  kind text not null default 'other',
  unit_price numeric(12,2) not null default 0,
  quantity int not null default 1 check (quantity > 0),
  addons_total numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  total numeric(12,2) not null default 0,
  options jsonb not null default '{}'::jsonb,
  deliverable_path text,
  customization_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);

-- ------------------------------ Payments -----------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay','manual')),
  provider_order_id text,
  provider_payment_id text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created','captured','failed','refunded','partially_refunded')),
  method text,
  signature_verified boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_payments_provider_payment_id
  on public.payments(provider_payment_id) where provider_payment_id is not null;

-- Webhook idempotency: one row per provider event id
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text not null unique,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  provider_refund_id text,
  reason text,
  status text not null default 'recorded',
  created_by uuid,
  created_at timestamptz not null default now()
);

-- -------------------------- Customer content -------------------------------
create table if not exists public.customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  title text not null default 'My Invitation',
  slug text not null unique,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version int not null default 1,
  order_id uuid references public.orders(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_revisions (
  id uuid primary key default gen_random_uuid(),
  customization_id uuid not null references public.customizations(id) on delete cascade,
  version int not null,
  config jsonb not null,
  saved_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- File metadata for Supabase Storage objects
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  kind text,
  mime text,
  size_bytes bigint,
  is_public boolean not null default false,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid not null,
  author_role text not null default 'customer',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------ Indexes -------------------------------------
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupon_usages_coupon on public.coupon_usages(coupon_id);
create index if not exists idx_coupon_usages_user on public.coupon_usages(user_id);
create index if not exists idx_coupon_usages_order on public.coupon_usages(order_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_placed on public.orders(placed_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_customizations_user on public.customizations(user_id);
create index if not exists idx_customizations_slug on public.customizations(slug);
create index if not exists idx_customizations_published on public.customizations(status) where status = 'published';
create index if not exists idx_revisions_customization on public.website_revisions(customization_id);
create index if not exists idx_files_owner on public.files(owner_user_id);
create index if not exists idx_files_order on public.files(order_id);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);

drop trigger if exists trg_coupons_updated on public.coupons;
create trigger trg_coupons_updated before update on public.coupons
  for each row execute function public.set_updated_at();
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
drop trigger if exists trg_customizations_updated on public.customizations;
create trigger trg_customizations_updated before update on public.customizations
  for each row execute function public.set_updated_at();
drop trigger if exists trg_support_tickets_updated on public.support_tickets;
create trigger trg_support_tickets_updated before update on public.support_tickets
  for each row execute function public.set_updated_at();
