-- Supabase schema for quiz tool
-- Run this in Supabase SQL Editor

-- 题库
CREATE TABLE IF NOT EXISTS quiz_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_default  BOOLEAN DEFAULT false,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 题目
CREATE TABLE IF NOT EXISTS quiz_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id      UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('choice','multi','truefalse','fill')),
  question     TEXT NOT NULL,
  images       JSONB DEFAULT '[]',
  options      JSONB DEFAULT '{}',
  answer       TEXT NOT NULL,
  explanation  TEXT DEFAULT '',
  exp_images   JSONB DEFAULT '[]',
  tags         TEXT[] DEFAULT '{}',
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 错题
CREATE TABLE IF NOT EXISTS quiz_wrong (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1,
  last_wrong  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 收藏
CREATE TABLE IF NOT EXISTS quiz_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 刷题进度
CREATE TABLE IF NOT EXISTS quiz_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  correct     INTEGER DEFAULT 0,
  wrong       INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deck_id)
);

-- 刷题会话
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID REFERENCES quiz_decks(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL CHECK (mode IN ('sequential','random','wrong','bookmark','exam')),
  total       INTEGER NOT NULL,
  correct     INTEGER NOT NULL,
  time_spent  INTEGER DEFAULT 0,
  finished_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: quiz_decks
ALTER TABLE quiz_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY decks_select_default ON quiz_decks
  FOR SELECT USING (is_default = true);

CREATE POLICY decks_select_own ON quiz_decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY decks_insert_own ON quiz_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY decks_update_own ON quiz_decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY decks_delete_own ON quiz_decks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: quiz_questions (visible if deck is default or owned)
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY questions_select ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_decks
      WHERE quiz_decks.id = quiz_questions.deck_id
      AND (quiz_decks.is_default = true OR quiz_decks.user_id = auth.uid())
    )
  );

CREATE POLICY questions_insert_own ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_decks
      WHERE quiz_decks.id = quiz_questions.deck_id
      AND quiz_decks.user_id = auth.uid()
    )
  );

CREATE POLICY questions_update_own ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_decks
      WHERE quiz_decks.id = quiz_questions.deck_id
      AND quiz_decks.user_id = auth.uid()
    )
  );

-- RLS: quiz_wrong (only own records)
ALTER TABLE quiz_wrong ENABLE ROW LEVEL SECURITY;
CREATE POLICY wrong_own ON quiz_wrong FOR ALL USING (auth.uid() = user_id);
CREATE POLICY wrong_insert_own ON quiz_wrong FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: quiz_bookmarks
ALTER TABLE quiz_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookmarks_own ON quiz_bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY bookmarks_insert_own ON quiz_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: quiz_progress
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY progress_own ON quiz_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY progress_insert_own ON quiz_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_own ON quiz_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sessions_insert_own ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function: increment progress
CREATE OR REPLACE FUNCTION increment_quiz_progress(
  p_user_id UUID, p_deck_id UUID, p_correct INT, p_wrong INT
) RETURNS void AS $$
BEGIN
  UPDATE quiz_progress
  SET correct = correct + p_correct,
      wrong = wrong + p_wrong,
      updated_at = now()
  WHERE user_id = p_user_id AND deck_id = p_deck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for quiz images (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-images', 'quiz-images', true);
-- CREATE POLICY "quiz_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'quiz-images');
-- CREATE POLICY "quiz_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quiz-images' AND auth.uid() IS NOT NULL);
