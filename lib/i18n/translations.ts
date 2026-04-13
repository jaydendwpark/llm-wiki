export type Locale = "en" | "ko";

const translations = {
  // Sidebar nav
  "nav.home": { en: "Home", ko: "홈" },
  "nav.wiki": { en: "Wiki", ko: "위키" },
  "nav.graph": { en: "Graph View", ko: "그래프 뷰" },
  "nav.import": { en: "Uploads", ko: "업로드 기록" },
  "nav.tasks": { en: "Tasks", ko: "할 일" },
  "nav.lint": { en: "Lint", ko: "Lint" },
  "sidebar.search": { en: "Search\u2026", ko: "검색\u2026" },
  "sidebar.budget": { en: "AI Budget", ko: "AI 사용량" },
  "sidebar.export": { en: "Export", ko: "내보내기" },
  "sidebar.signout": { en: "Sign out", ko: "로그아웃" },

  // Home
  "home.welcome": { en: "Welcome to Mnemo", ko: "Mnemo에 오신 것을 환영합니다" },
  "home.welcomeDesc": {
    en: "Ask questions, register knowledge, or create tasks.",
    ko: "질문하거나, 지식을 등록하거나, 할 일을 만드세요.",
  },
  "home.placeholder": {
    en: "Type a question, memo, URL, or task\u2026",
    ko: "질문, 메모, URL, 할 일을 입력하세요\u2026",
  },
  "home.queryBtn": { en: "Query", ko: "질문" },
  "home.registerBtn": { en: "Register", ko: "등록" },
  "home.dateOption": { en: "Date", ko: "날짜" },
  "home.taskOption": { en: "Task", ko: "할 일" },
  "home.attach": { en: "Attach", ko: "첨부" },
  "home.attachFile": { en: "File", ko: "파일" },
  "home.attachFolder": { en: "Folder", ko: "폴더" },
  "home.attachImage": { en: "Image", ko: "이미지" },
  "home.dropFiles": {
    en: "Drop files here",
    ko: "파일을 여기에 드롭하세요",
  },
  "home.dropDesc": {
    en: "PDF, Markdown, Text, HTML",
    ko: "PDF, 마크다운, 텍스트, HTML",
  },
  "home.taskCreated": { en: "Task created", ko: "할 일이 만들어졌습니다" },
  "home.pagesCreated": {
    en: "{count} pages created",
    ko: "{count}개 페이지 생성",
  },
  "home.uploading": { en: "Uploading\u2026", ko: "업로드 중\u2026" },
  "home.ingesting": { en: "Building wiki pages\u2026", ko: "위키 페이지 생성 중\u2026" },
  "home.registered": { en: "Registered", ko: "등록 완료" },

  // Wiki index
  "wiki.title": { en: "Wiki", ko: "위키" },
  "wiki.subtitle": {
    en: "{count} pages \u2014 AI-maintained knowledge base",
    ko: "{count}개 페이지 \u2014 AI 지식 베이스",
  },
  "wiki.graphView": { en: "Graph View", ko: "그래프 뷰" },
  "wiki.empty": { en: "Wiki is empty", ko: "위키가 비어 있습니다" },
  "wiki.emptyDesc": {
    en: "Upload files from Home to get started",
    ko: "홈에서 파일을 업로드하세요",
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

  // Query (still used by output rendering)
  "query.thinking": { en: "Thinking\u2026", ko: "생각 중\u2026" },
  "query.sources": { en: "Sources", ko: "출처" },
  "query.filedAs": { en: "Filed as", ko: "저장됨:" },

  // Upload history
  "import.title": { en: "Upload History", ko: "업로드 기록" },
  "import.desc": {
    en: "All documents uploaded to your wiki. Upload new files from Home.",
    ko: "위키에 업로드된 모든 문서입니다. 새 파일은 홈에서 업로드하세요.",
  },
  "import.empty": { en: "No uploads yet", ko: "업로드 기록이 없습니다" },
  "import.emptyDesc": {
    en: "Drop files on Home to build your wiki",
    ko: "홈에서 파일을 드롭하여 위키를 만드세요",
  },
  "import.goHome": { en: "Go to Home", ko: "홈으로 이동" },
  "import.ingested": { en: "Ingested", ko: "처리됨" },
  "import.pending": { en: "Pending", ko: "대기 중" },
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

  // Tasks
  "tasks.title": { en: "Tasks", ko: "할 일" },
  "tasks.desc": {
    en: "Your personal task list. Create tasks from Home.",
    ko: "개인 할 일 목록입니다. 홈에서 할 일을 만드세요.",
  },
  "tasks.empty": { en: "No tasks yet", ko: "할 일이 없습니다" },
  "tasks.emptyDesc": {
    en: "Create a task from Home",
    ko: "홈에서 할 일을 만드세요",
  },
  "tasks.goHome": { en: "Go to Home", ko: "홈으로 이동" },
  "tasks.todo": { en: "To Do", ko: "할 일" },
  "tasks.inProgress": { en: "In Progress", ko: "진행 중" },
  "tasks.done": { en: "Done", ko: "완료" },
  "tasks.cancelled": { en: "Cancelled", ko: "취소됨" },
  "tasks.dueDate": { en: "Due", ko: "기한" },

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
