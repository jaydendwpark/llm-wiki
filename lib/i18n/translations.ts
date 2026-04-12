export type Locale = "en" | "ko";

const translations = {
  // Sidebar nav
  "nav.chat": { en: "Chat", ko: "채팅" },
  "nav.wiki": { en: "Wiki", ko: "위키" },
  "nav.graph": { en: "Graph View", ko: "그래프 뷰" },
  "nav.query": { en: "Query", ko: "질문하기" },
  "nav.import": { en: "Build Wiki", ko: "위키 만들기" },
  "nav.lint": { en: "Lint", ko: "Lint" },
  "sidebar.search": { en: "Search\u2026", ko: "검색\u2026" },
  "sidebar.budget": { en: "AI Budget", ko: "AI 사용량" },
  "sidebar.export": { en: "Export", ko: "내보내기" },
  "sidebar.signout": { en: "Sign out", ko: "로그아웃" },

  // Wiki index
  "wiki.title": { en: "Wiki", ko: "위키" },
  "wiki.subtitle": {
    en: "{count} pages \u2014 AI-maintained knowledge base",
    ko: "{count}개 페이지 \u2014 AI 지식 베이스",
  },
  "wiki.graphView": { en: "Graph View", ko: "그래프 뷰" },
  "wiki.empty": { en: "Wiki is empty", ko: "위키가 비어 있습니다" },
  "wiki.emptyDesc": {
    en: "Upload sources in Build Wiki to get started",
    ko: "위키 만들기에서 자료를 업로드하세요",
  },
  "wiki.addSource": { en: "Add Source", ko: "자료 추가" },

  // Wiki page
  "wiki.allPages": { en: "All pages", ko: "모든 페이지" },
  "wiki.edit": { en: "Edit", ko: "편집" },
  "wiki.linkedFrom": { en: "Linked from", ko: "링크한 페이지" },

  // Wiki edit
  "edit.back": { en: "Back", ko: "뒤로" },
  "edit.preview": { en: "Preview", ko: "미리보기" },
  "edit.edit": { en: "Edit", ko: "편집" },
  "edit.delete": { en: "Delete", ko: "삭제" },
  "edit.save": { en: "Save", ko: "저장" },
  "edit.titlePlaceholder": { en: "Page title", ko: "페이지 제목" },
  "edit.summaryPlaceholder": {
    en: "One-line summary (used in index)",
    ko: "한줄 요약 (목록에 표시)",
  },
  "edit.tagsPlaceholder": {
    en: "Tags (comma-separated)",
    ko: "태그 (쉼표로 구분)",
  },
  "edit.contentPlaceholder": {
    en: "Write markdown here... Use [[wiki-links]] to connect pages.",
    ko: "마크다운을 작성하세요... [[위키-링크]]로 페이지를 연결하세요.",
  },
  "edit.confirmDelete": {
    en: 'Delete "{title}"? This cannot be undone.',
    ko: '"{title}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.',
  },

  // Graph
  "graph.title": { en: "Graph View", ko: "그래프 뷰" },
  "graph.back": { en: "Wiki", ko: "위키" },
  "graph.stats": {
    en: "{pages} pages \u00b7 {links} connections",
    ko: "{pages}개 페이지 \u00b7 {links}개 연결",
  },

  // Query
  "query.title": { en: "Query", ko: "질문하기" },
  "query.desc": {
    en: "Ask questions against your wiki. Great answers are automatically filed back as new pages.",
    ko: "위키에 질문하세요. 좋은 답변은 자동으로 새 페이지로 저장됩니다.",
  },
  "query.recent": { en: "Recent queries", ko: "최근 질문" },
  "query.placeholder": {
    en: "Ask anything about your wiki\u2026",
    ko: "위키에 대해 무엇이든 물어보세요\u2026",
  },
  "query.thinking": { en: "Thinking\u2026", ko: "생각 중\u2026" },
  "query.ask": { en: "Ask", ko: "질문" },
  "query.sources": { en: "Sources", ko: "출처" },
  "query.filedAs": { en: "Filed as", ko: "저장됨:" },

  // Import (was Raw Sources)
  "import.title": { en: "Build Wiki", ko: "위키 만들기" },
  "import.desc": {
    en: "Upload documents to generate wiki pages. The AI reads them and builds interconnected knowledge.",
    ko: "문서를 업로드하면 위키 페이지가 생성됩니다. AI가 자료를 읽고 연결된 지식을 만듭니다.",
  },
  "import.sourceHistory": { en: "Source history", ko: "업로드 기록" },
  "import.ingested": { en: "Ingested", ko: "처리됨" },
  "import.pending": { en: "Pending", ko: "대기 중" },
  "import.dropHere": {
    en: "Drop sources here or click to browse",
    ko: "파일을 끌어다 놓거나 클릭하여 선택하세요",
  },
  "import.dropDesc": {
    en: "Markdown, text, PDF, HTML \u2014 anything you want the wiki to learn from",
    ko: "마크다운, 텍스트, PDF, HTML \u2014 위키가 학습할 모든 자료",
  },
  "import.uploading": { en: "Uploading\u2026", ko: "업로드 중\u2026" },
  "import.ingesting": {
    en: "Building wiki pages\u2026",
    ko: "위키 페이지 생성 중\u2026",
  },
  "import.done": { en: "Done", ko: "완료" },
  "import.error": { en: "Error", ko: "오류" },
  "import.uploadFolder": { en: "Upload folder", ko: "폴더 업로드" },
  "import.tabFile": { en: "File", ko: "파일" },
  "import.tabMemo": { en: "Memo", ko: "메모" },
  "import.tabUrl": { en: "Link", ko: "링크" },
  "import.memoTitle": {
    en: "Title (optional)",
    ko: "제목 (선택)",
  },
  "import.memoPlaceholder": {
    en: "Write your thoughts, notes, ideas\u2026",
    ko: "생각, 노트, 아이디어를 작성하세요\u2026",
  },
  "import.memoSubmit": { en: "Add to Wiki", ko: "위키에 추가" },
  "import.urlPlaceholder": {
    en: "https://\u2026",
    ko: "https://\u2026",
  },
  "import.urlFetch": { en: "Fetch & Build", ko: "가져와서 만들기" },
  "import.urlFetching": {
    en: "Fetching page\u2026",
    ko: "페이지 가져오는 중\u2026",
  },
  "import.queued": { en: "Queued", ko: "대기 중" },

  // Lint
  "lint.title": { en: "Lint", ko: "Lint" },
  "lint.desc": {
    en: "Run a health check on your wiki: find orphan pages, broken links, contradictions, and more.",
    ko: "위키 건강 검사: 고아 페이지, 깨진 링크, 모순 등을 찾습니다.",
  },
  "lint.run": { en: "Run Lint", ko: "검사 실행" },
  "lint.running": { en: "Analyzing wiki\u2026", ko: "위키 분석 중\u2026" },
  "lint.errors": { en: "Errors", ko: "오류" },
  "lint.warnings": { en: "Warnings", ko: "경고" },
  "lint.info": { en: "Info", ko: "정보" },
  "lint.healthy": {
    en: "Wiki is healthy \u2014 no issues found.",
    ko: "위키가 건강합니다 \u2014 문제가 없습니다.",
  },

  // Search
  "search.placeholder": {
    en: "Search wiki pages\u2026",
    ko: "위키 페이지 검색\u2026",
  },
  "search.searching": { en: "Searching\u2026", ko: "검색 중\u2026" },
  "search.noResults": {
    en: 'No results for "{query}"',
    ko: '"{query}"에 대한 결과가 없습니다',
  },
  "search.navigate": { en: "navigate", ko: "이동" },
  "search.open": { en: "open", ko: "열기" },
  "search.close": { en: "close", ko: "닫기" },

  // Chat
  "chat.welcome": { en: "Welcome to Mnemo", ko: "Mnemo에 오신 것을 환영합니다" },
  "chat.welcomeDesc": {
    en: "Ask questions about your wiki, upload documents, or write memos. Paste a URL to import from the web.",
    ko: "위키에 질문하거나, 문서를 업로드하거나, 메모를 작성하세요. URL을 붙여넣으면 웹에서 가져옵니다.",
  },
  "chat.placeholder": {
    en: "Ask anything, paste a URL, or drop files\u2026",
    ko: "질문하거나 URL을 붙여넣거나 파일을 드롭하세요\u2026",
  },
  "chat.uploadFile": { en: "Upload file", ko: "파일 업로드" },
  "chat.uploadFolder": { en: "Upload folder", ko: "폴더 업로드" },
  "chat.writeMemo": { en: "Write memo", ko: "메모 작성" },
  "chat.pagesCreated": {
    en: "{count} pages created",
    ko: "{count}개 페이지 생성",
  },

  // Theme
  "theme.title": { en: "Theme", ko: "테마" },
  "theme.light": { en: "Light", ko: "라이트" },
  "theme.dark": { en: "Dark", ko: "다크" },
  "theme.kitsch": { en: "Kitsch", ko: "키치" },
  "theme.dog": { en: "Dog", ko: "강아지" },
  "theme.cat": { en: "Cat", ko: "고양이" },

  // Login
  "login.signIn": { en: "Sign in", ko: "로그인" },
  "login.signUp": { en: "Create account", ko: "회원가입" },
  "login.signInDesc": {
    en: "Access your personal knowledge base",
    ko: "개인 지식 베이스에 접속",
  },
  "login.signUpDesc": {
    en: "Start building your wiki",
    ko: "위키 만들기를 시작하세요",
  },
  "login.email": { en: "Email", ko: "이메일" },
  "login.password": { en: "Password", ko: "비밀번호" },
  "login.noAccount": {
    en: "Don\u2019t have an account?",
    ko: "계정이 없으신가요?",
  },
  "login.hasAccount": {
    en: "Already have an account?",
    ko: "이미 계정이 있으신가요?",
  },
  "login.signUpLink": { en: "Sign up", ko: "회원가입" },
  "login.signInLink": { en: "Sign in", ko: "로그인" },
  "login.checkEmail": {
    en: "Check your email to confirm your account.",
    ko: "이메일을 확인하여 계정을 인증해주세요.",
  },
} as const;

type TranslationKey = keyof typeof translations;

export function createT(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>): string => {
    const entry = translations[key as TranslationKey];
    if (!entry) return key;
    let text: string = entry[locale] ?? entry.en;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}
