-- P1 — Avaliações verificadas dos profissionais (marketplace de consultas).
-- Só quem teve a consulta avalia: uma avaliação por consulta, de 1 a 5 estrelas, com comentário
-- opcional, até 90 dias depois do fim da consulta. A pessoa pode editar ou apagar a sua; o
-- profissional responde uma vez (pode editar a resposta); a administração oculta o que fere as
-- diretrizes. A lista pública mostra só o primeiro nome (ou "anônimo", se a pessoa pedir).

create table public.professional_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  professional_id uuid not null references public.professionals (user_id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 600),
  anonymous boolean not null default false,
  reply text check (reply is null or length(reply) <= 600),
  replied_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index professional_reviews_pro_idx on public.professional_reviews (professional_id, created_at desc);
create index professional_reviews_patient_idx on public.professional_reviews (patient_id);
create trigger professional_reviews_updated_at before update on public.professional_reviews
  for each row execute function public.set_updated_at();

alter table public.professional_reviews enable row level security;

-- Leitura direta só para as partes e a administração; o público usa as funções abaixo.
create policy "professional_reviews: partes e admin leem" on public.professional_reviews
  for select to authenticated using (
    patient_id = auth.uid() or professional_id = auth.uid() or public.is_platform_admin()
  );
create policy "professional_reviews: autor apaga a sua" on public.professional_reviews
  for delete to authenticated using (patient_id = auth.uid());
-- Sem insert/update direto: tudo passa pelas funções (que conferem a consulta).

/** Consulta que já pode ser avaliada pela pessoa logada. */
create or replace function public.can_review_appointment(p_appointment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appointments a
     where a.id = p_appointment
       and a.patient_id = auth.uid()
       and (a.status = 'realizada' or (a.status in ('agendada', 'confirmada') and a.ends_at < now()))
       and a.ends_at > now() - interval '90 days'
  );
$$;
revoke execute on function public.can_review_appointment(uuid) from public, anon;
grant execute on function public.can_review_appointment(uuid) to authenticated;

/** Grava (ou edita) a avaliação da consulta. Avisa o profissional na primeira vez. */
create or replace function public.submit_professional_review(
  p_appointment uuid, p_rating integer, p_comment text default null, p_anonymous boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pro uuid;
  v_id uuid;
  v_new boolean;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if not public.can_review_appointment(p_appointment) then
    raise exception 'Esta consulta não pode ser avaliada.' using errcode = '42501';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Nota inválida.' using errcode = '22023';
  end if;
  select professional_id into v_pro from public.appointments where id = p_appointment;
  v_new := not exists (select 1 from public.professional_reviews where appointment_id = p_appointment);

  insert into public.professional_reviews (appointment_id, professional_id, patient_id, rating, comment, anonymous)
  values (p_appointment, v_pro, auth.uid(), p_rating, left(v_comment, 600), coalesce(p_anonymous, false))
  on conflict (appointment_id) do update
    set rating = excluded.rating, comment = excluded.comment, anonymous = excluded.anonymous
  returning id into v_id;

  if v_new then
    perform public.notify(
      v_pro, 'consulta_avaliada',
      case when coalesce(p_anonymous, false) then null else auth.uid() end,
      'review', v_id::text, jsonb_build_object('rating', p_rating)
    );
  end if;
  return v_id;
end;
$$;
revoke execute on function public.submit_professional_review(uuid, integer, text, boolean) from public, anon;
grant execute on function public.submit_professional_review(uuid, integer, text, boolean) to authenticated;

/** Resposta do profissional (vazia apaga a resposta). */
create or replace function public.reply_professional_review(p_review uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  update public.professional_reviews
     set reply = left(v_reply, 600), replied_at = case when v_reply is null then null else now() end
   where id = p_review and professional_id = auth.uid();
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.reply_professional_review(uuid, text) from public, anon;
grant execute on function public.reply_professional_review(uuid, text) to authenticated;

/** Administração oculta ou mostra uma avaliação. */
create or replace function public.admin_set_review_hidden(p_review uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
  update public.professional_reviews set hidden = p_hidden where id = p_review;
end;
$$;
revoke execute on function public.admin_set_review_hidden(uuid, boolean) from public, anon;
grant execute on function public.admin_set_review_hidden(uuid, boolean) to authenticated;

/** Média e total de avaliações visíveis de cada profissional (para a busca e o perfil). */
create or replace function public.professional_rating_summaries()
returns table (professional_id uuid, average numeric, total integer,
               r1 integer, r2 integer, r3 integer, r4 integer, r5 integer)
language sql stable security definer set search_path = public as $$
  select r.professional_id,
         round(avg(r.rating)::numeric, 1),
         count(*)::integer,
         count(*) filter (where r.rating = 1)::integer,
         count(*) filter (where r.rating = 2)::integer,
         count(*) filter (where r.rating = 3)::integer,
         count(*) filter (where r.rating = 4)::integer,
         count(*) filter (where r.rating = 5)::integer
    from public.professional_reviews r
   where not r.hidden
   group by r.professional_id;
$$;
grant execute on function public.professional_rating_summaries() to anon, authenticated;

/** Avaliações visíveis de um profissional, mais novas primeiro, com o primeiro nome do autor. */
create or replace function public.list_professional_reviews(
  p_professional uuid, p_limit integer default 20, p_offset integer default 0
)
returns table (id uuid, rating smallint, comment text, reply text, replied_at timestamptz,
               created_at timestamptz, author_name text, author_avatar text, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, r.reply, r.replied_at, r.created_at,
         case when r.anonymous then null else split_part(btrim(p.name), ' ', 1) end,
         case when r.anonymous then null else p.avatar_url end,
         r.patient_id = auth.uid()
    from public.professional_reviews r
    join public.profiles p on p.id = r.patient_id
   where r.professional_id = p_professional
     and (not r.hidden or r.patient_id = auth.uid() or r.professional_id = auth.uid()
          or public.is_platform_admin())
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function public.list_professional_reviews(uuid, integer, integer) to anon, authenticated;
