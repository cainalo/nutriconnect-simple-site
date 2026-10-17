-- X1 — Diário de sintomas (para cruzar com o diário alimentar e levar à consulta).
-- A pessoa anota o que sentiu (lista fixa), a intensidade (leve, média, forte), quando e uma nota
-- curta. Mesmas regras do diário alimentar: só a pessoa escreve; ela e os profissionais com
-- acompanhamento ativo leem. As relações com a comida são calculadas no navegador.

create table public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  felt_at timestamptz not null default now(),
  symptom text not null check (symptom in (
    'estufamento', 'gases', 'azia', 'dor_barriga', 'enjoo', 'diarreia',
    'intestino_preso', 'dor_cabeca', 'cansaco', 'pele', 'sono_ruim', 'outro'
  )),
  intensity smallint not null check (intensity between 1 and 3),
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  -- Não vale anotar sintoma no futuro (tolerância de 5 min para relógios adiantados).
  check (felt_at <= created_at + interval '5 minutes')
);
create index symptom_logs_patient_idx on public.symptom_logs (patient_id, felt_at desc);

alter table public.symptom_logs enable row level security;

create policy "symptom_logs: leitura" on public.symptom_logs
  for select to authenticated using (patient_id = auth.uid() or public.has_active_link(patient_id));
create policy "symptom_logs: paciente gerencia" on public.symptom_logs
  for all to authenticated using (patient_id = auth.uid()) with check (patient_id = auth.uid());

grant select, insert, update, delete on public.symptom_logs to authenticated;
