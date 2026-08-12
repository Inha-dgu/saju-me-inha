/**
 * @param {string} sajuText
 * @returns {Promise<string>}
 */
export async function interpretWithGemini(sajuText) {
  let res;
  try {
    res = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sajuText }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`해석 서버에 연결하지 못했습니다. (${detail})`);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `해석 요청에 실패했습니다. (${res.status})`);
  }

  if (!data.text) {
    throw new Error('해석 결과를 받지 못했습니다.');
  }

  return data.text;
}

/**
 * @param {string} text
 */
export function renderInterpretation(text) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const blocks = escaped.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return '';

      const heading = lines[0].match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        const title = heading[1].trim();
        const body = lines.slice(1).join('<br>');
        return `<h4>${title}</h4>${body ? `<p>${body}</p>` : ''}`;
      }

      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}
