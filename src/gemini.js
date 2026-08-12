/**
 * @param {string} sajuText
 * @returns {Promise<string>}
 */
export async function interpretWithGemini(sajuText) {
  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sajuText }),
  });

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
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const blocks = escaped.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines[0].startsWith('## ')) {
        const title = lines[0].slice(3).trim();
        const body = lines.slice(1).join('\n').trim();
        return `<h4>${title}</h4>${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}`;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}
