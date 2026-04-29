-- =====================================================
-- 기본 카테고리 시드 데이터 (design.md 4.2)
-- =====================================================
-- 주의: 이 SQL은 신규 사용자 가입 시 트리거로 자동 삽입하거나,
--       프론트엔드에서 최초 로그인 시 삽입하도록 설계됩니다.
--       직접 실행 시 :user_id 를 실제 UUID로 교체하세요.
-- =====================================================

-- 사용 예시 함수: 신규 사용자 가입 시 자동 카테고리 생성
CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, is_default, sort_order) VALUES
    -- 매수 사유 (RecordPage BUY_CATEGORIES 와 일치)
    (p_user_id, '실적 기대',       'buy',  TRUE, 1),
    (p_user_id, '기술적 분석',     'buy',  TRUE, 2),
    (p_user_id, '산업/섹터 성장',  'buy',  TRUE, 3),
    (p_user_id, '저평가 판단',     'buy',  TRUE, 4),
    (p_user_id, '뉴스/이벤트',     'buy',  TRUE, 5),
    (p_user_id, '배당 목적',       'buy',  TRUE, 6),
    (p_user_id, 'FOMO',            'buy',  TRUE, 7),
    -- 매도 사유 (RecordPage SELL_CATEGORIES 와 일치)
    (p_user_id, '목표가 도달',     'sell', TRUE, 1),
    (p_user_id, '손절',            'sell', TRUE, 2),
    (p_user_id, '리스크 회피',     'sell', TRUE, 3),
    (p_user_id, '자금 필요',       'sell', TRUE, 4),
    (p_user_id, '실적 실망',       'sell', TRUE, 5),
    (p_user_id, '뉴스/이벤트',     'sell', TRUE, 6),
    (p_user_id, '공포 매도',       'sell', TRUE, 7),
    (p_user_id, '리밸런싱',        'sell', TRUE, 8)
  ON CONFLICT DO NOTHING;
END;
$$;

-- =====================================================
-- 신규 사용자 가입 시 자동 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_default_categories(NEW.id);
  RETURN NEW;
END;
$$;

-- auth.users에 트리거 연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
