# Design System — 주식 매매 일지

## 1. 제품 컨텍스트
- **무엇**: 개인용 주식 매매 일지 PWA
- **누구**: 한국/미국 주식 동시 거래하는 개인 투자자
- **플랫폼**: 모바일(Android) 우선, 375px 기준 설계

---

## 2. 디자인 방향 — "따뜻한 저널 (Warm Journal)"

개인의 투자 기록을 **노트처럼 소중하게** 담는 느낌.  
금융 앱의 신뢰감을 유지하면서도, 딱딱하지 않고 개인적이고 따뜻한 분위기.

- **심플한 카드 기반 레이아웃** — 정보가 잘 그룹화되어 있고, 여백이 넉넉
- **수익은 초록(Forest Green), 손실은 빨강** — 색상 컨벤션은 금융 표준 준수
- **라이트 모드 기본**, 다크 모드 지원

---

## 3. 색상 체계

```css
/* =================== LIGHT MODE (기본) =================== */
--background:       #F5F0EB;   /* 크림 배경 — 종이처럼 따뜻함 */
--foreground:       #1A1A1A;   /* 기본 텍스트 */
--card:             #FFFFFF;   /* 카드 배경 — 순백 */
--card-foreground:  #1A1A1A;

--muted:            #F0EAE2;   /* 섹션 구분, 비활성 영역 */
--muted-foreground: #999999;   /* 보조 텍스트 */

--border:           #E8E0D8;   /* 선, 구분선 */
--input:            #FFFFFF;   /* 입력 필드 배경 */

--primary:          #1A6B3C;   /* Forest Green — 주요 accent, 수익 */
--primary-foreground: #FFFFFF;

--destructive:      #D94F3D;   /* 손실, 에러 */
--destructive-foreground: #FFFFFF;

/* 매매 전용 */
--profit:           #1A6B3C;   /* 수익/상승 */
--loss:             #D94F3D;   /* 손실/하락 */
--buy:              #1A6B3C;   /* 매수 (초록) */
--sell:             #D94F3D;   /* 매도 (빨강) */

/* =================== DARK MODE =================== */
--background:       #1A1F1C;   /* 진한 숲 느낌 다크 */
--foreground:       #F0EDE8;   /* 따뜻한 화이트 */
--card:             #242B26;   /* 카드 */
--card-foreground:  #F0EDE8;

--muted:            #2E3830;
--muted-foreground: #8A9B8E;   /* 보조 텍스트 (초록빛 회색) */

--border:           #3A4A3E;
--input:            #2E3830;

--primary:          #4ADE80;   /* 다크에서는 밝은 초록 */
--primary-foreground: #1A1F1C;

--destructive:      #F87171;   /* 다크에서는 밝은 빨강 */
--destructive-foreground: #1A1F1C;

--profit:           #4ADE80;
--loss:             #F87171;
--buy:              #4ADE80;
--sell:             #F87171;
```

---

## 4. 타이포그래피

| 용도 | 폰트 | 비고 |
|------|------|------|
| 기본 UI | DM Sans | 읽기 편하고 현대적 |
| 금액/숫자 | DM Sans (tabular-nums) | `font-variant-numeric: tabular-nums` 필수 |
| 보조 | 시스템 폰트 폴백 | system-ui |

### 타입 스케일
```
금액 대형:   36px / font-weight: 800 / letter-spacing: -1px
섹션 제목:   18px / font-weight: 700
카드 제목:   16px / font-weight: 600
본문:        15px / font-weight: 400
보조 텍스트: 13px / font-weight: 400 / color: muted-foreground
라벨/태그:   12px / font-weight: 500
```

---

## 5. 간격 & 레이아웃

```
페이지 좌우 패딩:  20px
카드 내부 패딩:    20px (상하) / 20px (좌우)
카드 간 간격:      12px
섹션 간 간격:      24px
```

### 카드 스타일
```css
border-radius: 16px;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);  /* 라이트 */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);  /* 다크 */
```

### 하단 탭 바
```
높이: 60px + safe-area-inset-bottom
아이콘: 22px
라벨: 11px
활성 색상: --primary
```

---

## 6. 컴포넌트 패턴

### 수익/손실 표시
```
+2.1%  → color: var(--profit), 앞에 ▲ 또는 + 기호
-1.3%  → color: var(--loss),   앞에 ▼ 또는 - 기호
배지:  background: color/10% opacity, border-radius: 20px
```

### 종목 카드
```
왼쪽: 종목 배지(색상 태그) + 종목명 + 보조정보(수량·평단가)
오른쪽: 평가금액(굵게) + 수익률(색상)
```

### 매수/매도 토글
```
매수 활성: background var(--buy),   text white
매도 활성: background var(--sell),  text white
비활성:    background transparent,  text var(--muted-foreground)
```

### 카테고리 칩 (사유 선택)
```
선택됨:   border + background (color/10%), text (color)
미선택:   border: var(--border), text: var(--muted-foreground)
border-radius: 9999px (pill)
```

---

## 7. 금지 사항 (절대 사용 금지)

- ❌ 보라/바이올렛 계열 accent
- ❌ 그라디언트 버튼 (primary 버튼은 solid color만)
- ❌ 진한 남색 카드 배경 (#1A1A2E 등)
- ❌ 과도한 그림자 (elevation이 높은 shadow)
- ❌ 모든 요소에 동일한 border-radius (계층 없음)
- ❌ 폰트: Inter, Roboto, Poppins (너무 흔함)

---

## 8. 다크 모드 전략

- HTML에 `.dark` 클래스로 전환 (시스템 설정 자동 감지 + 수동 토글)
- 다크 모드에서 배경은 **완전한 검정이 아닌 진한 숲빛** (#1A1F1C)
- 카드는 배경보다 살짝 밝게 (#242B26)
- Accent는 라이트보다 **더 밝은 초록** (#4ADE80) — 어두운 배경에서 대비 확보
- 손실 빨강도 **더 밝은 버전** (#F87171) — 같은 이유

---

## 9. 결정 로그

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-29 | Warm Journal 방향 확정 | 3개 variant 비교 후 선택 |
| 2026-04-29 | 라이트 모드 기본 + 다크 모드 지원 | 사용자 요청 |
| 2026-04-29 | Forest Green (#1A6B3C) accent | 수익 색상과 통일, 자연스러운 금융 느낌 |
| 2026-04-29 | DM Sans 폰트 | 가독성 + 숫자 가독성 우수 |
