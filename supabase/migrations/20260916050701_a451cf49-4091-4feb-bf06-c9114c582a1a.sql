create type public.app_role as enum ('admin','employee');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, case when lower(new.email) = 'abdu.madridy@gmail.com' then 'admin'::public.app_role else 'employee'::public.app_role end)
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.settings (
  id boolean primary key default true check (id),
  price_per_row numeric not null default 0,
  place_a_capacity int not null default 32,
  place_b_capacity int not null default 48,
  place_a_sellable int not null default 28,
  place_b_sellable int not null default 42,
  updated_at timestamptz not null default now()
);
grant select on public.settings to authenticated;
grant update, insert on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings readable" on public.settings for select to authenticated using (true);
create policy "admin updates settings" on public.settings for update to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.settings (id) values (true);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  rows_count int not null check (rows_count > 0),
  place text not null check (place in ('a','b')),
  paid boolean not null default false,
  emergency boolean not null default false,
  price_per_row numeric not null default 0,
  total_iqd numeric generated always as (rows_count * price_per_row) stored,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "sales readable by signed in" on public.sales for select to authenticated using (true);
create policy "insert own sales" on public.sales for insert to authenticated with check (created_by = auth.uid());
create policy "update own sales or admin" on public.sales for update to authenticated
using (created_by = auth.uid() or public.has_role(auth.uid(),'admin'))
with check (created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "delete own sales or admin" on public.sales for delete to authenticated
using (created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create index sales_created_at_idx on public.sales (created_at);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title_ku text not null,
  title_ar text not null,
  sort_order int not null default 0
);
grant select on public.checklist_items to authenticated;
grant all on public.checklist_items to service_role;
alter table public.checklist_items enable row level security;
create policy "checklist items readable" on public.checklist_items for select to authenticated using (true);
insert into public.checklist_items (key, title_ku, title_ar, sort_order) values
 ('oil_mixers','ڕۆنکردنی میکسەرەکان','تزييت الخلاطات',1),
 ('oil_crane','ڕۆنکردنی کرێن','تزييت الرافعة',2),
 ('deoil_salons','ڕۆن لابردن لە سالۆنەکان','إزالة الزيت من الصالات',3);

create table public.checklist_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.checklist_items(id) on delete cascade,
  week_start date not null,
  done_by uuid not null default auth.uid(),
  done_at timestamptz not null default now(),
  unique (item_id, week_start)
);
grant select, insert, delete on public.checklist_completions to authenticated;
grant all on public.checklist_completions to service_role;
alter table public.checklist_completions enable row level security;
create policy "completions readable" on public.checklist_completions for select to authenticated using (true);
create policy "insert own completion" on public.checklist_completions for insert to authenticated with check (done_by = auth.uid());
create policy "delete own completion or admin" on public.checklist_completions for delete to authenticated
using (done_by = auth.uid() or public.has_role(auth.uid(),'admin'));