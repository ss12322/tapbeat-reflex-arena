export async function fetchTopWinners(tournamentId, limit = 3) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase no configurado — usando jugadores on-chain como fallback');
    return null;
  }

  const query = new URLSearchParams({
    select: 'wallet_address,score,username',
    tournament_id: `eq.${tournamentId}`,
    score: 'not.is.null',
    order: 'score.desc',
    limit: String(limit)
  });

  const res = await fetch(`${url}/rest/v1/tournament_entries?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  return res.json();
}

export async function patchTournamentStatus(tournamentId, status, extra = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/tournaments?id=eq.${tournamentId}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ status, ...extra })
  });
}
