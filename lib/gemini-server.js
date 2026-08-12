const MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildPrompt(sajuText) {
  return `당신은 친절하고 신중한 사주명리 해석가입니다.
아래 사주 데이터를 바탕으로 한국어로 해석해 주세요.

규칙:
- 참고용 엔터테인먼트임을 전제로, 단정·공포·운명론을 피하고 균형 잡힌 어조로 쓰세요.
- 전문 상담·의료·법률·투자 조언을 대체하지 않는다고 암시하세요.
- 마크다운 없이 아래 제목 형식으로만 작성하세요.
- 각 섹션은 2~4문장으로 간결하게, 문장을 중간에 끊지 말고 끝까지 완성하세요.

형식:
## 성격의 결
## 강점과 주의점
## 올해의 흐름
## 한 줄 조언

사주 데이터:
${sajuText}`;
}

/**
 * @param {string} apiKey
 * @param {string} sajuText
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, sajuText) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel Environment Variables를 확인하세요.');
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(sajuText) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
        },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Gemini 서버에 연결하지 못했습니다. 네트워크 상태를 확인하세요. (${detail})`,
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (res.status === 400
        ? '요청이 올바르지 않습니다. 입력값을 확인하세요.'
        : res.status === 403
          ? 'API 키가 거부되었습니다. 키 권한을 확인하세요.'
          : res.status === 429
            ? '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
            : `Gemini API 오류 (${res.status})`);
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    const block = data?.candidates?.[0]?.finishReason;
    throw new Error(
      block === 'SAFETY'
        ? '안전 필터로 응답이 차단되었습니다. 입력을 바꿔 다시 시도하세요.'
        : '해석 결과를 받지 못했습니다.',
    );
  }

  return text;
}

module.exports = { callGemini, buildPrompt, MODEL };
