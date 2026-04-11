# LLM Wiki — Agent Schema v2

> 안드레 카파시 LLM Wiki 패턴 기반 (gist: 442a6bf555914893e9891c11519de94f)
> GitHub: jaydendwpark/llm-wiki

이 파일은 LLM 에이전트가 위키를 유지보수할 때 따라야 하는 규칙을 정의합니다.

---

## 아키텍처 개요

### 3계층 구조

```
raw_sources (DB table + Supabase Storage)
  ↓ 불변 소스. LLM은 읽기만 함.

wiki_pages (DB table)
  ↓ LLM이 생성하고 유지보수. [[wiki-links]]로 조밀하게 연결.

CLAUDE.md (이 파일)
  ↓ LLM 행동 규칙 정의. 사용자와 공동 진화.
```

### 구현 스택 (v2)

| 레이어 | 기술 |
|--------|------|
| 웹 프레임워크 | Next.js 15 (App Router) |
| 스타일 | Tailwind v4 CSS-first |
| 백엔드 | Supabase (PostgreSQL + Storage + Auth + Realtime) |
| AI 파이프라인 | LangGraph.js (Claude Sonnet 4.6) |
| 마크다운 | unified + remark-parse + remark-gfm + rehype-sanitize |
| 그래프 뷰 | react-force-graph-2d |

---

## 데이터베이스 스키마

### `wiki_pages`
```
slug        TEXT UNIQUE  -- URL-safe 식별자 (예: entity-transformer)
title       TEXT         -- 표시 이름
content     TEXT         -- [[wiki-links]] 포함 마크다운
summary     TEXT         -- 1줄 TLDR (index용)
tags        TEXT[]       -- 첫 번째 태그가 카테고리 역할
fts         TSVECTOR     -- 풀텍스트 검색 컬럼 (자동 생성)
user_id     UUID         -- 소유자
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ  -- 자동 업데이트
```

### `raw_sources`
```
filename    TEXT         -- 원본 파일명
content     TEXT         -- 추출된 텍스트 (PDF/HTML 포함)
storage_path TEXT        -- Supabase Storage 경로
ingested    BOOLEAN      -- 처리 여부
user_id     UUID
```

### `wiki_links`
```
from_slug   TEXT → wiki_pages(slug)  -- 링크 출발지
to_slug     TEXT                      -- 링크 목적지 (아직 없는 페이지 가능)
user_id     UUID
```

### `wiki_logs`
```
operation   TEXT  -- 'ingest' | 'query' | 'lint'
title       TEXT  -- 소스명 또는 질문
details     JSONB -- 상세 정보
user_id     UUID
```

---

## 파일 명명 규칙

슬러그 형식: `lowercase-hyphenated`, 특수문자 없음

| 유형 | 형식 | 예시 |
|------|------|------|
| 소스 요약 | `source-<title>` | `source-attention-is-all-you-need` |
| 엔티티 | `entity-<name>` | `entity-transformer` |
| 개념 | `concept-<name>` | `concept-attention-mechanism` |
| 쿼리 결과 | `query-<topic>` | `query-transformer-vs-rnn` |

---

## 3대 워크플로우

### Ingest (수집)

소스가 `raw_sources`에 추가되면:

1. 소스 내용 완전히 읽기
2. **요약 페이지 작성** (`source-<title>` slug):
   - 소스 개요, 핵심 주장 (bullet), 언급된 엔티티들
3. **기존 페이지 10-15개 업데이트**:
   - 교차 참조 추가: `See also: [[관련-페이지]]`
   - 모순 플래그: `⚠️ CONTRADICTION with [[다른-페이지]]: ...`
4. `index.md` 역할은 DB 쿼리가 대신함 (별도 파일 불필요)
5. `wiki_logs`에 작업 기록

**토큰 예산**: 1회 ingest에서 10-15개 페이지를 건드림.

### Query (쿼리)

질문이 들어오면:

1. DB FTS (`.textSearch("fts", question)`)로 관련 페이지 8개 검색
2. 페이지 내용 로드 후 답변 합성
3. 답변에 `[[wiki-links]]` 인용 사용
4. **File-back 판단**: 다음 경우 새 페이지로 저장:
   - 여러 소스를 새롭게 합성한 경우
   - 반복 질문될 가능성 높은 경우
   - 기존 위키에 없는 인사이트 발견 경우
5. `wiki_logs`에 기록

### Lint (린트)

주기적 또는 요청 시 실행:

1. 모든 페이지와 링크 로드
2. 자동 감지:
   - **Orphan pages**: 인바운드 링크 없는 페이지
   - **Broken links**: 존재하지 않는 페이지를 가리키는 링크
   - **Contradictions**: 페이지 간 상충하는 주장
   - **Thin pages**: 100단어 미만
   - **Missing pages**: 링크는 있지만 페이지 없음
   - **Missing cross-refs**: 연결되어야 할 페이지들이 미연결
3. 자동 수정 또는 수정 제안
4. `wiki_logs`에 기록

---

## 크로스 링킹 규칙

- 모든 페이지는 **3-8개** 관련 페이지를 `[[wiki-links]]`로 연결
- 새 페이지 작성 시 DB에서 기존 관련 엔티티 검색
- 목표: 링크만 따라가도 전체 위키 탐색 가능

---

## 모순 처리

새 소스가 기존 주장과 충돌할 때:

```markdown
> ⚠️ **CONTRADICTION**
> [[Source A]]의 주장: X
> [[Source B]]의 주장: Y
> Status: unresolved | Resolution: ...
```

절대 기존 내용을 조용히 덮어쓰지 말 것. 모순은 정보다.

---

## JSON 응답 형식

모든 LLM 응답은 반드시 ` ```json ``` ` 코드블록으로 감싸야 함:

```json
{
  "summaryPage": { ... },
  "updatedPages": [ ... ],
  "logEntry": "..."
}
```

---

## API Rate Limits

| 엔드포인트 | 제한 |
|------------|------|
| /api/upload | 10회/분 |
| /api/ingest | 5회/분 |
| /api/query  | 10회/분 |
| /api/lint   | 3회/분 |

---

## 핵심 원칙

1. **위키가 제품이다.** 채팅 히스토리는 휘발성. 위키는 영구적.
2. **조밀한 링크 > 희박한 링크.** 모든 페이지가 2홉 내에서 도달 가능해야.
3. **불변 소스.** `raw_sources`의 content는 절대 수정하지 않음.
4. **좋은 답변은 저장한다.** 가치 있는 합성은 채팅으로 사라지지 않게.
5. **플래그, 덮어쓰기 금지.** 모순은 명시적으로 표시.
6. **1줄 요약 필수.** 모든 페이지에 `summary` 필드.
7. **이 스키마를 공동 진화.** 새 패턴이 잘 작동하면 여기에 문서화.

---

## Phase 2: 모바일 확장 계획

Turborepo 모노레포 전환 후 Expo/React Native 앱 추가 예정.
동일한 Supabase 백엔드 공유, AI 파이프라인은 Supabase Edge Functions로 이전.
`lib/wiki/parser.ts`, `lib/wiki/graph.ts`는 `packages/wiki-core`로 분리.
