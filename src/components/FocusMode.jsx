import { useState, useEffect, useRef } from 'react';
import { C, S } from '../lib/styles';
import { fmtTime, QUADS } from '../lib/utils';

const POM = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const POM_R = 54;
const POM_C = 2 * Math.PI * POM_R;

export default function FocusMode({ task, onExit, onMarkDone, onAddSession, onParkThought }) {
  const [pomPhase, setPomPhase] = useState('work');
  const [pomActive, setPomActive] = useState(false);
  const [pomTime, setPomTime] = useState(POM.work);
  const [pomElapsed, setPomElapsed] = useState(0);
  const [pomCount, setPomCount] = useState(0);
  const [parkVal, setParkVal] = useState('');
  const [parked, setParked] = useState(false);
  const pomRef = useRef(null);

  const pomColor = pomPhase === 'work' ? C.purple : pomPhase === 'short' ? C.green : C.teal;
  const pomProg = pomElapsed / POM[pomPhase];

  function startPom() {
    clearInterval(pomRef.current);
    const dur = POM[pomPhase];
    setPomActive(true); setPomElapsed(0); setPomTime(dur);
    pomRef.current = setInterval(() => {
      setPomElapsed(e => {
        const n = e + 1; setPomTime(Math.max(0, dur - n));
        if (n >= dur) {
          clearInterval(pomRef.current); setPomActive(false);
          if (pomPhase === 'work') {
            onAddSession(25);
            setPomCount(c => {
              const nc = c + 1;
              const np = nc % 4 === 0 ? 'long' : 'short';
              setPomPhase(np); setPomTime(POM[np]);
              return nc;
            });
          } else { setPomPhase('work'); setPomTime(POM.work); }
        }
        return n;
      });
    }, 1000);
  }

  function stopPom() { clearInterval(pomRef.current); setPomActive(false); }
  function resetPom() {
    clearInterval(pomRef.current); setPomActive(false);
    setPomCount(0); setPomPhase('work'); setPomTime(POM.work); setPomElapsed(0);
  }

  useEffect(() => () => clearInterval(pomRef.current), []);

  function park() {
    if (!parkVal.trim()) return;
    onParkThought(parkVal.trim());
    setParkVal(''); setParked(true);
    setTimeout(() => setParked(false), 2000);
  }

  const q = QUADS.find(q => q.id === task.quadrant);

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: "'Inter', sans-serif", color: '#fff' }}>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: C.purple, marginBottom: 12 }}>Now focusing</div>
      <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center',
        maxWidth: 400, lineHeight: 1.35, marginBottom: 6 }}>{task.text}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
        {task.biz}{q ? ` · ${q.label}` : ''}
      </div>

      <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 22 }}>
        <svg width="160" height="160" viewBox="0 0 160 160"
          style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r={POM_R} fill="none" stroke="#1A1A28" strokeWidth="8" />
          <circle cx="80" cy="80" r={POM_R} fill="none" stroke={pomColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={String(POM_C)}
            strokeDashoffset={String(POM_C * (1 - pomProg))}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
            {fmtTime(pomTime)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            {pomActive ? (pomPhase === 'work' ? 'focused' : pomPhase === 'short' ? 'short break' : 'long break') : 'ready'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[['work','Focus'],['short','Short'],['long','Long']].map(([ph, lb]) => (
          <button key={ph}
            onClick={() => { if (!pomActive) { setPomPhase(ph); setPomTime(POM[ph]); setPomElapsed(0); } }}
            style={{ background: pomPhase === ph ? pomColor + '33' : '#0D0D14',
              color: pomPhase === ph ? pomColor : 'rgba(255,255,255,0.35)',
              border: `1px solid ${pomPhase === ph ? pomColor + '66' : '#1E1E2E'}`,
              borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
              fontWeight: pomPhase === ph ? 600 : 400 }}>{lb}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {!pomActive
          ? <button onClick={startPom}
              style={{ background: pomColor, color: '#fff', border: 'none',
                borderRadius: 9, padding: '12px 28px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer' }}>▶  Start</button>
          : <button onClick={stopPom}
              style={{ background: C.red, color: '#fff', border: 'none',
                borderRadius: 9, padding: '12px 28px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer' }}>⏸  Pause</button>
        }
        <button onClick={resetPom}
          style={{ background: '#0D0D14', color: 'rgba(255,255,255,0.4)',
            border: '1px solid #1E1E2E', borderRadius: 9,
            padding: '12px 16px', fontSize: 13, cursor: 'pointer' }}>Reset</button>
      </div>

      {pomCount > 0 && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
          {pomCount} pomodoro{pomCount !== 1 ? 's' : ''} this session
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => { resetPom(); onMarkDone(task.id); }}
          style={{ background: C.green, color: '#fff', border: 'none',
            borderRadius: 9, padding: '11px 20px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer' }}>✓  Done — log as win</button>
        <button onClick={() => { resetPom(); onExit(); }}
          style={{ background: '#0D0D14', color: 'rgba(255,255,255,0.4)',
            border: '1px solid #1E1E2E', borderRadius: 9,
            padding: '11px 16px', fontSize: 13, cursor: 'pointer' }}>← Back</button>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)',
          marginBottom: 6, textAlign: 'center' }}>
          Intrusive thought? Park it and stay focused
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input value={parkVal} onChange={e => setParkVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && park()}
            placeholder="Type it, park it, forget it..."
            style={{ flex: 1, background: '#0D0D14', border: '1px solid #1E1E2E',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: 'rgba(255,255,255,0.5)', outline: 'none' }} />
          <button onClick={park}
            style={{ background: '#1A1A2E', color: C.purple,
              border: '1px solid #2A2A4A', borderRadius: 8,
              padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {parked ? '✓' : 'Park'}
          </button>
        </div>
      </div>
    </div>
  );
}
