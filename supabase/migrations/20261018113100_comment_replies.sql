-- Respostas em fio nos comentários (um nível só).
-- reply_to aponta para outro comentário do MESMO post; responder a uma resposta
-- vira resposta ao comentário de origem. Quem foi respondido recebe um aviso.

alter table public.comments
  add column if not exists reply_to uuid references public.comments(id) on delete cascade;

create index if not exists comments_reply_idx on public.comments (reply_to) where reply_to is not null;

create or replace function public.check_comment_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent public.comments;
begin
  if new.reply_to is null then
    return new;
  end if;
  select * into parent from public.comments where id = new.reply_to;
  if parent.id is null or parent.post_id <> new.post_id then
    raise exception 'Resposta a um comentário que não é deste post.';
  end if;
  if parent.reply_to is not null then
    new.reply_to := parent.reply_to;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_reply_check on public.comments;
create trigger comments_reply_check before insert on public.comments
  for each row execute function public.check_comment_reply();

-- Aviso para quem escreveu o comentário respondido (o dono do post já recebe o aviso de comentário).
create or replace function public.trg_notify_comment_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent public.comments;
  p public.posts;
begin
  if new.reply_to is null then
    return new;
  end if;
  select * into parent from public.comments where id = new.reply_to;
  select * into p from public.posts where id = new.post_id;
  if parent.author_id is distinct from p.author_id then
    perform public.notify(parent.author_id, 'comentario', new.author_id, 'post', p.id::text,
      jsonb_build_object('comment', left(new.body, 120), 'title', coalesce(p.title, left(p.body, 80)),
                         'reply', true));
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify_reply on public.comments;
create trigger comments_notify_reply after insert on public.comments
  for each row execute function public.trg_notify_comment_reply();

revoke execute on function public.check_comment_reply() from public, anon, authenticated;
revoke execute on function public.trg_notify_comment_reply() from public, anon, authenticated;
