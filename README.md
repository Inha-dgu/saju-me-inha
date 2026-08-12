# saju-me-inha

**사주미** — 생년월일시로 사주팔자를 계산하고 Gemini AI로 해석을 받는 웹사이트입니다.

- 사주 계산: [manseryeok](https://www.npmjs.com/package/manseryeok)
- AI 해석: Google Gemini (`gemini-3.5-flash`)

## 시작하기

```bash
cp .env.example .env   # GEMINI_API_KEY 넣기
npm install
npm run build
npm run serve
```

## 배포 (Vercel) — 404 방지

대시보드 설정이 `vercel.json`보다 우선입니다. 아래를 **정확히** 맞추세요.

1. Project → **Settings → Build and Deployment**
   - Framework Preset: **Other**
   - Build Command: `npm run build` (또는 Override OFF)
   - **Output Directory: 비워 두기** (비우기 / `.` 금지, `dist`도 금지)
2. **Settings → Environment Variables**
   - `GEMINI_API_KEY` = (로컬 `.env`와 동일)
   - Environment: Production, Preview 모두 체크
3. **Deployments → ⋯ → Redeploy** (Clear cache and redeploy 권장)

Output Directory를 `dist`로 두면, 예전 빌드/실패 시 `index.html`이 없어 Vercel `NOT_FOUND`가 납니다.  
루트의 `index.html` + `dist/bundle.js`를 그대로 서빙해야 합니다.

## 배포 (Netlify)

- Build: `npm run build`
- Publish: `dist`
- Env: `GEMINI_API_KEY`
