-- 代表食品キュレーション（80件）
--
-- 文科省「日本食品標準成分表(八訂)」の食品名は学術的で長いので、
-- よく食べる食品に対して人にやさしい表示名 (display_name) を付け、
-- 検索結果で優先表示される is_common フラグを立てる。
--
-- 前提: scripts/seed-foods.ts で foods テーブルにデータが入っていること。
-- 前提: foods に is_common / display_name カラムが追加されていること。
--       （docs/database.md「既存環境向けマイグレーション」参照）

-- いったん全件 false にしてから対象だけ true に塗り直す（再実行可能にする）
update public.foods set is_common = false, display_name = null;

-- 主食
update public.foods set is_common = true, display_name = '白米ごはん'         where food_code = '01088';
update public.foods set is_common = true, display_name = '玄米ごはん'         where food_code = '01085';
update public.foods set is_common = true, display_name = '食パン'             where food_code = '01026';
update public.foods set is_common = true, display_name = 'クロワッサン'       where food_code = '01209';
update public.foods set is_common = true, display_name = 'うどん（ゆで）'     where food_code = '01039';
update public.foods set is_common = true, display_name = 'そうめん（ゆで）'   where food_code = '01044';
update public.foods set is_common = true, display_name = 'そば（ゆで）'       where food_code = '01128';
update public.foods set is_common = true, display_name = '中華めん（ゆで）'   where food_code = '01048';
update public.foods set is_common = true, display_name = 'パスタ（ゆで）'     where food_code = '01064';

-- いも
update public.foods set is_common = true, display_name = 'じゃがいも'         where food_code = '02063';
update public.foods set is_common = true, display_name = 'さつまいも'         where food_code = '02045';

-- 卵・乳
update public.foods set is_common = true, display_name = '卵（生）'           where food_code = '12004';
update public.foods set is_common = true, display_name = 'ゆで卵'             where food_code = '12005';
update public.foods set is_common = true, display_name = '目玉焼き'           where food_code = '12021';
update public.foods set is_common = true, display_name = '厚焼き卵'           where food_code = '12018';
update public.foods set is_common = true, display_name = '牛乳'               where food_code = '13003';
update public.foods set is_common = true, display_name = 'プロセスチーズ'     where food_code = '13040';
update public.foods set is_common = true, display_name = 'ヨーグルト（無糖）' where food_code = '13025';
update public.foods set is_common = true, display_name = 'バター'             where food_code = '14017';

-- 鶏肉
update public.foods set is_common = true, display_name = '鶏むね肉（皮なし）' where food_code = '11220';
update public.foods set is_common = true, display_name = '鶏むね肉（皮つき）' where food_code = '11219';
update public.foods set is_common = true, display_name = '鶏もも肉（皮なし）' where food_code = '11224';
update public.foods set is_common = true, display_name = '鶏もも肉（皮つき）' where food_code = '11221';
update public.foods set is_common = true, display_name = '鶏ささみ'           where food_code = '11227';

-- 豚肉
update public.foods set is_common = true, display_name = '豚バラ肉'           where food_code = '11129';
update public.foods set is_common = true, display_name = '豚ロース'           where food_code = '11123';
update public.foods set is_common = true, display_name = '豚もも肉（赤身）'   where food_code = '11134';
update public.foods set is_common = true, display_name = '豚ヒレ'             where food_code = '11140';

-- 牛肉
update public.foods set is_common = true, display_name = '牛もも肉（赤身）'   where food_code = '11021';
update public.foods set is_common = true, display_name = '牛バラ肉'           where food_code = '11018';

-- 加工肉
update public.foods set is_common = true, display_name = 'ベーコン'           where food_code = '11183';
update public.foods set is_common = true, display_name = 'ハム'               where food_code = '11175';
update public.foods set is_common = true, display_name = 'ウインナー'         where food_code = '11186';

