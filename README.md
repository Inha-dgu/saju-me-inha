# saju-me-inha

생년월일시로 사주팔자를 계산하고 Gemini로 해석하는 사이트입니다.

## 로컬

```bash
cp .env.example .env   # GEMINI_API_KEY 입력
npm install
npm run build
npm run serve
```

## Vercel

1. **Settings → Environment Variables**에 `GEMINI_API_KEY` 추가 (Production + Preview)
2. Output Directory는 **비워 두기**
3. Redeploy

키는 브라우저에 넣지 않고 `/api/interpret` 서버리스 함수에서만 사용합니다.
