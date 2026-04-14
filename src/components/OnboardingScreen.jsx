import { useState } from 'react';
import { C, S } from '../lib/styles';

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [workspaceCount, setWorkspaceCount] = useState(2);
  const [bizA, setBizA] = useState('');
  const [bizB, setBizB] = useState('');
  const [bizC, setBizC] = useState('');

  function handleComplete() {
    onComplete({
      owner_name: name.trim() || 'there',
      biz_a: bizA.trim() || 'Business 1',
      biz_b: workspaceCount >= 2 ? (bizB.trim() || 'Business 2') : 'Business 2',
      biz_c: workspaceCount >= 3 ? (bizC.trim() || 'Personal') : 'Personal',
      workspace_count: workspaceCount,
      onboarded: true,
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D14', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", color: '#E0DEF0', padding: '2rem' }}>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Welcome to Zoned</div>
          <div style={{ fontSize: 14, color: '#4A4A6A' }}>Let's set it up for you — takes 30 seconds</div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8,
              borderRadius: 99, background: i === step ? '#6C63FF' : i < step ? '#10B981' : '#1E1E2E',
              transition: 'all 0.3s' }} />
          ))}
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>What's your name?</div>
            <div style={{ fontSize: 14, color: '#4A4A6A', marginBottom: 24 }}>
              So the app can greet you properly each morning.
            </div>
            <input
              style={{ ...S.inp, fontSize: 16, padding: '12px 14px', marginBottom: 24 }}
              placeholder="e.g. Dave"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
              autoFocus
            />
            <button
              onClick={() => name.trim() && setStep(2)}
              disabled={!name.trim()}
              style={{ ...S.btn('#6C63FF'), width: '100%', padding: '12px',
                fontSize: 15, opacity: name.trim() ? 1 : 0.4 }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — How many workspaces */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Hi {name}! How many areas do you want to track?
            </div>
            <div style={{ fontSize: 14, color: '#4A4A6A', marginBottom: 24 }}>
              These could be businesses, projects, or life areas.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { n: 1, label: 'Just one', sub: 'One business or focus area' },
                { n: 2, label: 'Two', sub: 'Two businesses or areas' },
                { n: 3, label: 'Three', sub: 'Two businesses plus personal' },
              ].map(opt => (
                <div key={opt.n} onClick={() => setWorkspaceCount(opt.n)}
                  style={{ ...S.card, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 12, border: workspaceCount === opt.n ? '1px solid #6C63FF' : '1px solid #1E1E2E',
                    background: workspaceCount === opt.n ? '#6C63FF18' : '#161622' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${workspaceCount === opt.n ? '#6C63FF' : '#2A2A4A'}`,
                    background: workspaceCount === opt.n ? '#6C63FF' : 'transparent',
                    flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#4A4A6A' }}>{opt.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)}
                style={{ ...S.ghost, flex: 1, padding: '12px', fontSize: 14 }}>← Back</button>
              <button onClick={() => setStep(3)}
                style={{ ...S.btn('#6C63FF'), flex: 2, padding: '12px', fontSize: 14 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Name the workspaces */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Name your areas
            </div>
            <div style={{ fontSize: 14, color: '#4A4A6A', marginBottom: 24 }}>
              These appear throughout the app. You can change them later.
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...S.lbl }}>
                {workspaceCount === 1 ? 'Your focus area' : 'First area'}
              </label>
              <input style={{ ...S.inp, fontSize: 15 }}
                placeholder={workspaceCount === 1 ? 'e.g. My Business' : 'e.g. Swi-tch, Agency, Consulting...'}
                value={bizA} onChange={e => setBizA(e.target.value)} autoFocus />
            </div>

            {workspaceCount >= 2 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...S.lbl }}>Second area</label>
                <input style={{ ...S.inp, fontSize: 15 }}
                  placeholder="e.g. Throwdown, Side project..."
                  value={bizB} onChange={e => setBizB(e.target.value)} />
              </div>
            )}

            {workspaceCount >= 3 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...S.lbl }}>Third area</label>
                <input style={{ ...S.inp, fontSize: 15 }}
                  placeholder="e.g. Personal, Life admin..."
                  value={bizC} onChange={e => setBizC(e.target.value)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(2)}
                style={{ ...S.ghost, flex: 1, padding: '12px', fontSize: 14 }}>← Back</button>
              <button onClick={handleComplete}
                style={{ ...S.btn('#10B981'), flex: 2, padding: '12px', fontSize: 15, fontWeight: 700 }}>
                Let's go! ⚡
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
