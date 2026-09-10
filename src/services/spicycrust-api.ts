const API_BASE = 'https://spicycrust-api.alphadocere.cl/api/v1';
const GAME_KEY = 'b36b041d696f5b9c7595b6f6647cb2e7649c5b24d92808a33c3c9baea46a48df';
const GAME_SLUG = 'smash-the-crust';

let _seasonSlug: string | null = null;

export interface SpicyCrustLeaderboardEntry {
  id?: string;
  rank?: number;
  nickname: string;
  score: number;
  created_at?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export async function getActiveSeason(): Promise<string> {
  if (_seasonSlug) return _seasonSlug;
  try {
    const res = await fetch(`${API_BASE}/seasons?status=active`, { signal: AbortSignal.timeout(4000) });
    const json = await res.json();
    const season = Array.isArray(json) ? json[0] : (json.data ?? json);
    if (season?.slug) {
      _seasonSlug = season.slug;
      return _seasonSlug;
    }
  } catch (e: any) {
    console.warn('[SpicyCrust] Season fallback:', e?.message || e);
  }
  return 'season-01';
}

export interface SubmitScoreParams {
  nickname: string;
  email?: string;
  score: number;
  metadata?: Record<string, any>;
}

export async function submitScore({ nickname, email = '', score, metadata = {} }: SubmitScoreParams): Promise<any> {
  const seasonSlug = await getActiveSeason();
  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Game-Key': GAME_KEY,
    },
    body: JSON.stringify({
      game_slug: GAME_SLUG,
      season_slug: seasonSlug,
      player_external_id: 'player-' + Date.now(),
      email,
      nickname,
      score,
      metadata,
    }),
    signal: AbortSignal.timeout(8000),
  });
  return await res.json();
}

export async function getLeaderboard(limit = 10): Promise<SpicyCrustLeaderboardEntry[]> {
  try {
    const seasonSlug = await getActiveSeason();
    const res = await fetch(
      `${API_BASE}/leaderboard?game=${GAME_SLUG}&season=${seasonSlug}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    return json?.data?.ranking ?? json?.data?.leaderboard ?? [];
  } catch (e: any) {
    console.warn('[SpicyCrust] Leaderboard fallback:', e?.message || e);
    return [];
  }
}
