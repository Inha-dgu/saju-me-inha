# saju-me-inha

**사주미** — 생년월일시로 사주팔자를 계산하고 Gemini AI로 해석을 받는 웹사이트입니다.

- 사주 계산: [manseryeok](https://www.npmjs.com/package/manseryeok) (KASI 기반 만세력)
- AI 해석: Google Gemini (`gemini-3.5-flash`)

## 파일 구조

```
saju-me-inha/
├── index.html
├── style.css
├── src/
│   ├── main.js
│   ├── saju.js
│   └── gemini.js
├── scripts/
│   └── build.js        # .env의 GEMINI_API_KEY를 번들에 주입
├── dist/
│   └── bundle.js       # 빌드 산출물 (gitignore)
├── .env.example
├── package.json
└── README.md
```

## 시작하기

```bash
cd saju-me-inha
cp .env.example .env   # GEMINI_API_KEY 값을 넣기
npm install
npm run build
npm run serve
```

브라우저에서 `http://localhost:3000` 을 엽니다.

## Gemini API 키

키는 UI에 노출하지 않고, 빌드 시 `.env`의 `GEMINI_API_KEY`로 주입합니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 키 발급
2. 프로젝트 루트 `.env`에 `GEMINI_API_KEY=...` 작성 (`.env`는 git에 올리지 않음)
3. `npm run build`

**주의:** 정적 사이트라 빌드된 `dist/bundle.js` 안에는 키가 포함됩니다. 공개 배포 시 HTTP 리퍼러 제한을 걸거나, 키가 유출되면 재발급하세요.

## 사용 방법

1. 성별 · 양력/음력 · 생년월일 · 출생 시각을 입력합니다.
2. **사주 보기**로 연·월·일·시주, 십신, 공망, 대운을 확인합니다.
3. **AI 해석 받기**로 Gemini 해석을 요청합니다.

해석은 참고용 엔터테인먼트이며, 전문 상담을 대체하지 않습니다.

## 배포 (Netlify)

1. Netlify에서 이 저장소를 연결합니다.
2. **Environment variables**에 `GEMINI_API_KEY`를 설정합니다. (없으면 빌드 실패)
3. `netlify.toml`이 이미 아래처럼 설정되어 있습니다.
   - Build command: `npm run build`
   - Publish directory: `.` (루트 — `dist`가 아님)
4. Deploy를 다시 트리거합니다.

Publish directory를 `dist`로 두면 `index.html`이 없어 **404**가 납니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run build` | API 키 주입 + `dist/bundle.js` 생성 |
| `npm run dev` | watch 모드 빌드 |
| `npm run serve` | 로컬 정적 서버 (포트 3000) |
