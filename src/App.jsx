import { useState, useEffect, useRef } from 'react';
import { supabase, signOut } from './lib/supabase';
import { useAppData } from './hooks/useAppData';
import { classify, QUADS, QUAD_ORDER, greet, fmtDate, fmtTime, todayKey, mornQ, checkinReply, localCoachReply } from './lib/utils';
import { callClaude, buildCoachSystem, buildBriefSystem } from './lib/claude';
import { S, C, themes } from './lib/styles';
import AuthScreen from './components/AuthScreen';
import TasksTab from './components/TasksTab';
import FocusMode from './components/FocusMode';
import OnboardingScreen from './components/OnboardingScreen';

const NAV = [
  { id: 'home',     icon: '⌂', label: 'Home'      },
  { id: 'tasks',    icon: '✓', label: 'Tasks'     },
  { id: 'dump',     icon: '↯', label: 'Dump'      },
  { id: 'matrix',   icon: '⊞', label: 'Matrix'    },
  { id: 'focus',    icon: '◎', label: 'Focus'     },
  { id: 'delegate', icon: '→', label: 'Delegate'  },
  { id: 'wins',     icon: '★', label: 'Wins'      },
  { id: 'checkin',  icon: '♥', label: 'Check-in'  },
  { id: 'radar',    icon: '◉', label: 'Radar'     },
  { id: 'coach',    icon: '✦', label: 'Coach'     },
];

