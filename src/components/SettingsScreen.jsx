import { useState } from 'react';
import { C, S } from '../lib/styles';

export default function SettingsScreen({ settings, onSave, onClose }) {
  const [name,     setName]     = useState(settings.owner_name || '');
  const [bizA,     setBizA]     = useState(settings.biz_a || '');
  const [bizB,     setBizB]     = useState(settings.biz_b || '');
  const [bizC,     setBizC]     = useState(settings.biz_c || 'Personal');
  const [count,    setCount]    = useState(settings.workspace_count || 2);
  const [saved,    setSaved]    = useState(false);

  async function handleSave() {
    await onSave({
      owner_name: name.trim() || 'there',
      biz_a: bizA.trim() || 'Business 1',
      biz_b: bizB.trim() || 'Business 2',
      biz_c: bizC.trim() || 'Personal',
      workspace_count: count,
      onboarded: true,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif",
      color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '2rem' }}>

      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Settings</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>Personalise your workspace</div>
          </div>
          <button onClick={onClose}
            style={{ background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 8,
              padding: '8px 14px', fontSize: 13, color: C.textMid, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>

        {/* Name */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Your name</span>
          <input style={{ ...S.inp, fontSize: 15 }}
            placeholder="e.g. Dave"
            value={name}
            onChange={e => setName(e.target.value)} />
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>
            Used in greetings and coach responses.
          </div>
        </div>

        {/* Workspace count */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Number of workspaces</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setCount(n)}
                style={{ flex: 1, padding: '10px', borderRadius: 9,
                  border: '1px solid ' + (count === n ? C.purple : C.border),
                  background: count === n ? C.purple + '22' : C.bg,
                  color: count === n ? C.purple : C.textDim,
                  fontWeight: count === n ? 700 : 400,
                  cursor: 'pointer', fontSize: 14 }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace names */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <span style={S.lbl}>Workspace names</span>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>
              {count === 1 ? 'Your workspace' : 'Workspace 1'}
            </label>
            <input style={{ ...S.inp, fontSize: 14 }}
              placeholder="e.g. Swi-tch, My Business..."
              value={bizA} onChange={e => setBizA(e.target.value)} />
          </div>

          {count >= 2 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>
                Workspace 2
              </label>
              <input style={{ ...S.inp, fontSize: 14 }}
                placeholder="e.g. Throwdown, Side project..."
                value={bizB} onChange={e => setBizB(e.target.value)} />
            </div>
          )}

          {count >= 3 && (
            <div>
              <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>
                Workspace 3
              </label>
              <input style={{ ...S.inp, fontSize: 14 }}
                placeholder="e.g. Personal, Life admin..."
                value={bizC} onChange={e => setBizC(e.target.value)} />
            </div>
          )}
        </div>

        <button onClick={handleSave}
          style={{ ...S.btn(saved ? C.green : C.purple), width: '100%',
            padding: '13px', fontSize: 15, fontWeight: 700 }}>
          {saved ? '✓ Saved!' : 'Save changes'}
        </button>

      </div>
    </div>
  );
}
