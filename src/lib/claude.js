export async function callClaude(messages, system, maxTokens = 800) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
headers: {
  'Content-Type': 'application/json',
  'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY || '',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
},
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

export function buildCoachSystem(bizA, bizB, tasks, wins, fs, dels, energyLog, settings) {
  const ownerName = settings?.owner_name || 'there';
  const workspaceCount = settings?.workspace_count || 2;
  const bizC = settings?.biz_c || 'Personal';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Task analysis
  const active = tasks.filter(t => !t.done);
  const overdue = active.filter(t => new Date(t.created_at).getTime() < Date.now() - 5 * 86400000);
  const byQuadrant = {
    'urgent-important': active.filter(t => t.quadrant === 'urgent-important'),
    'noturgent-important': active.filter(t => t.quadrant === 'noturgent-important'),
    'urgent-notimportant': active.filter(t => t.quadrant === 'urgent-notimportant'),
    'noturgent-notimportant': active.filter(t => t.quadrant === 'noturgent-notimportant'),
  };
  const byWorkspace = {};
  [bizA, bizB, bizC].forEach(biz => {
    byWorkspace[biz] = active.filter(t => t.biz === biz).length;
  });

  // Energy analysis
  const recentEnergy = energyLog.slice(0, 10);
  const avgEnergy = recentEnergy.length
    ? (recentEnergy.reduce((a, e) => a + e.score, 0) / recentEnergy.length).toFixed(1)
    : null;
  const lastEnergy = recentEnergy[0];
  const energySummary = lastEnergy
    ? `Last logged: ${lastEnergy.score}/5 at ${new Date(lastEnergy.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. Average: ${avgEnergy}/5`
    : 'No energy data logged yet';

  // Win streak analysis
  const recentWins = wins.slice(0, 5);
  const lastWinDays = wins.length
    ? Math.floor((Date.now() - new Date(wins[0].created_at).getTime()) / 86400000)
    : null;

  // Delegation analysis
  const activeDels = dels.filter(d => d.status !== 'done');
  const overdueDels = activeDels.filter(d => d.due && new Date(d.due) < new Date());

  // Task patterns
  const taskPatterns = [];
  if (overdue.length > 2) taskPatterns.push(`${overdue.length} tasks are over 5 days old — possible avoidance pattern`);
  if (byQuadrant['urgent-important'].length > 5) taskPatterns.push(`${byQuadrant['urgent-important'].length} urgent+important tasks — high pressure`);
  if (byQuadrant['noturgent-notimportant'].length > 3) taskPatterns.push(`${byQuadrant['noturgent-notimportant'].length} low-value tasks cluttering the list`);
  if (byQuadrant['urgent-notimportant'].length > 3) taskPatterns.push(`${byQuadrant['urgent-notimportant'].length} urgent-but-not-important tasks — delegation opportunity`);

  // Workspace breakdown
  const workspaceBreakdown = Object.entries(byWorkspace)
    .map(([name, count]) => `${name}: ${count} active task${count !== 1 ? 's' : ''}`)
    .join(', ');

  // Build workspaces description
  const workspaces = workspaceCount === 1
    ? `- ${bizA}`
    : workspaceCount === 2
    ? `- ${bizA}\n- ${bizB}`
    : `- ${bizA}\n- ${bizB}\n- ${bizC}`;

  return `You are a sharp, warm, highly perceptive executive coach for ${ownerName}. It is ${timeOfDay}.

${ownerName} manages ${workspaceCount} area${workspaceCount > 1 ? 's' : ''}:
${workspaces}

## Current task load
Total active: ${active.length} tasks
By workspace: ${workspaceBreakdown}
Do first (urgent+important): ${byQuadrant['urgent-important'].length}
Schedule (not urgent+important): ${byQuadrant['noturgent-important'].length}
Delegate (urgent+not important): ${byQuadrant['urgent-notimportant'].length}
Eliminate (low value): ${byQuadrant['noturgent-notimportant'].length}
Overdue (5+ days old): ${overdue.length}
${overdue.length > 0 ? 'Overdue tasks: ' + overdue.slice(0, 3).map(t => t.text).join(', ') : ''}

## Top priority tasks right now
${byQuadrant['urgent-important'].slice(0, 3).map(t => `- ${t.text} (${t.biz})`).join('\n') || 'None in urgent+important'}

## Recent wins (last ${recentWins.length})
${recentWins.map(w => `- ${w.text}`).join('\n') || 'No wins logged recently'}
${lastWinDays !== null ? `Last win logged: ${lastWinDays === 0 ? 'today' : lastWinDays + ' days ago'}` : ''}

## Focus & energy
Focus sessions today: ${fs.sessions} (${fs.minutes} minutes total)
Energy: ${energySummary}

## Delegation
Active delegations: ${activeDels.length}
${overdueDels.length > 0 ? `⚠ ${overdueDels.length} delegated item${overdueDels.length > 1 ? 's' : ''} past due date` : ''}

## Patterns spotted
${taskPatterns.length > 0 ? taskPatterns.map(p => `- ${p}`).join('\n') : '- No major patterns flagged'}

## Your coaching approach
- Use ${ownerName}'s name naturally but not constantly
- Meet them emotionally first — read the energy of their message
- Be specific about their workspaces, not generic
- Call out patterns honestly but without judgment
- Give concrete next actions, not abstract advice
- Keep responses to 2-3 short paragraphs max
- No bullet walls in responses — write like a person, not a report
- If they seem overwhelmed, narrow the world to ONE thing
- Celebrate wins specifically — name what they did
- It's ${timeOfDay} — factor in energy levels and what's realistic`;
}

export function buildBriefSystem(bizA, bizB, settings) {
  const ownerName = settings?.owner_name || 'there';
  const workspaceCount = settings?.workspace_count || 2;
  const bizC = settings?.biz_c || 'Personal';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const workspaces = workspaceCount === 1
    ? bizA
    : workspaceCount === 2
    ? `${bizA} and ${bizB}`
    : `${bizA}, ${bizB} and ${bizC}`;

  return `You are ${ownerName}'s personal OS ${timeOfDay} briefing. ${ownerName} manages: ${workspaces}.

Write exactly 3 lines. No headers, no bullet points, no preamble, no names:
Line 1: The single most important thing to focus on TODAY — specific, actionable, under 15 words
Line 2: One honest observation about momentum, pattern or risk from the data — under 15 words  
Line 3: One thing to protect, avoid or watch out for today — under 15 words

Direct. No corporate speak. Like a brilliant EA who sees everything and says what others won't.`;
}
