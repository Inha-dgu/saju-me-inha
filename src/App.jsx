import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeSaju, formatSajuForPrompt } from './saju.js';
import { interpretWithGemini, renderInterpretation } from './gemini.js';
import {
  listSajuReadings,
  saveSajuReading,
  updateReadingInterpretation,
} from './readings.js';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 60 }, (_, m) => m);
const PILLAR_LABELS = ['연주', '월주', '일주', '시주'];
const THEME_KEY = 'saju-theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

function defaultBirthdate() {
  const y = new Date().getFullYear() - 25;
  return `${y}-01-01`;
}

function displayName(name) {
  const trimmed = name?.trim();
  return trimmed || '이름 없음';
}

export default function App() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [calendar, setCalendar] = useState('solar');
  const [leap, setLeap] = useState(false);
  const [birthdate, setBirthdate] = useState(defaultBirthdate);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(true);

  const [formError, setFormError] = useState('');
  const [saju, setSaju] = useState(null);
  const [currentReadingId, setCurrentReadingId] = useState(null);
  const [interpreting, setInterpreting] = useState(false);
  const [interpretHtml, setInterpretHtml] = useState('');
  const [showInterpret, setShowInterpret] = useState(false);

  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const ignoreInterpretRef = useRef(false);

  const isLunar = calendar === 'lunar';
  const busy = interpreting;

  const clearForm = useCallback(() => {
    ignoreInterpretRef.current = true;
    setName('');
    setGender('male');
    setCalendar('solar');
    setLeap(false);
    setBirthdate('');
    setHour('');
    setMinute('');
    setTimeUnknown(true);
    setFormError('');
    setSaju(null);
    setCurrentReadingId(null);
    setInterpretHtml('');
    setShowInterpret(false);
    setInterpreting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const resultMeta = useMemo(() => {
    if (!saju) return '';
    const namePart = saju.name ? `${saju.name} · ` : '';
    const genderPart = saju.gender === 'male' ? '남성' : '여성';
    const cal = saju.isLunar ? '음력' : '양력';
    const birth = saju.birth || {};
    const { year = '—', month = '—', day = '—', hour: h = 0, minute: m = 0 } = birth;
    const timePart = saju.timeUnknown
      ? '시각 모름'
      : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `${namePart}${genderPart} · ${cal} ${year}.${month}.${day} ${timePart}`;
  }, [saju]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadings() {
      setReadingsLoading(true);
      try {
        const rows = await listSajuReadings();
        if (!cancelled) setReadings(rows);
      } catch (err) {
        console.error('[readings]', err);
        if (!cancelled) {
          setFormError(
            err instanceof Error
              ? `저장된 사주를 불러오지 못했습니다: ${err.message}`
              : '저장된 사주를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!cancelled) setReadingsLoading(false);
      }
    }

    loadReadings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      clearForm();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearForm]);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setShowInterpret(false);
    setInterpretHtml('');
    setCurrentReadingId(null);

    try {
      if (!name.trim()) throw new Error('이름을 입력해 주세요.');
      if (!birthdate) throw new Error('생년월일을 입력해 주세요.');
      if (!timeUnknown && (hour === '' || minute === '')) {
        throw new Error('출생 시각을 선택해 주세요.');
      }

      const [y, m, d] = birthdate.split('-').map(Number);
      const input = {
        name: name.trim(),
        gender,
        isLunar,
        isLeapMonth: leap,
        timeUnknown,
        year: y,
        month: m,
        day: d,
        hour: timeUnknown ? 12 : Number(hour),
        minute: timeUnknown ? 0 : Number(minute),
      };
      const next = computeSaju(input);
      setSaju(next);

      const saved = await saveSajuReading({ ...input, saju: next });
      setCurrentReadingId(saved.id);
      setReadings((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      await interpretAndSave(saved.id, next);
    } catch (err) {
      setSaju(null);
      setCurrentReadingId(null);
      setFormError(err instanceof Error ? err.message : '사주 계산에 실패했습니다.');
    }
  }

  async function interpretAndSave(readingId, sajuData) {
    if (!sajuData) {
      setFormError('먼저 사주를 계산해 주세요.');
      return;
    }

    ignoreInterpretRef.current = false;
    setShowInterpret(true);
    setInterpreting(true);
    setInterpretHtml('');

    try {
      const text = await interpretWithGemini(formatSajuForPrompt(sajuData));
      if (ignoreInterpretRef.current) return;
      setInterpretHtml(renderInterpretation(text));

      if (readingId) {
        await updateReadingInterpretation(readingId, text);
        if (ignoreInterpretRef.current) return;
        setReadings((prev) =>
          prev.map((row) => (row.id === readingId ? { ...row, interpretation: text } : row)),
        );
      }
    } catch (err) {
      if (ignoreInterpretRef.current) return;
      setFormError(err instanceof Error ? err.message : '해석 요청에 실패했습니다.');
    } finally {
      if (!ignoreInterpretRef.current) setInterpreting(false);
    }
  }

  function handleSelectReading(row) {
    if (row.id === currentReadingId) {
      clearForm();
      return;
    }
    if (busy) return;
    setFormError('');

    if (!row?.saju_result) {
      setFormError('저장된 사주 결과가 없습니다.');
      return;
    }

    setCurrentReadingId(row.id);
    setSaju(row.saju_result);
    setName(row.name || '');
    setGender(row.gender || 'male');
    setCalendar(row.is_lunar ? 'lunar' : 'solar');
    setLeap(Boolean(row.is_leap_month));
    setBirthdate(
      `${row.birth_year}-${String(row.birth_month).padStart(2, '0')}-${String(row.birth_day).padStart(2, '0')}`,
    );
    const unknown = Boolean(row.time_unknown ?? row.saju_result?.timeUnknown);
    setTimeUnknown(unknown);
    setHour(String(unknown ? 12 : (row.birth_hour ?? 0)));
    setMinute(String(unknown ? 0 : (row.birth_minute ?? 0)));

    requestAnimationFrame(() => {
      document.getElementById('result-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    if (row.interpretation) {
      setShowInterpret(true);
      setInterpretHtml(renderInterpretation(row.interpretation));
      return;
    }

    interpretAndSave(row.id, row.saju_result);
  }

  return (
    <>
      <div className="bg-glow" aria-hidden="true" />

      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        aria-label={theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환'}
        title={theme === 'dark' ? '라이트 테마' : '다크 테마'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="app-shell">
        <aside className="history-sidebar" aria-labelledby="history-heading">
          <h2 id="history-heading" className="history-title">
            저장된 사주
          </h2>
          {readingsLoading ? (
            <p className="history-empty">불러오는 중…</p>
          ) : readings.length === 0 ? (
            <p className="history-empty">아직 저장된 사주가 없습니다.</p>
          ) : (
            <ul className="history-list">
              {readings.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`history-name${row.id === currentReadingId ? ' is-active' : ''}`}
                    onClick={() => handleSelectReading(row)}
                    disabled={busy && row.id !== currentReadingId}
                  >
                    {displayName(row.name)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="app-main">
          <header className="site-header">
            <p className="brand">내팔자야</p>
            <p className="tagline">생년월일시로 읽는 나의 사주</p>
          </header>

          <main className="layout">
            <section className="panel form-panel" aria-labelledby="form-heading">
              <h2 id="form-heading" className="panel-title">
                출생 정보
              </h2>

              <form id="saju-form" onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="name">이름</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="홍길동"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="gender">성별</label>
                    <select
                      id="gender"
                      name="gender"
                      required
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="calendar">달력</label>
                    <select
                      id="calendar"
                      name="calendar"
                      value={calendar}
                      onChange={(e) => setCalendar(e.target.value)}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </div>
                </div>

                <div className={`field leap-field${isLunar ? '' : ' is-hidden'}`} id="leap-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      id="leap"
                      name="leap"
                      checked={leap}
                      onChange={(e) => setLeap(e.target.checked)}
                    />
                    윤달
                  </label>
                </div>

                <div className="field">
                  <label htmlFor="birthdate">생년월일</label>
                  <input
                    type="date"
                    id="birthdate"
                    name="birthdate"
                    required
                    min="1800-01-01"
                    max="2100-12-31"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      id="time-unknown"
                      name="timeUnknown"
                      checked={timeUnknown}
                      onChange={(e) => setTimeUnknown(e.target.checked)}
                    />
                    출생 시각 모름
                  </label>
                </div>

                <div className={`field-row${timeUnknown ? ' is-disabled' : ''}`}>
                  <div className="field">
                    <label htmlFor="hour">시</label>
                    <select
                      id="hour"
                      name="hour"
                      required={!timeUnknown}
                      disabled={timeUnknown}
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                    >
                      <option value="">선택</option>
                      {HOURS.map((h) => (
                        <option key={h} value={String(h)}>
                          {String(h).padStart(2, '0')}시
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="minute">분</label>
                    <select
                      id="minute"
                      name="minute"
                      required={!timeUnknown}
                      disabled={timeUnknown}
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                    >
                      <option value="">선택</option>
                      {MINUTES.map((m) => (
                        <option key={m} value={String(m)}>
                          {String(m).padStart(2, '0')}분
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-btn"
                  disabled={busy || !name.trim()}
                >
                  사주 보기
                </button>
              </form>
            </section>

            <section
              className={`panel result-panel${saju ? '' : ' is-skeleton'}`}
              id="result-panel"
              aria-live="polite"
              aria-label={saju ? '사주 결과' : '사주 결과 미리보기'}
            >
              <h2 className="panel-title">내 팔자</h2>

              {saju ? (
                <>
                  <p className="result-meta" id="result-meta">
                    {resultMeta}
                  </p>

                  <div className="pillars" id="pillars">
                    {(saju.pillars || []).map((p) =>
                      saju.timeUnknown && p.key === 'hour' ? (
                        <article className="pillar pillar-unknown" key={p.title}>
                          <p className="pillar-label">{p.title}</p>
                          <p className="pillar-unknown-text">모름</p>
                        </article>
                      ) : (
                        <article className="pillar" key={p.title}>
                          <p className="pillar-label">{p.title}</p>
                          <p className={`pillar-stem el-${p.stemElement}`}>{p.stem}</p>
                          <p className="pillar-hanja">{p.stemHanja}</p>
                          <p className={`pillar-branch el-${p.branchElement}`}>{p.branch}</p>
                          <p className="pillar-hanja">{p.branchHanja}</p>
                          <p className="pillar-ten">
                            {p.tenGodStem} · {p.tenGodBranch}
                          </p>
                        </article>
                      ),
                    )}
                  </div>

                  <div className="meta-grid">
                    <div className="meta-block">
                      <h3>공망</h3>
                      <p id="void-branches">
                        {saju.voidBranches?.length > 0 ? saju.voidBranches.join(', ') : '없음'}
                      </p>
                    </div>
                    <div className="meta-block">
                      <h3>대운</h3>
                      <p id="luck-summary">
                        {saju.luckPillars
                          ? `${saju.luckPillars.forward ? '순행' : '역행'} · ${saju.luckPillars.startAge}세부터`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {saju.luckPillars && (
                    <div className="luck-list" id="luck-list">
                      {saju.luckPillars.pillars.map((p) => (
                        <span className="luck-chip" key={`${p.age}-${p.korean}`}>
                          {p.age}세 {p.korean}
                        </span>
                      ))}
                    </div>
                  )}

                  {(showInterpret || interpreting || interpretHtml) && (
                    <div className="interpret-area" id="interpret-area">
                      {interpreting && (
                        <div className="interpret-status is-loading" id="interpret-status">
                          해석을 작성하는 중…
                        </div>
                      )}
                      {interpretHtml && (
                        <article
                          className="interpret-body"
                          id="interpret-body"
                          dangerouslySetInnerHTML={{ __html: interpretHtml }}
                        />
                      )}
                      {interpretHtml && (
                        <p className="disclaimer">
                          본 설명은 참고용 설명이며, 전문 상담을 대체하지 않습니다.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="result-meta skeleton-line skeleton-meta" aria-hidden="true" />
                  <div className="pillars" aria-hidden="true">
                    {PILLAR_LABELS.map((label) => (
                      <article className="pillar is-skeleton" key={label}>
                        <p className="pillar-label">{label}</p>
                        <span className="skeleton-block" />
                        <span className="skeleton-block skeleton-block-sm" />
                      </article>
                    ))}
                  </div>
                  <div className="meta-grid" aria-hidden="true">
                    <div className="meta-block">
                      <h3>공망</h3>
                      <p className="skeleton-line" />
                    </div>
                    <div className="meta-block">
                      <h3>대운</h3>
                      <p className="skeleton-line" />
                    </div>
                  </div>
                  <div className="luck-list" aria-hidden="true">
                    <span className="luck-chip skeleton-chip" />
                    <span className="luck-chip skeleton-chip" />
                    <span className="luck-chip skeleton-chip" />
                    <span className="luck-chip skeleton-chip" />
                  </div>
                </>
              )}
            </section>
          </main>

          {formError && (
            <p className="form-error" id="form-error" role="alert">
              {formError}
            </p>
          )}

          <footer className="site-footer">
            <p>© 2026 내팔자야</p>
          </footer>
        </div>
      </div>
    </>
  );
}
