import { calculateFourPillars } from 'manseryeok';

/**
 * @typedef {object} SajuInput
 * @property {string} [name]
 * @property {'male'|'female'} gender
 * @property {boolean} isLunar
 * @property {boolean} [isLeapMonth]
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} [hour]
 * @property {number} [minute]
 * @property {boolean} [timeUnknown]
 */

/**
 * @param {SajuInput} input
 */
export function computeSaju(input) {
  const timeUnknown = Boolean(input.timeUnknown);
  const hour = timeUnknown ? 12 : Number(input.hour);
  const minute = timeUnknown ? 0 : Number(input.minute);

  const result = calculateFourPillars({
    year: input.year,
    month: input.month,
    day: input.day,
    hour,
    minute,
    isLunar: input.isLunar,
    isLeapMonth: input.isLunar ? Boolean(input.isLeapMonth) : false,
    gender: input.gender,
  });

  const hanja = result.toHanjaObject();
  const labels = [
    { key: 'year', title: '연주' },
    { key: 'month', title: '월주' },
    { key: 'day', title: '일주' },
    { key: 'hour', title: '시주' },
  ];

  const pillars = labels.map(({ key, title }) => {
    const pillar = result[key];
    const element = result[`${key}Element`];
    const ten = result.tenGods[key];
    return {
      key,
      title,
      stem: pillar.heavenlyStem,
      branch: pillar.earthlyBranch,
      stemHanja: hanja[key].hanja[0],
      branchHanja: hanja[key].hanja[1],
      stemElement: element.stem,
      branchElement: element.branch,
      tenGodStem: ten.stem,
      tenGodBranch: ten.branch,
      korean: result[`${key}String`],
    };
  });

  const summary = timeUnknown
    ? `${result.yearString}연주, ${result.monthString}월주, ${result.dayString}일주 (시주 미상)`
    : result.toString();
  const summaryHanja = timeUnknown
    ? result.toHanjaString().replace(/,?\s*[^,]*時柱/, '').replace(/,\s*$/, '') + ' (시주 미상)'
    : result.toHanjaString();

  return {
    name: input.name || '',
    gender: input.gender,
    isLunar: input.isLunar,
    timeUnknown,
    birth: {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: timeUnknown ? null : hour,
      minute: timeUnknown ? null : minute,
    },
    summary,
    summaryHanja,
    pillars,
    voidBranches: result.voidBranches,
    luckPillars: result.luckPillars
      ? {
          forward: result.luckPillars.forward,
          startAge: result.luckPillars.startAge,
          pillars: result.luckPillars.pillars.slice(0, 8).map((p) => ({
            age: p.age,
            korean: p.korean,
          })),
        }
      : null,
  };
}

/**
 * Gemini 프롬프트용 텍스트로 직렬화
 * @param {ReturnType<typeof computeSaju>} saju
 */
export function formatSajuForPrompt(saju) {
  const pillarLines = (saju.timeUnknown
    ? saju.pillars.filter((p) => p.key !== 'hour')
    : saju.pillars)
    .map(
      (p) =>
        `${p.title}: ${p.korean} (${p.stemHanja}${p.branchHanja}) / 천간오행 ${p.stemElement}, 지지오행 ${p.branchElement} / 십신 천간 ${p.tenGodStem}, 지지 ${p.tenGodBranch}`,
    )
    .join('\n');

  const luck =
    saju.luckPillars == null
      ? '대운 정보 없음'
      : `대운 ${saju.luckPillars.forward ? '순행' : '역행'}, 시작 나이 ${saju.luckPillars.startAge}세\n` +
        saju.luckPillars.pillars.map((p) => `${p.age}세 ${p.korean}`).join(', ');

  const birth = saju.birth;
  const dateStr = `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}`;
  const birthStr = saju.timeUnknown
    ? `${dateStr} 출생 시각 모름 (${saju.isLunar ? '음력' : '양력'})`
    : `${dateStr} ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')} (${saju.isLunar ? '음력' : '양력'})`;

  return [
    saju.name ? `이름: ${saju.name}` : null,
    `성별: ${saju.gender === 'male' ? '남성' : '여성'}`,
    `출생: ${birthStr}`,
    saju.timeUnknown ? '시주: 출생 시각 미상으로 해석에서 제외' : null,
    '',
    '사주팔자:',
    pillarLines,
    '',
    `공망: ${saju.voidBranches.join(', ') || '없음'}`,
    luck,
  ]
    .filter((line) => line !== null)
    .join('\n');
}
