-- 目標到達期限。任意項目（未設定なら期限なしのまま運用）
-- 目的: コーチが「目標達成までの残日数」「必要な週間ペース」を踏まえてアドバイスできるようにする

alter table public.users
  add column if not exists goal_target_date date;
