export function uid() { return Math.random().toString(36).slice(2, 9); }
export function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function fmtTime(s) {
  const m = Math.floor(Math.abs(s) / 60), sec = Math.abs(s) % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}
export function todayKey() { return new Date().toISOString().slice(0, 10); }
export function mornQ(bizA) {
  const qs = [
    `What one task would make ${bizA} feel lighter by lunch today?`,
    "What must move today so it doesn't follow you into tonight?",
    "If you could only finish one thing before noon, what would make tomorrow easier?",
    "What's the task you keep pushing to tomorrow? Make today the day.",
  ];
  return qs[new Date().getDate() % qs.length];
}

export function inferBiz(text, bizA, bizB) {
  const t = text.toLowerCase();
  const personalKw = ['dentist','doctor','gp','school','family','wife','laundry','shopping',
    'insurance','bank','home','car','mortgage','kids','holiday','passport','nhs','prescription'];
  if (personalKw.some(w => t.includes(w))) return 'Personal';
  const throwdownKw = ['throwdown','darts','dart','oche','checkout','bull','180','pdc','venue',
    'competition','tournament','league','sponsor','prize','ross smith','van gerwen','luke littler',
    'gerwyn price','peter wright','gary anderson','throwdowndarts'];
  if (throwdownKw.some(w => t.includes(w))) return bizB;
  const switchKw = ['switch','swi-tch','recruit','candidate','client','vacancy','role','job',
    'hire','cv','interview','placement','contractor','perm','headhunt','talent','pipeline',
    'day rate','ir35','3pl','logistics','dsv','dhl','xpo','manufacturing','engineering',
    'linkedin','crm','developer','tech','digital','saas','business development','proposal',
    'tender','timmermans','paul'];
  if (switchKw.some(w => t.includes(w))) return bizA;
  return 'Personal';
}

export function inferQuadrant(text) {
  const t = text.toLowerCase();
  const urgent = ['today','asap','urgent','now','deadline','overdue','follow up','call back','reply','chase']
    .some(w => t.includes(w));
  const del = ['send','arrange','post','invoice','book'].some(w => t.includes(w));
  const low = ['maybe','idea','someday','nice to have'].some(w => t.includes(w));
  if (urgent && !del) return 'urgent-important';
  if (!urgent && !low) return 'noturgent-important';
  if (urgent && del) return 'urgent-notimportant';
  return 'noturgent-notimportant';
}

export function classify(text, bizA, bizB) {
  return { biz: inferBiz(text, bizA, bizB), quadrant: inferQuadrant(text) };
}

export function localCoachReply(input, bizA, bizB, tasks, dels) {
  const t = input.toLowerCase();
  if (t.includes('overwhelmed') || t.includes('too much') || t.includes('struggling')) {
    const next = tasks.find(t => !t.done);
    return `Take a breath. ${next ? `Start with just: "${next.text}" — 10 focused minutes.` : 'Pick one small thing and finish only that.'} Then reassess.`;
  }
  if (t.includes('focus') || t.includes('what to work on') || t.includes('first today')) {
    const ord = { 'urgent-important': 0, 'noturgent-important': 1, 'urgent-notimportant': 2, 'noturgent-notimportant': 3 };
    const next = tasks.filter(t => !t.done).sort((a, b) => ord[a.quadrant] - ord[b.quadrant])[0];
    return next
      ? `Your best next move: "${next.text}". Protect 25 minutes. Don't switch.`
      : `List is clear. Plan ${bizA}, unblock ${bizB}, or take a proper break.`;
  }
  if (t.includes('delegate')) {
    const cands = tasks.filter(t => !t.done && t.quadrant ==
