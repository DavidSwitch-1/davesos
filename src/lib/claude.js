export async function callClaude(messages, system, maxTokens = 800) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
    const data = await res.json();
    return data.content?.map(c => c.text || '').join('') || null;
  } catch (e) {
    console.error('Claude API error:', e);
    return null;
  }
}

export function buildCoachSystem(bizA, bizB, tasks, wins, fs, dels, energyLog) {
  const activeTasks = tasks.filter(t => !t.done).slice(0, 8)
    .map(t => `- ${t.text} (${t.biz}, ${t.quadrant})`).join('\n');
  const recentWins = wins.slice(0, 3).map(w => `- ${w.text}`).join('\n');
  const recentEnergy = energyLog.slice(0, 6)
    .map(e => `${new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}: ${e.score}/5`)
    .join(', ');

  return `You are a sharp, warm executive coach for Dave, who runs two businesses:
- ${bizA}: tech/digital recruitment company (swi-tch.com)
- ${bizB}: competitive darts events and fitness community (throwdowndarts.com)

Dave has suspected ADHD — starts things but doesn't always finish, drifts toward urgent over important, sometimes forgets wins. Peak focus: 9am–12pm.

Current tasks:
${activeTasks || 'None'}

Recent wins:
${recentWins || 'None logged'}

Focus today: ${fs.sessions} sessions, ${fs.minutes} minutes.
Delegated in motion: ${dels.filter(d => d.status !== 'done').length}
Energy readings: ${recentEnergy || 'none logged'}

Keep responses to 2–3 short paragraphs. No bullet walls. Meet Dave where he is emotionally first, then move him forward. Be specific about his businesses. Use his name occasionally.`;
}

export function buildBriefSystem(bizA, bizB) {
  return `You are Dave's personal OS morning briefing. Dave runs ${bizA} (tech recruitment) and ${bizB} (darts events). He has ADHD.

Write exactly 3 lines. No headers, no bullet points, no preamble:
Line 1: What matters most TODAY across both businesses (specific, actionable, under 15 words)
Line 2: One honest observation about momentum or pattern from the data (under 15 words)
Line 3: One thing to protect or watch out for today (under 15 words)

Direct. No corporate speak. Like a trusted EA who knows everything.`;
}
