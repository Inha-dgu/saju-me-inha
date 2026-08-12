# saju-me-inha

**사주미** — 생년월일시로 사주팔자를 계산하고 Gemini AI로 해석을 받는 웹사이트입니다.

- 사주 계산: [manseryeok](https://www.npmjs.com/package/manseryeok) (KASI 기반 만세력)
- AI 해석: Google Gemini (`gemini-3.5-flash`)

## 파일 구조

```
saju-me-inha/
├── index.html          # 소스 페이지
├── style.css
├── src/                # JS 소스
├── scripts/build.js    # 번들 + dist 패키징
├── dist/               # 배포 산출물 (gitignore)
├── vercel.json
├── netlify.toml
├── .env.example
└── package.json
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

키는 UI에 없고, 빌드 시 `.env`의 `GEMINI_API_KEY`로 주입됩니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 키 발급
2. 프로젝트 루트 `.env`에 `GEMINI_API_KEY=...` 작성
3. `npm run build`

**주의:** 빌드된 `dist/bundle.js`에 키가 포함됩니다. 공개 배포 시 리퍼러 제한을 걸거나, 유출되면 재발급하세요.

## 사용 방법

1. 성별 · 양력/음력 · 생년월일 · 출생 시각을 입력합니다.
2. **사주 보기**로 연·월·일·시주, 십신, 공망, 대운을 확인합니다.
3. **AI 해석 받기**로 Gemini 해석을 요청합니다.

## 배포 (Vercel)

1. Vercel에서 이 GitHub 저장소를 Import합니다.
2. **Environment Variables**에 `GEMINI_API_KEY`를 추가합니다. (없으면 빌드 실패 → 404)
3. 설정은 `vercel.json`에 이미 있습니다.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Framework Preset: Other
4. Redeploy 합니다.

Output Directory를 비우거나 잘못 잡으면 Vercel **NOT_FOUND**가 납니다.

## 배포 (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Environment: `GEMINI_API_KEY`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run build` | `dist/index.html` + `style.css` + `bundle.js` 생성 |
| `npm run dev` | watch 모드 빌드 |
| `npm run serve` | `dist` 로컬 서버 (포트 3000) |
