import { supabase } from './supabase.js';

function getClient() {
  if (!supabase) {
    throw new Error(
      'Supabase가 설정되지 않았습니다. Vercel에 SUPABASE_URL / SUPABASE_ANON_KEY를 넣고 Redeploy 하세요.',
    );
  }
  return supabase;
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await getClient().auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('로그인이 필요합니다.');
  return user.id;
}

const READING_COLUMNS =
  'id, name, created_at, gender, is_lunar, is_leap_month, time_unknown, birth_year, birth_month, birth_day, birth_hour, birth_minute, saju_result, interpretation';

/**
 * @typedef {object} SajuReading
 * @property {string} id
 * @property {string|null} name
 * @property {string} created_at
 * @property {string} gender
 * @property {boolean} is_lunar
 * @property {boolean} is_leap_month
 * @property {boolean} time_unknown
 * @property {number} birth_year
 * @property {number} birth_month
 * @property {number} birth_day
 * @property {number} birth_hour
 * @property {number} birth_minute
 * @property {object|null} saju_result
 * @property {string|null} interpretation
 */

/**
 * @param {import('./saju.js').SajuInput & {
 *   saju: ReturnType<import('./saju.js').computeSaju>,
 *   interpretation?: string | null,
 * }} payload
 * @returns {Promise<SajuReading>}
 */
export async function saveSajuReading(payload) {
  const userId = await requireUserId();
  const { saju, interpretation = null, ...input } = payload;
  const name = input.name?.trim() || null;
  const row = {
    user_id: userId,
    name,
    gender: input.gender,
    is_lunar: input.isLunar,
    is_leap_month: Boolean(input.isLeapMonth),
    time_unknown: Boolean(input.timeUnknown),
    birth_year: input.year,
    birth_month: input.month,
    birth_day: input.day,
    birth_hour: input.timeUnknown ? 12 : input.hour,
    birth_minute: input.timeUnknown ? 0 : input.minute,
    saju_summary: saju.summary,
    saju_result: saju,
  };
  if (interpretation != null) row.interpretation = interpretation;

  let existingId = null;
  if (name) {
    const { data: existing, error: findError } = await getClient()
      .from('saju_readings')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('gender', input.gender)
      .eq('is_lunar', input.isLunar)
      .eq('time_unknown', Boolean(input.timeUnknown))
      .eq('birth_year', input.year)
      .eq('birth_month', input.month)
      .eq('birth_day', input.day)
      .eq('birth_hour', input.hour)
      .eq('birth_minute', input.minute)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;
    existingId = existing?.id ?? null;
  }

  const query = existingId
    ? getClient().from('saju_readings').update(row).eq('id', existingId)
    : getClient().from('saju_readings').insert(row);

  const { data, error } = await query.select(READING_COLUMNS).single();
  if (error) throw error;
  return data;
}

/**
 * @param {string} id
 * @param {string} interpretation
 */
export async function updateReadingInterpretation(id, interpretation) {
  const { error } = await getClient()
    .from('saju_readings')
    .update({ interpretation })
    .eq('id', id);

  if (error) throw error;
}

/**
 * @param {string} id
 * @returns {Promise<SajuReading | null>}
 */
export async function getSajuReading(id) {
  const { data, error } = await getClient()
    .from('saju_readings')
    .select(READING_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @returns {Promise<SajuReading[]>}
 */
export async function listSajuReadings() {
  await requireUserId();

  const { data, error } = await getClient()
    .from('saju_readings')
    .select(READING_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} id
 */
export async function deleteSajuReading(id) {
  const { error } = await getClient().from('saju_readings').delete().eq('id', id);

  if (error) throw error;
}
