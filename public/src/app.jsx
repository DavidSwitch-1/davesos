import { useState, useEffect, useRef } from 'react';
import { supabase, signOut } from './lib/supabase';
import { useAppData } from './hooks/useAppData';
import { classify, QUADS, QUAD_ORDER, greet, fmtDate, fmtTime, todayKey, mornQ, checkinReply, localCoachReply } from './lib/utils';
import { callClaude, buildCoachSystem, buildBriefSystem } from './lib/claude';
import { S, C } from './lib/styles';
import AuthScreen from './components/AuthScreen';
import TasksTab from './components/TasksTab';
import FocusMode from './components/FocusMode';

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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Inter', sans-serif", color: C.textDim }}>
      Loading...
    </div>
  );

  if (!session) return <AuthScreen onAuth={setSession} />;
  return <Dashboard session={session} />;
}

function Dashboard({ session }) {
  const userId = session.user.id;
  const data = useAppData(userId);
  const { tasks, wins, radar, delegations, checkins, energyLog, settings, focusStats } = data;
  const bizA = settings.biz_a;
  const bizB = settings.biz_b;

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

  useEffect(() => {
    const sk = JSON.parse(localStorage.getItem('davesos_kick_' + todayKey()) || 'null');
    if (sk) setKick({ ...sk, loaded: true });
    else { const q = mornQ(bizA); const st = { q, a: '', done: false, loaded: true }; setKick(st); localStorage.setItem('davesos_kick_' + todayKey(), JSON.stringify(st)); }
    const lastE = parseInt(localStorage.getItem('davesos_energy_ts') || '0');
    if (Date.now() - lastE > 4 * 3600000) setEnergyPrompt(true);
  }, [bizA]);

  useEffect(() => {
    if (!hypAlarm) return;
    const check = setInterval(() => { if (Date.now() >= hypAlarm) { setHypFired(true); setHypAlarm(null); } }, 10000);
    return () => clearInterval(check);
  }, [hypAlarm]);

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
    const userMsg = 'Tasks:\n' + (topTasks || 'None') + '\n\nWins:\n' + (wins.slice(0, 3).map(w => '- ' + w.text).join('\n') || 'None') + '\n\nFocus: ' + focusStats.sessions +