-- 魚介
update public.foods set is_common = true, display_name = 'あじ'               where food_code = '10003';
update public.foods set is_common = true, display_name = 'さけ'               where food_code = '10134';
update public.foods set is_common = true, display_name = 'さば'               where food_code = '10154';
update public.foods set is_common = true, display_name = 'まぐろ赤身'         where food_code = '10253';
update public.foods set is_common = true, display_name = 'ぶり'               where food_code = '10241';
update public.foods set is_common = true, display_name = 'さんま'             where food_code = '10173';
update public.foods set is_common = true, display_name = 'いわし'             where food_code = '10047';
update public.foods set is_common = true, display_name = 'たら'               where food_code = '10205';
update public.foods set is_common = true, display_name = 'ツナ缶（油漬）'     where food_code = '10263';
update public.foods set is_common = true, display_name = 'ツナ缶（水煮）'     where food_code = '10260';

-- 大豆製品
update public.foods set is_common = true, display_name = '木綿豆腐'           where food_code = '04032';
update public.foods set is_common = true, display_name = '絹ごし豆腐'         where food_code = '04033';
update public.foods set is_common = true, display_name = '納豆'               where food_code = '04046';
update public.foods set is_common = true, display_name = '油揚げ'             where food_code = '04040';

-- 野菜
update public.foods set is_common = true, display_name = 'キャベツ'           where food_code = '06061';
update public.foods set is_common = true, display_name = 'レタス'             where food_code = '06312';
update public.foods set is_common = true, display_name = 'トマト'             where food_code = '06182';
update public.foods set is_common = true, display_name = 'きゅうり'           where food_code = '06065';
update public.foods set is_common = true, display_name = 'にんじん'           where food_code = '06214';
update public.foods set is_common = true, display_name = 'たまねぎ'           where food_code = '06153';
update public.foods set is_common = true, display_name = 'ほうれんそう'       where food_code = '06267';
update public.foods set is_common = true, display_name = 'ブロッコリー'       where food_code = '06263';
update public.foods set is_common = true, display_name = 'なす'               where food_code = '06191';
update public.foods set is_common = true, display_name = 'ピーマン'           where food_code = '06245';
update public.foods set is_common = true, display_name = '大根'               where food_code = '06134';
update public.foods set is_common = true, display_name = '白菜'               where food_code = '06233';
update public.foods set is_common = true, display_name = 'もやし'             where food_code = '06287';

-- きのこ
update public.foods set is_common = true, display_name = 'しめじ'             where food_code = '08016';
update public.foods set is_common = true, display_name = 'えのき'             where food_code = '08001';
update public.foods set is_common = true, display_name = 'まいたけ'           where food_code = '08028';
update public.foods set is_common = true, display_name = 'しいたけ'           where food_code = '08039';

-- 果物
update public.foods set is_common = true, display_name = 'バナナ'             where food_code = '07107';
update public.foods set is_common = true, display_name = 'りんご'             where food_code = '07148';
update public.foods set is_common = true, display_name = 'みかん'             where food_code = '07027';
update public.foods set is_common = true, display_name = 'いちご'             where food_code = '07012';
update public.foods set is_common = true, display_name = 'ぶどう'             where food_code = '07116';
update public.foods set is_common = true, display_name = 'キウイ'             where food_code = '07054';

-- 飲料
update public.foods set is_common = true, display_name = 'ビール'             where food_code = '16006';
update public.foods set is_common = true, display_name = '赤ワイン'           where food_code = '16011';
update public.foods set is_common = true, display_name = '日本酒'             where food_code = '16001';
update public.foods set is_common = true, display_name = 'コーラ'             where food_code = '16053';
update public.foods set is_common = true, display_name = 'コーヒー（無糖）'   where food_code = '16045';
update public.foods set is_common = true, display_name = '緑茶'               where food_code = '16037';

-- 菓子
update public.foods set is_common = true, display_name = 'ショートケーキ'     where food_code = '15075';
update public.foods set is_common = true, display_name = 'ポテトチップス'     where food_code = '15104';
update public.foods set is_common = true, display_name = 'ミルクチョコレート' where food_code = '15116';
update public.foods set is_common = true, display_name = 'プリン'             where food_code = '15086';

-- 油・調味料
update public.foods set is_common = true, display_name = 'サラダ油'           where food_code = '14006';
update public.foods set is_common = true, display_name = 'オリーブ油'         where food_code = '14001';
update public.foods set is_common = true, display_name = 'マヨネーズ'         where food_code = '17042';
update public.foods set is_common = true, display_name = 'しょうゆ'           where food_code = '17007';