export default function App() {
  const [session,  setSession]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const start = Date.now();
    supabase.auth.getSession().then(({ data }) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1500 - elapsed);
      setTimeout(() => {
        setSession(data.session);
        setLoading(false);
      }, remaining);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D14', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, #6C63FF22 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 32 }}>
        <svg width="100" height="100" viewBox="0 0 100 100"
          style={{ animation: 'spin 2s linear infinite', position: 'absolute' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1E1E2E" strokeWidth="4"/>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#6C63FF" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="80 200"
            style={{ filter: 'drop-shadow(0 0 6px #6C63FF)' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⚡</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff',
        letterSpacing: '-0.02em', marginBottom: 6, textAlign: 'center',
        textShadow: '0 0 30px #6C63FF88' }}>Dave's OS</div>
      <div style={{ fontSize: 11, color: '#6C63FF', letterSpacing: '0.25em',
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>
        ADHD Organisation Loading
      </div>
      <div style={{ width: 200, height: 2, background: '#1E1E2E', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #6C63FF, #8B5CF6)',
          borderRadius: 99, boxShadow: '0 0 8px #6C63FF',
          animation: 'progress 1.5s ease-in-out infinite' }}/>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );

  if (!session) return <AuthScreen onAuth={setSession} />;
  return <Dashboard session={session} />;
}

function Dashboard({ session }) {
  const userId = session.user.id;
  const data = useAppData(userId);
  const { tasks, wins, radar, delegations, checkins, energyLog, settings, focusStats } = data;

  const [tab,          setTab]          = useState('home');
  const [focusTask,    setFocusTask]    = useState(null);
  const [newTxt,       setNewTxt]       = useState('');
  const [capPrev,      setCapPrev]      = useState(null);
  const [dumpTxt,      setDumpTxt]      = useState('');
  const [dumpRes,      setDumpRes]      = useState(null);
  const [winTxt,       setWinTxt]       = useState('');
  const [chat,         setChat]         = useState([]);
  const [chatIn,       setChatIn]       = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const [ciScore,      setCiScore]      = useState(3);
  const [ciNote,       setCiNote]       = useState('');
  const [ciRes,        setCiRes]        = useState('');
  const [newDel,       setNewDel]       = useState({ task: '', person: '', due: '' });
  const [brief,        setBrief]        = useState({ text: '', loading: false });
  const [badDayMode,   setBadDayMode]   = useState(false);
  const [focusBiz,     setFocusBiz]     = useState(null);
  const [energyPrompt, setEnergyPrompt] = useState(false);
  const [kick,         setKick]         = useState({ loaded: false, q: '', a: '', done: false });
  const [hypAlarm,     setHypAlarm]     = useState(null);
  const [hypFired,     setHypFired]     = useState(false);
  const [newRadar,     setNewRadar]     = useState({ text: '', owner: '', note: '', biz: 'General' });
  const [darkMode,     setDarkMode]     = useState(() => {
    const saved = localStorage.getItem('davesos_theme');
    return saved ? saved === 'dark' : true;
  });

  const bizA = settings.biz_a || 'Swi-tch';
  const bizB = settings.biz_b || 'Throwdown';

  useEffect(() => {
    const sk = JSON.parse(localStorage.getItem('davesos_kick_' + todayKey()) || 'null');
    if (sk) setKick({ ...sk, loaded: true });
    else { const q = mornQ(bizA); const st = { q, a: '', done: false, loaded: true }; setKick(st); localStorage.setItem('davesos_kick_' + todayKey(), JSON.stringify(st)); }
    const lastE = parseInt(localStorage.getItem('davesos_energy_ts') || '0');
    if (Date.now() - lastE > 4 * 3600000) setEnergyPrompt(true);
    const savedTheme = localStorage.getItem('davesos_theme') || 'dark';
    Object.assign(C, themes[savedTheme]);
    setDarkMode(savedTheme === 'dark');
  }, [bizA]);

  useEffect(() => {
    if (!hypAlarm) return;
    const check = setInterval(() => { if (Date.now() >= hypAlarm) { setHypFired(true); setHypAlarm(null); } }, 10000);
    return () => clearInterval(check);
  }, [hypAlarm]);

  if (!data.loading && !settings.onboarded) {
    return <OnboardingScreen onComplete={(prefs) => data.saveSettings(prefs)} />;
  }

  const now = Date.now();
  const OD  = now - 5 * 86400000;
  const active  = tasks.filter(t => !t.done && (!t.snooze_until || t.snooze_until <= now));
  const done    = tasks.filter(t => t.done);
  const overdue = active.filter(t => new Date(t.created_at).getTime() < OD).length;
  const pct     = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
  const visibleActive = focusBiz ? active.filter(t => t.biz === focusBiz) : active;
  const topTask = [...visibleActive].sort((a, b) => QUAD_ORDER[a.quadrant] - QUAD_ORDER[b.quadrant])[0];
  const citd    = checkins.length > 0 && new Date(checkins[0].created_at).toDateString() === new Date().toDateString();
  const avgSc   = checkins.length ? Math.round(checkins.slice(0, 7).reduce((a, c) => a + c.score, 0) / Math.min(checkins.length, 7)) : null;
  const last7   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dk = d.toISOString().slice(0, 10);
    const ci = checkins.find(c => new Date(c.created_at).toISOString().slice(0, 10) === dk);
    return { score: ci?.score || 0, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) };
  });
  const bizColors = { [bizA]: C.purple, [bizB]: C.green, Personal: C.violet };

  async function addTask(taskData) {
    const t = await data.addTask(taskData);
    setCapPrev(t); setTimeout(() => setCapPrev(null), 3000);
  }
  function startFocus(task) { setFocusTask(task); setTab('focus-mode'); }
  async function markFocusDone(id) {
    await data.updateTask(id, { done: true });
    await data.addWin('Completed: ' + tasks.find(t => t.id === id)?.text);
    setFocusTask(null); setTab('home');
  }
  async function parkThought(text) {
    const c = classify(text, bizA, bizB);
    await data.addTask({ text, ...c, done: false });
  }
  async function runDump() {
    const res = dumpTxt.split('\n').map(x => x.trim()).filter(Boolean).map(text => ({ text, ...classify(text, bizA, bizB) }));
    setDumpRes(res);
  }
  async function acceptDump() {
    await Promise.all(dumpRes.map(i => data.addTask({ text: i.text, biz: i.biz, quadrant: i.quadrant, done: false })));
    setDumpTxt(''); setDumpRes(null);
  }
  async function sendChat() {
    const msg = chatIn.trim(); if (!msg) return;
    setChatIn(''); setChatLoading(true);
    const userMsg = { role: 'user', content: msg };
    setChat(c => [...c, userMsg]);
    const system = buildCoachSystem(bizA, bizB, tasks, wins, focusStats, delegations, energyLog);
    const history = [...chat, userMsg].slice(-8);
    const reply = await callClaude(history, system) || localCoachReply(msg, bizA, bizB, tasks, delegations);
    setChat(c => [...c, { role: 'assistant', content: reply }]);
    setChatLoading(false);
  }
  async function generateBrief() {
    setBrief({ text: '', loading: true });
    const system = buildBriefSystem(bizA, bizB);
    const topTasks = [...active].sort((a, b) => QUAD_ORDER[a.quadrant] - QUAD_ORDER[b.quadrant]).slice(0, 4).map(t => '- ' + t.text + ' (' + t.biz + ')').join('\n');
    const userMsg = 'Tasks:\n' + (topTasks || 'None') + '\n\nWins:\n' + (wins.slice(0, 3).map(w => '- ' + w.text).join('\n') || 'None') + '\n\nFocus: ' + focusStats.sessions + ' sessions.\nStreak: ' + checkins.length + ' check-ins.';
    const reply = await callClaude([{ role: 'user', content: userMsg }], system, 200);
    setBrief({ text: reply || 'Focus on your top task. Protect 9-12. One thing at a time.', loading: false });
    if (reply) localStorage.setItem('davesos_brief_' + todayKey(), reply);
  }
  async function submitCheckin() {
    const res = checkinReply(ciScore, done.length);
    await data.addCheckin({ score: ciScore, note: ciNote, response: res });
    setCiRes(res); setCiNote('');
  }
  function saveKick(a) {
    const u = { ...kick, a, done: true };
    setKick(u); localStorage.setItem('davesos_kick_' + todayKey(), JSON.stringify(u));
  }

  if (tab === 'focus-mode' && focusTask) {
    return <FocusMode task={focusTask} bizA={bizA} bizB={bizB}
      onExit={() => { setFocusTask(null); setTab('home'); }}
      onMarkDone={markFocusDone}
      onAddSession={data.addFocusSession}
      onParkThought={parkThought} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", background: C.bg, color: C.text, overflow: 'hidden' }}>

      <div style={{ width: 62, background: C.sidebar, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 1, flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, letterSpacing: '0.05em', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginBottom: 14, marginTop: 4 }}>Dave's OS</div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} title={n.label}
            style={{ background: tab === n.id ? C.purple : 'transparent', color: tab === n.id ? '#fff' : C.textFaint, border: 'none', borderRadius: 9, width: 46, height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontSize: 13 }}>{n.icon}</span>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: tab === n.id ? 'rgba(255,255,255,0.6)' : '#2A2A42' }}>{n.label}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', color: C.textFaint, fontSize: 11, cursor: 'pointer', padding: '8px' }}>⏻</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ background: C.sidebar, borderBottom: '1px solid ' + C.border, padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{greet()}, {settings.owner_name || 'Dave'} 👋</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
          <div style={{ flex: 1, maxWidth: 400, display: 'flex', gap: 7 }}>
            <input style={{ ...S.inp, flex: 1, fontSize: 13, padding: '6px 11px' }} placeholder="Capture anything... (Enter)" value={newTxt} onChange={e => setNewTxt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newTxt.trim()) { addTask({ text: newTxt.trim(), ...classify(newTxt.trim(), bizA, bizB), done: false }); setNewTxt(''); } }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {overdue > 0 && <div style={S.bdg('#2A1A00', C.amber)}>⚠ {overdue}</div>}
            {energyPrompt && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', background: '#1A1A2E', border: '1px solid ' + C.borderMid, borderRadius: 9, padding: '4px 10px' }}>
                <span style={{ fontSize: 11, color: '#6A6A9A' }}>Energy?</span>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => { data.logEnergy(n); setEnergyPrompt(false); }}
                    style={{ background: 'none', border: 'none', width: 20, height: 20, cursor: 'pointer', fontSize: 13, padding: 0, color: n <= 2 ? C.red : n === 3 ? C.amber : C.green, fontWeight: 600 }}>{n}</button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem('davesos_theme', next ? 'dark' : 'light');
                const t = themes[next ? 'dark' : 'light'];
                Object.keys(t).forEach(k => { C[k] = t[k]; });
                window.location.reload();
              }}
              style={{ background: 'none', border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 10px', fontSize: 14, cursor: 'pointer', color: C.textMid }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

          {tab === 'home' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              {hypFired && (
                <div style={{ background: '#2A0A0A', border: '2px solid ' + C.red, borderRadius: 13, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>Surface time, {settings.owner_name || 'Dave'}</div>
                    <div style={{ fontSize: 12, color: '#AA8080', marginTop: 2 }}>Hyperfocus alarm fired. Come up for air.</div>
                  </div>
                  <button onClick={() => setHypFired(false)} style={{ background: C.red + '22', color: C.red, border: '1px solid ' + C.red + '44', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Got it</button>
                </div>
              )}

              {badDayMode ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textFaint, marginBottom: 18 }}>Bad day mode</div>
                  {topTask ? (
                    <div>
                      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 10 }}>One thing. That is all.</div>
                      <div style={{ ...S.card, border: '1px solid #2A1A4A', background: '#13102A', marginBottom: 14, textAlign: 'left' }}>
                        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>{topTask.text}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => startFocus(topTask)} style={S.btn(C.purple)}>Focus on this</button>
                          <button onClick={() => data.updateTask(topTask.id, { done: true })} style={S.ghost}>Done</button>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.textFaint }}>Everything else can wait.</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 15, color: C.green, fontWeight: 600 }}>List is clear.</div>
                      <div style={{ fontSize: 12, color: C.textDim, marginTop: 5 }}>That is enough for a bad day.</div>
                    </div>
                  )}
                  <button onClick={() => setBadDayMode(false)} style={{ ...S.ghost, marginTop: 24, fontSize: 11 }}>Show full view</button>
                </div>
              ) : (
                <div>
                  <div style={{ ...S.card, background: '#0D0D16', border: '1px solid #1A1A2E', marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: brief.text ? 8 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
                        <span style={{ ...S.lbl, marginBottom: 0 }}>Morning brief</span>
                      </div>
                      <button onClick={generateBrief} disabled={brief.loading} style={{ background: 'none', border: '1px solid ' + C.border, borderRadius: 7, padding: '3px 9px', fontSize: 10, color: brief.loading ? C.textFaint : C.purple, cursor: brief.loading ? 'default' : 'pointer' }}>
                        {brief.loading ? '...' : brief.text ? 'refresh' : 'generate'}
                      </button>
                    </div>
                    {brief.loading && <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Claude is reading your day...</div>}
                    {brief.text && !brief.loading && (
                      <div>
                        {brief.text.split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginTop: i === 0 ? 0 : 6 }}>
                            <span style={{ color: i === 0 ? C.purple : i === 1 ? C.green : C.amber, fontSize: 11, flexShrink: 0, marginTop: 2 }}>▸</span>
                            <span style={{ fontSize: 13, lineHeight: 1.5, color: i === 0 ? '#C0BEE0' : i === 1 ? '#A0D8B8' : '#D8C080' }}>
                              {(line[0] === '-' || line[0] === '\u2022') ? line.slice(1).trim() : line.trim()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!brief.text && !brief.loading && <div style={{ fontSize: 12, color: C.textFaint }}>Hit generate for a Claude briefing built from your tasks, wins and energy.</div>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 14 }}>
                    {[
                      { v: active.length, l: 'tasks left', c: overdue > 0 ? C.amber : C.purple, sub: overdue > 0 ? overdue + ' overdue' : pct + '%' },
                      { v: done.length, l: 'done', c: C.green, sub: 'today' },
                      { v: focusStats.minutes + 'm', l: 'focused', c: C.violet, sub: focusStats.sessions + ' session' + (focusStats.sessions !== 1 ? 's' : '') },
                      { v: delegations.filter(d => d.status !== 'done').length, l: 'delegated', c: C.amber, sub: 'in progress' },
                    ].map((st, i) => (
                      <div key={i} style={S.statCard}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: st.c, lineHeight: 1 }}>{st.v}</div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{st.l}</div>
                        {st.sub && <div style={{ fontSize: 10, color: st.c + 'AA', marginTop: 2 }}>{st.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {checkins.length > 0 && (
                    <div style={{ ...S.card, padding: '10px 14px', marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        {last7.map((d, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 24, height: d.score > 0 ? d.score * 6 : 2, background: d.score > 0 ? (d.score >= 4 ? C.green : d.score >= 3 ? C.purple : C.red) : C.border, borderRadius: 4, transition: 'height 0.3s' }} />
                            <div style={{ fontSize: 9, color: C.textFaint }}>{d.label}</div>
                          </div>
                        ))}
                        <div style={{ borderLeft: '1px solid ' + C.border, paddingLeft: 10, marginLeft: 4 }}>
                          {avgSc && <div style={{ fontSize: 18, fontWeight: 700, color: C.purple, lineHeight: 1 }}>{avgSc}/5</div>}
                          <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>avg</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 14 }}>
                    {[bizA, bizB, 'Personal'].map(name => {
                      const bt = active.filter(t => t.biz === name);
                      const rc = radar.filter(r => r.biz === name && !r.done).length;
                      const col = bizColors[name] || C.textDim;
                      const isActive = focusBiz === name;
                      return (
                        <div key={name} onClick={() => setFocusBiz(isActive ? null : name)}
                          style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 0, borderColor: isActive ? col : col + '33', background: isActive ? col + '18' : C.bgCard, cursor: 'pointer' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: col }}>{name}</div>
                            <div style={{ fontSize: 11, color: isActive ? col + 'AA' : C.textDim, marginTop: 1 }}>{bt.length} task{bt.length !== 1 ? 's' : ''}{isActive ? ' — focused' : ''}</div>
                            {rc > 0 && <div style={{ fontSize: 10, color: col + '88', marginTop: 1 }}>◉ {rc} on radar</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {focusBiz && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
                      <div style={{ fontSize: 11, color: C.purple }}>Showing {focusBiz} tasks only</div>
                      <button onClick={() => setFocusBiz(null)} style={{ background: 'none', border: 'none', fontSize: 11, color: C.textDim, cursor: 'pointer' }}>show all ×</button>
                    </div>
                  )}

                  <div style={{ ...S.card, border: '1px solid ' + (kick.done ? '#1A3A2A' : '#2A1A4A'), background: kick.done ? '#0D1A12' : '#13101E' }}>
                    <span style={{ ...S.lbl, color: kick.done ? C.green : C.violet }}>Today's intention</span>
                    {kick.loaded && !kick.done && (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 10, lineHeight: 1.5, color: '#C0BEE0' }}>{kick.q}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input style={{ ...S.inp, flex: 1 }} placeholder="Your answer..." value={kick.a}
                            onChange={e => setKick(k => ({ ...k, a: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && kick.a.trim()) saveKick(kick.a.trim()); }} />
                          <button style={S.btn(C.green)} onClick={() => kick.a.trim() && saveKick(kick.a.trim())}>Set</button>
                        </div>
                      </div>
                    )}
                    {kick.done && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 18 }}>🎯</span>
                        <div>
                          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>{kick.q}</div>
                          <div style={{ fontSize: 15, color: C.green, fontWeight: 600 }}>"{kick.a}"</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {topTask ? (
                    <div style={{ ...S.card, border: '1px solid #2A1A4A', background: 'linear-gradient(135deg,#13102A,#160E24)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ ...S.lbl, color: C.purple, marginBottom: 0 }}>Start here</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={S.pill(QUADS.find(q => q.id === topTask.quadrant)?.color || C.purple)}>{QUADS.find(q => q.id === topTask.quadrant)?.label}</span>
                          <span style={{ fontSize: 11, color: C.textDim }}>{topTask.biz}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, lineHeight: 1.35 }}>{topTask.text}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => startFocus(topTask)} style={{ ...S.btn(C.purple), fontSize: 14, padding: '10px 20px' }}>▶ Focus on this</button>
                        <button onClick={() => data.updateTask(topTask.id, { done: true })} style={{ ...S.ghost, padding: '10px 16px' }}>✓ Mark done</button>
                        <button onClick={() => data.deleteTask(topTask.id)} style={{ ...S.ghost, padding: '10px 12px', fontSize: 12, color: C.textFaint }}>skip</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...S.card, textAlign: 'center', padding: '28px', border: '1px solid #1A3A2A', background: '#0D1A12' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                      <div style={{ fontSize: 16, color: C.green, fontWeight: 700 }}>Everything clear</div>
                      <div style={{ fontSize: 13, color: C.textDim, marginTop: 5 }}>Add a task to get started.</div>
                    </div>
                  )}

                  {visibleActive.length > 1 && (
                    <div style={S.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={S.lbl}>{focusBiz ? focusBiz + ' tasks' : 'Up next'}</span>
                        <button onClick={() => setTab('tasks')} style={{ fontSize: 12, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>All tasks →</button>
                      </div>
                      {[...visibleActive].sort((a, b) => QUAD_ORDER[a.quadrant] - QUAD_ORDER[b.quadrant]).slice(1, 5).map(t => (
                        <div key={t.id} style={S.row}>
                          <input type="checkbox" onChange={() => data.updateTask(t.id, { done: true })} style={{ accentColor: C.purple, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 14 }}>{t.text}</span>
                          <span style={S.pill(QUADS.find(q => q.id === t.quadrant)?.color || C.textDim)}>{QUADS.find(q => q.id === t.quadrant)?.label}</span>
                          <span style={{ fontSize: 11, color: C.textDim }}>{t.biz}</span>
                          <button onClick={() => startFocus(t)} style={{ background: '#1A1A2E', border: '1px solid ' + C.borderMid, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#8A8ADA', cursor: 'pointer' }}>▶</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {radar.filter(r => !r.done).length > 0 && <RadarTicker radar={radar} bizColors={bizColors} onGoToRadar={() => setTab('radar')} />}

                  {done.length > 0 && (
                    <div style={{ ...S.card, opacity: 0.5 }}>
                      <span style={S.lbl}>Done today ({done.length})</span>
                      {done.slice(0, 4).map(t => (
                        <div key={t.id} style={S.row}>
                          <input type="checkbox" checked onChange={() => data.updateTask(t.id, { done: false })} style={{ accentColor: C.green, width: 15, height: 15, cursor: 'pointer' }} />
                          <span style={{ flex: 1, fontSize: 14, color: C.textDim, textDecoration: 'line-through' }}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', paddingTop: 6 }}>
                    <button onClick={() => setBadDayMode(true)} style={{ background: 'none', border: 'none', fontSize: 11, color: C.textFaint, cursor: 'pointer' }}>
                      Having a rough day? →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <TasksTab tasks={tasks} bizA={bizA} bizB={bizB}
              onAdd={t => data.addTask(t)}
              onToggle={(id) => { const t = tasks.find(x => x.id === id); data.updateTask(id, { done: !t.done }); }}
              onDelete={data.deleteTask}
              onSnooze={(id, days) => data.updateTask(id, { snooze_until: Date.now() + days * 86400000 })}
              onReclassify={(id, updates) => data.updateTask(id, updates)}
              onFocus={startFocus} />
          )}

          {tab === 'dump' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={S.card}>
                <span style={S.lbl}>Brain dump</span>
                <div style={{ fontSize: 13, color: C.textDim, marginBottom: 10, lineHeight: 1.5 }}>Get everything out. One item per line. It sorts automatically.</div>
                <textarea style={{ ...S.ta, minHeight: 160 }} placeholder={'Call back Sarah\nFix Switch bug\nBook dentist\nThrowdown flyers...'} value={dumpTxt} onChange={e => setDumpTxt(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={S.btn(C.red)} onClick={runDump}>Sort it all out</button>
                  {dumpTxt && <button style={S.ghost} onClick={() => { setDumpTxt(''); setDumpRes(null); }}>Clear</button>}
                </div>
              </div>
              {dumpRes && (
                <div style={S.card}>
                  <span style={S.lbl}>{dumpRes.length} tasks sorted</span>
                  {dumpRes.map((item, i) => {
                    const q = QUADS.find(q => q.id === item.quadrant);
                    const col = bizColors[item.biz] || C.textDim;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid ' + C.border }}>
                        <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
                        <span style={{ ...S.pill(col), marginLeft: 0 }}>{item.biz}</span>
                        {q && <span style={{ ...S.pill(q.color), marginLeft: 0 }}>{q.label}</span>}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button style={S.btn(C.green)} onClick={acceptDump}>Add all to tasks ✓</button>
                    <button style={S.ghost} onClick={() => setDumpRes(null)}>Discard</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'matrix' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {QUADS.map(q => {
                  const qt = active.filter(t => t.quadrant === q.id);
                  return (
                    <div key={q.id} style={{ ...S.card, borderColor: q.color + '44' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: q.color, marginBottom: 1 }}>{q.label}</div>
                      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8 }}>
                        {['Urgent + Important','Not Urgent + Important','Urgent + Not Important','Not Urgent + Not Important'][QUADS.indexOf(q)]}
                      </div>
                      {qt.length === 0 && <div style={{ fontSize: 12, color: C.textFaint }}>Nothing here</div>}
                      {qt.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                          <input type="checkbox" onChange={() => data.updateTask(t.id, { done: true })} style={{ accentColor: q.color, marginTop: 2, cursor: 'pointer' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.35 }}>{t.text}</div>
                            <div style={{ fontSize: 10, color: C.textDim }}>{t.biz}</div>
                          </div>
                          <button onClick={() => startFocus(t)} style={{ background: q.color + '22', border: '1px solid ' + q.color + '44', borderRadius: 5, padding: '2px 6px', fontSize: 10, color: q.color, cursor: 'pointer' }}>▶</button>
                          <button onClick={() => data.deleteTask(t.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 13 }}>×</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'focus' && <FocusTab focusStats={focusStats} active={active} hypAlarm={hypAlarm} setHypAlarm={setHypAlarm} onStartFocus={startFocus} />}

          {tab === 'delegate' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={S.card}>
                <span style={S.lbl}>Delegation tracker</span>
                <input style={{ ...S.inp, marginBottom: 8 }} placeholder="What are you delegating..." value={newDel.task} onChange={e => setNewDel(d => ({ ...d, task: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input style={{ ...S.inp, flex: 1, minWidth: 90 }} placeholder="To who..." value={newDel.person} onChange={e => setNewDel(d => ({ ...d, person: e.target.value }))} />
                  <input type="date" style={{ ...S.inp, width: 'auto' }} value={newDel.due} onChange={e => setNewDel(d => ({ ...d, due: e.target.value }))} />
                  <button style={S.btn(C.amber)} onClick={() => { if (newDel.task.trim() && newDel.person.trim()) { data.addDelegation({ ...newDel, status: 'waiting' }); setNewDel({ task: '', person: '', due: '' }); } }}>Delegate</button>
                </div>
              </div>
              {['waiting','in-progress','done'].map(status => {
                const items = delegations.filter(d => d.status === status);
                if (!items.length) return null;
                const cfg = { waiting: { label: 'Waiting', color: C.amber }, 'in-progress': { label: 'In progress', color: C.purple }, done: { label: 'Done', color: C.green } };
                const { label, color } = cfg[status];
                return (
                  <div key={status} style={S.card}>
                    <span style={{ ...S.lbl, color }}>{label} ({items.length})</span>
                    {items.map(d => (
                      <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid ' + C.border }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14 }}>{d.task}</div>
                            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>→ {d.person}{d.due ? ' · due ' + new Date(d.due + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                            {status !== 'in-progress' && <button onClick={() => data.updateDelegation(d.id, { status: 'in-progress' })} style={{ ...S.ghost, fontSize: 11, padding: '3px 7px' }}>Started</button>}
                            {status !== 'done' && <button onClick={() => data.updateDelegation(d.id, { status: 'done' })} style={{ ...S.btn(C.green), fontSize: 11, padding: '3px 7px' }}>Done</button>}
                            <button onClick={() => data.deleteDelegation(d.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 14 }}>×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'wins' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={S.card}>
                <span style={S.lbl}>Log a win</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...S.inp, flex: 1 }} placeholder="What did you accomplish..." value={winTxt} onChange={e => setWinTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && winTxt.trim()) { data.addWin(winTxt.trim()); setWinTxt(''); } }} />
                  <button style={S.btn(C.amber)} onClick={() => { if (winTxt.trim()) { data.addWin(winTxt.trim()); setWinTxt(''); } }}>Log it</button>
                </div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>Wins rewire your brain. Small counts.</div>
              </div>
              {wins.map(w => (
                <div key={w.id} style={{ ...S.card, display: 'flex', gap: 9, alignItems: 'flex-start', padding: '12px 14px' }}>
                  <span style={{ fontSize: 15, color: C.amber, flexShrink: 0 }}>★</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{w.text}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{fmtDate(w.created_at)}</div>
                  </div>
                  <button onClick={() => data.deleteWin(w.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'checkin' && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div style={S.card}>
                <span style={S.lbl}>End of day check-in</span>
                {citd ? (
                  <div style={{ background: '#0A1E12', border: '1px solid #1A3A22', borderRadius: 9, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginBottom: 6 }}>Checked in today ✓</div>
                    <div style={{ fontSize: 13, color: '#A0DEB8', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{checkins[0]?.response}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: '#C0BEE0', marginBottom: 9 }}>How would you rate today? <span style={{ color: C.purple, fontWeight: 600 }}>{ciScore}/5</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setCiScore(n)} style={{ width: 38, height: 38, borderRadius: 9, border: '1px solid ' + (ciScore >= n ? C.purple : C.border), background: ciScore >= n ? '#1A1A2E' : C.bg, color: ciScore >= n ? '#9A8AF0' : C.textFaint, cursor: 'pointer', fontSize: 15 }}>★</button>
                        ))}
                      </div>
                    </div>
                    <textarea style={{ ...S.ta, minHeight: 65, marginBottom: 10 }} placeholder="What got done, what didn't, how you're feeling..." value={ciNote} onChange={e => setCiNote(e.target.value)} />
                    <button style={S.btn()} onClick={submitCheckin}>Submit check-in</button>
                  </div>
                )}
              </div>
              {ciRes && !citd && <div style={{ ...S.card, border: '1px solid #1A3A22', background: '#0A1E12' }}><div style={{ fontSize: 13, color: '#A0DEB8', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{ciRes}</div></div>}
            </div>
          )}

          {tab === 'radar' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ ...S.card, border: '1px solid #2A1A4A', background: '#13102A' }}>
                <span style={{ ...S.lbl, color: C.violet }}>Radar</span>
                <div style={{ fontSize: 13, color: C.textDim, marginBottom: 12, lineHeight: 1.6 }}>Things you're watching but not doing. Parked, not forgotten.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input style={{ ...S.inp, flex: 1, minWidth: 160 }} placeholder="What are you watching..." value={newRadar.text} onChange={e => setNewRadar(r => ({ ...r, text: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && newRadar.text.trim()) { data.addRadar({ ...newRadar }); setNewRadar({ text: '', owner: '', note: '', biz: 'General' }); } }} />
                  <input style={{ ...S.inp, width: 130 }} placeholder="Owner (optional)..." value={newRadar.owner} onChange={e => setNewRadar(r => ({ ...r, owner: e.target.value }))} />
                  <select style={S.sel} value={newRadar.biz} onChange={e => setNewRadar(r => ({ ...r, biz: e.target.value }))}>
                    {[bizA, bizB, 'Personal', 'General'].map(b => <option key={b}>{b}</option>)}
                  </select>
                  <button style={S.btn(C.violet)} onClick={() => { if (newRadar.text.trim()) { data.addRadar({ ...newRadar }); setNewRadar({ text: '', owner: '', note: '', biz: 'General' }); } }}>Add</button>
                </div>
              </div>
              {radar.filter(r => !r.done).length === 0 ? (
                <div style={{ ...S.card, textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 14, color: C.textDim }}>Nothing on the radar yet.</div>
                </div>
              ) : (
                <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                  {radar.filter(r => !r.done).map((item, idx, arr) => {
                    const col = bizColors[item.biz] || C.textDim;
                    return (
                      <div key={item.id} style={{ padding: '13px 16px', borderBottom: idx < arr.length - 1 ? '1px solid ' + C.border : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, lineHeight: 1.35 }}>{item.text}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{ ...S.pill(col), marginLeft: 0 }}>{item.biz}</span>
                              {item.owner && <span style={{ fontSize: 11, color: C.textDim }}>👤 {item.owner}</span>}
                              <span style={{ fontSize: 10, color: C.textFaint }}>{fmtDate(item.created_at)}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            <button onClick={() => { data.deleteRadar(item.id); data.addTask({ text: item.text, biz: item.biz === 'General' ? 'Personal' : item.biz, quadrant: 'noturgent-important', done: false }); }} style={{ ...S.ghost, fontSize: 11, padding: '3px 8px', color: C.green, borderColor: C.green + '44' }}>→ task</button>
                            <button onClick={() => data.updateRadar(item.id, { done: true })} style={{ ...S.ghost, fontSize: 11, padding: '3px 8px' }}>resolve</button>
                            <button onClick={() => data.deleteRadar(item.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', fontSize: 14 }}>×</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'coach' && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ ...S.card, borderLeft: '3px solid ' + C.purple, borderRadius: 0, background: '#13102A' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Your coach</div>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Powered by Claude. Knows your businesses, tasks, and patterns.</div>
              </div>
              {chat.length === 0 && (
                <div style={S.card}>
                  <span style={S.lbl}>How are you arriving today?</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['🔥 Fired up',"I'm feeling sharp and ready — help me make the most of today."],
                      ['😐 Distracted',"I'm okay but struggling to focus on what matters."],
                      ['😰 Overwhelmed',"Everything feels like too much and I don't know where to start."],
                      ['⚡ What first?','What should I work on first today?'],
                      ['👥 Delegation','What should I be handing off to my team right now?'],
                    ].map(([l, p]) => (
                      <button key={l} onClick={() => setChatIn(p)} style={{ ...S.ghost, fontSize: 12, padding: '6px 11px' }}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={S.card}>
                <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 10 }}>
                  {chat.length === 0 && <div style={{ textAlign: 'center', padding: '1.5rem', color: C.textFaint, fontSize: 13 }}>Your conversation will appear here.</div>}
                  {chat.map((m, i) => (
                    <div key={i} style={{ background: m.role === 'user' ? '#1A1A2E' : '#131320', border: '1px solid ' + (m.role === 'user' ? C.borderMid : C.border), borderLeft: m.role === 'assistant' ? '3px solid ' + C.purple : 'none', borderRadius: m.role === 'assistant' ? 0 : 9, padding: '10px 13px', paddingLeft: m.role === 'assistant' ? 11 : 13, marginBottom: 8, fontSize: 14, lineHeight: 1.7, color: m.role === 'user' ? '#9A8AF0' : '#C0BEE0' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: m.role === 'assistant' ? C.purple : C.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{m.role === 'assistant' ? 'Coach' : 'You'}</div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{m.content}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ background: '#131320', border: '1px solid ' + C.border, borderLeft: '3px solid ' + C.purple, borderRadius: 0, padding: '10px 11px', marginBottom: 8, fontSize: 14, color: C.textFaint }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Coach</div>
                      Thinking...
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...S.inp, flex: 1 }} placeholder={chat.length === 0 ? "What's on your mind..." : 'Reply...'} value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} disabled={chatLoading} />
                  <button style={{ ...S.btn(), opacity: chatLoading ? 0.5 : 1 }} onClick={sendChat} disabled={chatLoading}>Send</button>
                </div>
                {chat.length > 0 && <button style={{ ...S.ghost, marginTop: 6, fontSize: 12, padding: '4px 9px' }} onClick={() => setChat([])}>Clear</button>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function RadarTicker({ radar, bizColors, onGoToRadar }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const items = radar.filter(r => !r.done);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % items.length); setVisible(true); }, 400);
    }, 15000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[idx % items.length];
  const col = bizColors[item.biz] || C.textDim;

  return (
    <div onClick={onGoToRadar} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', marginBottom: 9, cursor: 'pointer', borderRadius: 10, border: '1px solid ' + C.border, background: '#12121A', opacity: visible ? 1 : 0, transition: 'opacity 0.4s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: col }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textFaint }}>Radar</span>
        {items.length > 1 && <span style={{ fontSize: 9, color: C.textFaint }}>{idx + 1}/{items.length}</span>}
      </div>
      <div style={{ width: 1, height: 14, background: C.border, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12, color: '#6A6A8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.text}{item.owner ? ' · ' + item.owner : ''}
      </span>
      <span style={{ ...S.pill(col), marginLeft: 0, flexShrink: 0 }}>{item.biz}</span>
    </div>
  );
}

function FocusTab({ focusStats, active, hypAlarm, setHypAlarm, onStartFocus }) {
  const [pomPhase, setPomPhase] = useState('work');
  const [pomActive, setPomActive] = useState(false);
  const [pomTime, setPomTime] = useState(25 * 60);
  const [pomElapsed, setPomElapsed] = useState(0);
  const pomRef = useRef(null);
  const POM = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const pomColor = pomPhase === 'work' ? C.purple : pomPhase === 'short' ? C.green : C.teal;
  const pomC = 2 * Math.PI * 54;
  const pomProg = pomElapsed / POM[pomPhase];

  function startPom() {
    clearInterval(pomRef.current); const dur = POM[pomPhase];
    setPomActive(true); setPomElapsed(0); setPomTime(dur);
    pomRef.current = setInterval(() => { setPomElapsed(e => { const n = e + 1; setPomTime(Math.max(0, dur - n)); if (n >= dur) { clearInterval(pomRef.current); setPomActive(false); } return n; }); }, 1000);
  }
  function stopPom() { clearInterval(pomRef.current); setPomActive(false); }
  function resetPom() { clearInterval(pomRef.current); setPomActive(false); setPomPhase('work'); setPomTime(POM.work); setPomElapsed(0); }
  useEffect(() => () => clearInterval(pomRef.current), []);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={S.card}>
        <span style={S.lbl}>Pomodoro timer</span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {[['work','Focus 25m',C.purple],['short','Short 5m',C.green],['long','Long 15m',C.teal]].map(([ph,lb,col]) => (
            <button key={ph} onClick={() => { if (!pomActive) { setPomPhase(ph); setPomTime(POM[ph]); setPomElapsed(0); } }}
              style={{ background: pomPhase===ph ? col+'22' : C.bg, color: pomPhase===ph ? col : C.textDim, border: '1px solid ' + (pomPhase===ph ? col+'55' : C.border), borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: pomPhase===ph ? 600 : 400, cursor: 'pointer' }}>{lb}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 0 1rem' }}>
          <div style={{ position: 'relative', width: 150, height: 150 }}>
            <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="75" cy="75" r="54" fill="none" stroke="#1A1A28" strokeWidth="8" />
              <circle cx="75" cy="75" r="54" fill="none" stroke={pomColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={String(pomC)} strokeDashoffset={String(pomC * (1 - pomProg))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(pomTime)}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{pomActive ? (pomPhase==='work' ? 'stay focused' : 'rest up') : 'ready'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {!pomActive ? <button style={S.btn(pomColor)} onClick={startPom}>Start</button> : <button style={S.btn(C.red)} onClick={stopPom}>Pause</button>}
            <button style={S.ghost} onClick={resetPom}>Reset</button>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <span style={S.lbl}>Hyperfocus alarm</span>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 10 }}>Set a "surface by" time so you don't disappear into one thing for hours.</div>
        {hypAlarm ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: C.green }}>⏰ Alarm set for {new Date(hypAlarm).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
            <button onClick={() => setHypAlarm(null)} style={{ ...S.ghost, fontSize: 11, padding: '4px 10px' }}>cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[30,45,60,90,120].map(mins => (
              <button key={mins} onClick={() => setHypAlarm(Date.now() + mins * 60000)} style={{ ...S.ghost, padding: '6px 13px', fontSize: 12 }}>
                {mins < 60 ? mins + 'm' : mins / 60 + 'h'}
              </button>
            ))}
          </div>
        )}
      </div>
      {active.length > 0 && (
        <div style={S.card}>
          <span style={S.lbl}>Focus on a task</span>
          {active.slice(0, 5).map(t => (
            <div key={t.id} style={S.row}>
              <span style={{ flex: 1, fontSize: 14 }}>{t.text}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>{t.biz}</span>
              <button onClick={() => onStartFocus(t)} style={{ background: '#1A1A2E', border: '1px solid ' + C.borderMid, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#8A8ADA', cursor: 'pointer' }}>▶</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
