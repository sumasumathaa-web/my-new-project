-- 0005_rsvp.sql — RSVP submissions for published customer invitations
create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  customization_id uuid not null references public.customizations(id) on delete cascade,
  guest_name text not null,
  attending text not null default 'yes' check (attending in ('yes','no','maybe')),
  guests int not null default 1 check (guests between 1 and 10),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rsvp_customization on public.rsvp_responses(customization_id);

alter table public.rsvp_responses enable row level security;

-- Anyone may RSVP to a published invitation.
create policy rsvp_public_insert on public.rsvp_responses for insert
  with check (
    exists (select 1 from public.customizations c where c.id = customization_id and c.status = 'published')
  );

-- Only the invitation owner (or admin) may read RSVPs.
create policy rsvp_owner_read on public.rsvp_responses for select
  using (
    exists (
      select 1 from public.customizations c
      where c.id = customization_id and (c.user_id = auth.uid() or public.is_admin())
    )
  );
