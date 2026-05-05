-- Coach 関連の入力サイズ制約
-- 用途: prompt injection / コスト爆発の防御を DB レベルでも担保する

-- coach_name: 1〜20文字 + 改行禁止
alter table public.users
  drop constraint if exists users_coach_name_length_check;
alter table public.users
  add constraint users_coach_name_length_check
  check (
    char_length(coach_name) between 1 and 20
    and coach_name !~ E'[\\n\\r]'
  );

-- coach_messages.content: 1〜4000文字
alter table public.coach_messages
  drop constraint if exists coach_messages_content_length_check;
alter table public.coach_messages
  add constraint coach_messages_content_length_check
  check (char_length(content) between 1 and 4000);
