-- =====================================================
-- 주식 매매 일지 - Supabase Schema (1단계)
-- =====================================================
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- =====================================================

-- 1. stocks (종목 정보)
CREATE TABLE IF NOT EXISTS public.stocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  market     TEXT NOT NULL CHECK (market IN ('US', 'KR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- 2. categories (매매 사유 카테고리)
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'both')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. trades (매매 기록)
CREATE TABLE IF NOT EXISTS public.trades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id    UUID NOT NULL REFERENCES public.stocks(id) ON DELETE RESTRICT,
  trade_date  DATE NOT NULL,
  trade_type  TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity    NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
  price       NUMERIC(18, 4) NOT NULL CHECK (price > 0),
  currency    TEXT NOT NULL CHECK (currency IN ('KRW', 'USD')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.stocks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades     ENABLE ROW LEVEL SECURITY;

-- stocks RLS
CREATE POLICY "stocks: 본인 조회" ON public.stocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stocks: 본인 삽입" ON public.stocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stocks: 본인 수정" ON public.stocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stocks: 본인 삭제" ON public.stocks FOR DELETE USING (auth.uid() = user_id);

-- categories RLS
CREATE POLICY "categories: 본인 조회" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories: 본인 삽입" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: 본인 수정" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories: 본인 삭제" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- trades RLS
CREATE POLICY "trades: 본인 조회" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades: 본인 삽입" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades: 본인 수정" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades: 본인 삭제" ON public.trades FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 인덱스
-- =====================================================

CREATE INDEX idx_trades_user_date   ON public.trades (user_id, trade_date DESC);
CREATE INDEX idx_trades_stock       ON public.trades (stock_id);
CREATE INDEX idx_stocks_user        ON public.stocks (user_id);
CREATE INDEX idx_categories_user    ON public.categories (user_id, type);
