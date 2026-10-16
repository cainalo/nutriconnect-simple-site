-- Apoios, "preparei" e comentários dos perfis de exemplo, gerados de forma determinística.
insert into public.post_reactions (post_id, user_id, kind)
select p.id, u.id, 'apoiar'::reaction_kind
from public.posts p cross join public.profiles u
where p.id::text like '00000000-0000-4000-b000-%' and u.id::text like '00000000-0000-4000-a000-%'
  and u.id <> p.author_id and u.id <> '00000000-0000-4000-a000-000000000900'
  and abs(hashtext(p.id::text || u.id::text)) % 3 <> 0
on conflict do nothing;

insert into public.post_reactions (post_id, user_id, kind)
select p.id, u.id, 'preparei'::reaction_kind
from public.posts p cross join public.profiles u
where p.id::text like '00000000-0000-4000-b000-%' and p.type = 'receita'
  and u.id::text like '00000000-0000-4000-a000-%' and u.id <> p.author_id
  and u.id <> '00000000-0000-4000-a000-000000000900'
  and abs(hashtext(u.id::text || p.id::text)) % 3 = 0
on conflict do nothing;

insert into public.comments (id, post_id, author_id, body, created_at)
select md5('b100' || p.id::text || u.id::text)::uuid, p.id, u.id,
  (array['Adorei a ideia, vou testar!','Muito útil, obrigada por compartilhar.','Também passei por isso e funcionou para mim.','Boa dica! Alguém tem mais sugestões?'])[1 + abs(hashtext(u.id::text || p.id::text)) % 4],
  p.created_at + ((1 + abs(hashtext(p.id::text || u.id::text)) % 50) || ' minutes')::interval
from public.posts p cross join public.profiles u
where p.id::text like '00000000-0000-4000-b000-%' and u.id::text like '00000000-0000-4000-a000-%'
  and u.id <> p.author_id and u.id <> '00000000-0000-4000-a000-000000000900'
  and not public.is_suspended(u.id)
  and abs(hashtext('c' || p.id::text || u.id::text)) % 4 = 0
on conflict (id) do nothing;
