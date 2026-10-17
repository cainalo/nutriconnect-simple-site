-- T1 — Hábitos do dia: em vez de 4 hábitos fixos, um catálogo de 12; cada pessoa escolhe de 3 a 8
-- (user_settings.habit_choice, vale em todos os aparelhos). Sem escolha, o app usa os 4 de antes.

alter table public.daily_checkins drop constraint if exists daily_checkins_habits_check;
alter table public.daily_checkins add constraint daily_checkins_habits_check
  check (habits <@ array[
    'water', 'veg', 'move', 'sleep', 'fruit', 'beans', 'breakfast', 'homemade', 'slow',
    'no_soda', 'outdoor', 'planned'
  ]::text[]);

alter table public.user_settings
  add column if not exists habit_choice text[]
    check (
      habit_choice is null or (
        cardinality(habit_choice) between 3 and 8
        and habit_choice <@ array[
          'water', 'veg', 'move', 'sleep', 'fruit', 'beans', 'breakfast', 'homemade', 'slow',
          'no_soda', 'outdoor', 'planned'
        ]::text[]
      )
    );
