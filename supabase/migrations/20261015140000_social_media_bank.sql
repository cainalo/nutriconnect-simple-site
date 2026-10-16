-- Banco de imagens da equipe no estúdio de redes sociais (S2).
--   * social-media: bucket público (as artes usam a URL pública, que funciona sem política de leitura);
--     só administradores da plataforma listam, enviam e apagam. Listar fica restrito aos admins para
--     não expor o conteúdo do bucket inteiro (aviso public_bucket_allows_listing do Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('social-media', 'social-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "social-media: admins listam" on storage.objects
  for select to authenticated using (bucket_id = 'social-media' and public.is_platform_admin());
create policy "social-media: admins enviam" on storage.objects
  for insert to authenticated with check (bucket_id = 'social-media' and public.is_platform_admin());
create policy "social-media: admins apagam" on storage.objects
  for delete to authenticated using (bucket_id = 'social-media' and public.is_platform_admin());
