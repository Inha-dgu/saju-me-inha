import { computeSaju, formatSajuForPrompt } from './saju.js';
import { interpretWithGemini, renderInterpretation } from './gemini.js';

/** @type {ReturnType<typeof computeSaju>|null} */
let currentSaju = null;

const form = document.getElementById('saju-form');
const calendarSelect = document.getElementById('calendar');
const leapField = document.getElementById('leap-field');
const hourSelect = document.getElementById('hour');
const minuteSelect = document.getElementById('minute');
const formError = document.getElementById('form-error');
const resultPanel = document.getElementById('result-panel');
const resultMeta = document.getElementById('result-meta');
const pillarsEl = document.getElementById('pillars');
const voidBranchesEl = document.getElementById('void-branches');
const luckSummaryEl = document.getElementById('luck-summary');
const luckListEl = document.getElementById('luck-list');
const interpretBtn = document.getElementById('interpret-btn');
const interpretArea = document.getElementById('interpret-area');
const interpretStatus = document.getElementById('interpret-status');
const interpretBody = document.getElementById('interpret-body');
const submitBtn = document.getElementById('submit-btn');

function fillTimeSelects() {
  for (let h = 0; h < 24; h += 1) {
    const opt = document.createElement('option');
    opt.value = String(h);
    opt.textContent = `${String(h).padStart(2, '0')}시`;
    hourSelect.appendChild(opt);
  }
  for (let m = 0; m < 60; m += 1) {
    const opt = document.createElement('option');
    opt.value = String(m);
    opt.textContent = `${String(m).padStart(2, '0')}분`;
    minuteSelect.appendChild(opt);
  }
  hourSelect.value = '12';
  minuteSelect.value = '0';
}

function showError(message) {
  if (!message) {
    formError.classList.add('is-hidden');
    formError.textContent = '';
    return;
  }
  formError.textContent = message;
  formError.classList.remove('is-hidden');
}

function setLeapVisibility() {
  const isLunar = calendarSelect.value === 'lunar';
  leapField.classList.toggle('is-hidden', !isLunar);
}

/**
 * @param {ReturnType<typeof computeSaju>} saju
 */
function renderSaju(saju) {
  currentSaju = saju;

  const namePart = saju.name ? `${saju.name} · ` : '';
  const genderPart = saju.gender === 'male' ? '남성' : '여성';
  const cal = saju.isLunar ? '음력' : '양력';
  const { year, month, day, hour, minute } = saju.birth;
  resultMeta.textContent = `${namePart}${genderPart} · ${cal} ${year}.${month}.${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  pillarsEl.innerHTML = saju.pillars
    .map(
      (p) => `
      <article class="pillar">
        <p class="pillar-label">${p.title}</p>
        <p class="pillar-stem el-${p.stemElement}">${p.stem}</p>
        <p class="pillar-hanja">${p.stemHanja}</p>
        <p class="pillar-branch el-${p.branchElement}">${p.branch}</p>
        <p class="pillar-hanja">${p.branchHanja}</p>
        <p class="pillar-ten">${p.tenGodStem} · ${p.tenGodBranch}</p>
      </article>`,
    )
    .join('');

  voidBranchesEl.textContent =
    saju.voidBranches.length > 0 ? saju.voidBranches.join(', ') : '없음';

  if (saju.luckPillars) {
    luckSummaryEl.textContent = `${saju.luckPillars.forward ? '순행' : '역행'} · ${saju.luckPillars.startAge}세부터`;
    luckListEl.innerHTML = saju.luckPillars.pillars
      .map((p) => `<span class="luck-chip">${p.age}세 ${p.korean}</span>`)
      .join('');
    luckListEl.classList.remove('is-hidden');
  } else {
    luckSummaryEl.textContent = '—';
    luckListEl.classList.add('is-hidden');
    luckListEl.innerHTML = '';
  }

  interpretArea.classList.add('is-hidden');
  interpretBody.innerHTML = '';
  interpretStatus.hidden = true;
  interpretStatus.textContent = '';
  interpretStatus.classList.remove('is-loading');

  resultPanel.classList.remove('is-hidden');
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function readForm() {
  const name = /** @type {HTMLInputElement} */ (document.getElementById('name')).value.trim();
  const gender = /** @type {HTMLSelectElement} */ (document.getElementById('gender')).value;
  const isLunar = calendarSelect.value === 'lunar';
  const isLeapMonth = /** @type {HTMLInputElement} */ (document.getElementById('leap')).checked;
  const birthdate = /** @type {HTMLInputElement} */ (document.getElementById('birthdate')).value;
  const hour = Number(hourSelect.value);
  const minute = Number(minuteSelect.value);

  if (!birthdate) throw new Error('생년월일을 입력해 주세요.');
  if (hourSelect.value === '' || minuteSelect.value === '') {
    throw new Error('출생 시각을 선택해 주세요.');
  }

  const [y, m, d] = birthdate.split('-').map(Number);
  return {
    name,
    gender: /** @type {'male'|'female'} */ (gender),
    isLunar,
    isLeapMonth,
    year: y,
    month: m,
    day: d,
    hour,
    minute,
  };
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  showError('');

  try {
    const data = readForm();
    const saju = computeSaju(data);
    renderSaju(saju);
  } catch (err) {
    const message = err instanceof Error ? err.message : '사주 계산에 실패했습니다.';
    showError(message);
    resultPanel.classList.add('is-hidden');
  }
});

interpretBtn.addEventListener('click', async () => {
  showError('');
  if (!currentSaju) {
    showError('먼저 사주를 계산해 주세요.');
    return;
  }

  interpretArea.classList.remove('is-hidden');
  interpretStatus.hidden = false;
  interpretStatus.textContent = '해석을 작성하는 중…';
  interpretStatus.classList.add('is-loading');
  interpretBody.innerHTML = '';
  interpretBtn.disabled = true;
  submitBtn.disabled = true;

  try {
    const text = await interpretWithGemini(formatSajuForPrompt(currentSaju));
    interpretStatus.classList.remove('is-loading');
    interpretStatus.hidden = true;
    interpretBody.innerHTML = renderInterpretation(text);
  } catch (err) {
    interpretStatus.classList.remove('is-loading');
    interpretStatus.hidden = true;
    const message = err instanceof Error ? err.message : '해석 요청에 실패했습니다.';
    showError(message);
  } finally {
    interpretBtn.disabled = false;
    submitBtn.disabled = false;
  }
});

calendarSelect.addEventListener('change', setLeapVisibility);

fillTimeSelects();
setLeapVisibility();

const today = new Date();
const birthInput = /** @type {HTMLInputElement} */ (document.getElementById('birthdate'));
if (!birthInput.value) {
  const y = today.getFullYear() - 25;
  birthInput.value = `${y}-01-01`;
}
