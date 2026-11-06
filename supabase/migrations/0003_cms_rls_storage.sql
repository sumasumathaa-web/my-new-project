-- ============================================================================
-- 0003_cms_rls_storage.sql — CMS tables, Row Level Security, storage buckets
-- ============================================================================

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body_md text not null default '',
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.themes enable row level security;
alter table public.quotes enable row level security;
alter table public.faqs enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.offer_banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.customizations enable row level security;
alter table public.website_revisions enable row level security;
alter table public.wishlists enable row level security;
alter table public.files enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.content_pages enable row level security;
alter table public.audit_logs enable row level security;

-- ------------------------- Identity tables ---------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());
-- Role grants/revocations happen via service role only (no anon write policy).

drop policy if exists roles_select_admin on public.roles;
create policy roles_select_admin on public.roles for select using (public.is_admin());
drop policy if exists permissions_select_admin on public.permissions;
create policy permissions_select_admin on public.permissions for select using (public.is_admin());
drop policy if exists role_permissions_select_admin on public.role_permissions;
create policy role_permissions_select_admin on public.role_permissions for select using (public.is_admin());

-- ------------------------- Public catalog ----------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select
  using (is_published = true or public.is_admin());
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select
  using (status = 'published' or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_media_public_read on public.product_media;
create policy product_media_public_read on public.product_media for select
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published') or public.is_admin());
drop policy if exists product_media_admin_write on public.product_media;
create policy product_media_admin_write on public.product_media for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists themes_public_read on public.themes;
create policy themes_public_read on public.themes for select
  using (is_published = true or public.is_admin());
drop policy if exists themes_admin_write on public.themes;
create policy themes_admin_write on public.themes for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists quotes_public_read on public.quotes;
create policy quotes_public_read on public.quotes for select
  using (is_published = true or public.is_admin());
drop policy if exists quotes_admin_write on public.quotes;
create policy quotes_admin_write on public.quotes for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read on public.faqs for select
  using (is_published = true or public.is_admin());
drop policy if exists faqs_admin_write on public.faqs;
create policy faqs_admin_write on public.faqs for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists pages_public_read on public.content_pages;
create policy pages_public_read on public.content_pages for select
  using (is_published = true or public.is_admin());
drop policy if exists pages_admin_write on public.content_pages;
create policy pages_admin_write on public.content_pages for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists offers_public_read on public.offer_banners;
create policy offers_public_read on public.offer_banners for select
  using (is_active = true or public.is_admin());
drop policy if exists offers_admin_write on public.offer_banners;
create policy offers_admin_write on public.offer_banners for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------- Coupons (server-validated only) ------------------
drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists coupon_usages_admin_all on public.coupon_usages;
create policy coupon_usages_admin_all on public.coupon_usages for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------- Orders & payments --------------------------------
drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
-- No anon insert/update policy: orders are created & transitioned by the server.

drop policy if exists order_items_owner_read on public.order_items;
create policy order_items_owner_read on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists history_owner_read on public.order_status_history;
create policy history_owner_read on public.order_status_history for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists payments_owner_read on public.payments;
create policy payments_owner_read on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists refunds_admin_read on public.refunds;
create policy refunds_admin_read on public.refunds for select using (public.is_admin());
drop policy if exists payment_events_admin_read on public.payment_events;
create policy payment_events_admin_read on public.payment_events for select using (public.is_admin());

-- ------------------------- Customer content --------------------------------
drop policy if exists customizations_owner_all on public.customizations;
create policy customizations_owner_all on public.customizations for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
-- Published invitations are public so invite guests can view /w/[slug].
drop policy if exists customizations_public_read on public.customizations;
create policy customizations_public_read on public.customizations for select
  using (status = 'published');

drop policy if exists revisions_owner_read on public.website_revisions;
create policy revisions_owner_read on public.website_revisions for select
  using (exists (select 1 from public.customizations c where c.id = customization_id and (c.user_id = auth.uid() or public.is_admin())));

drop policy if exists wishlists_owner_all on public.wishlists;
create policy wishlists_owner_all on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists files_owner_read on public.files;
create policy files_owner_read on public.files for select
  using (owner_user_id = auth.uid() or public.is_admin());

drop policy if exists tickets_owner_all on public.support_tickets;
create policy tickets_owner_all on public.support_tickets for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists messages_owner_all on public.support_messages;
create policy messages_owner_all on public.support_messages for all
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin())))
  with check (author_user_id = auth.uid() or public.is_admin());

drop policy if exists newsletter_insert on public.newsletter_subscribers;
create policy newsletter_insert on public.newsletter_subscribers for insert
  with check (consent = true);
drop policy if exists newsletter_admin_read on public.newsletter_subscribers;
create policy newsletter_admin_read on public.newsletter_subscribers for select using (public.is_admin());

-- Site settings are PUBLIC-SAFE configuration only (never store secrets here).
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select using (true);
drop policy if exists settings_admin_write on public.site_settings;
create policy settings_admin_write on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select using (public.is_admin());

-- ============================================================================
-- STORAGE (Supabase Storage buckets + object policies)
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('public-media', 'public-media', true),
  ('customer-uploads', 'customer-uploads', false),
  ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- Public media: world-readable; writes by admins only.
drop policy if exists storage_public_media_read on storage.objects;
create policy storage_public_media_read on storage.objects for select
  using (bucket_id = 'public-media');
drop policy if exists storage_public_media_write on storage.objects;
create policy storage_public_media_write on storage.objects for all
  using (bucket_id = 'public-media' and public.is_admin())
  with check (bucket_id = 'public-media' and public.is_admin());

-- Customer uploads: owner folder = first path segment == auth.uid()
drop policy if exists storage_customer_owner_rw on storage.objects;
create policy storage_customer_owner_rw on storage.objects for all
  using (
    bucket_id = 'customer-uploads'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'customer-uploads'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Deliverables: customer folder + admin
drop policy if exists storage_deliverables_owner_read on storage.objects;
create policy storage_deliverables_owner_read on storage.objects for select
  using (
    bucket_id = 'deliverables'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
drop policy if exists storage_deliverables_admin_write on storage.objects;
create policy storage_deliverables_admin_write on storage.objects for insert
  with check (bucket_id = 'deliverables' and public.is_admin());
drop policy if exists storage_deliverables_admin_update on storage.objects;
create policy storage_deliverables_admin_update on storage.objects for update
  using (bucket_id = 'deliverables' and public.is_admin());
