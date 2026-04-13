import { useState } from 'react';
import { S, C } from '../lib/styles';
import { classify, QUADS, QUAD_ORDER } from '../lib/utils';

function TaskRow({ task, now, bizA, bizB, onToggle, onDelete, onReclassify, onFocus }) {
  const [showReclassify, setShowReclassify] = useState(false);
  const q = QUADS.find(q => q.id === task.quadrant);
  const old = new Date(task.created_at).getTime() < now - 5 * 86400000;
  const bizColors = { [bizA]: C.purple, [bizB]: C.green, Personal: C.violet };
  const col = bizColors[task.biz] || C.textDim;

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{ ...S.row, borderBottom: 'none',
        background: old ? '#1A1208' : 'transparent',
        borderRadius: old ? 7 : 0, paddingLeft: old ? 6 : 0 }}>
        <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)}
          style={{ accentColor: C.purple, width: 15, height: 15,
            cursor: 'pointer', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14,
          color: task.done ? C.textDim : C.text,
          textDecoration: task.done ? 'line-through' : 'none',
          lineHeight: 1.35 }}>{task.text}</span>
        {old && <span style={S.bdg('#2A1A00', C.amber)}>
          {Math.floor((now - new Date(task.created_at).getTime()) / 86400000)}d
        </span>}
        {q && <span style={S.pill(q.color)}>{q.label}</span>}
        <button onClick={() => setShowReclassify(r => !r)}
          style={{ background: showReclassify ? '#1A1A2E' : 'none',
            border: `1px solid ${showReclassify ? C.borderMid : 'transparent'}`,
            borderRadius: 6, padding: '2px 8px', fontSize: 11,
            color: col, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
          {task.biz}
        </button>
        {!task.done && (
          <button onClick={() => onFocus(task)}
            style={{ background: '#1A1A2E', border: `1px solid ${C.borderMid}`,
              borderRadius: 6, padding: '3px 8px', fontSize: 11,
              color: '#8A8ADA', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
            ▶
          </button>
        )}
        <button onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none',
            color: C.textFaint, cursor: 'pointer', fontSize: 15 }}>×</button>
      </div>

      {showReclassify && (
        <div style={{ display: 'flex', gap: 5, padding: '6px 0 8px 23px',
          alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: C.textDim, marginRight: 2 }}>Move to:</span>
          {[bizA, bizB, 'Personal'].filter(b => b !== task.biz).map(biz => (
            <button key={biz}
              onClick={() => { onReclassify(task.id, { biz }); setShowReclassify(false); }}
              style={{ background: (bizColors[biz] || C.textDim) + '22',
                color: bizColors[biz] || C.textDim,
                border: `1px solid ${(bizColors[biz] || C.textDim)}44`,
                borderRadius: 6, padding: '3px 10px',
                fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{biz}</button>
          ))}
          <span style={{ fontSize: 10, color: C.textFaint, marginLeft: 4 }}>Priority:</span>
          {QUADS.map(qt => (
            <button key={qt.id} onClick={() => onReclassify(task.id, { quadrant: qt.id })}
              style={{ background: task.quadrant === qt.id ? qt.color + '33' : 'transparent',
                color: task.quadrant === qt.id ? qt.color : C.textFaint,
                border: `1px solid ${task.quadrant === qt.id ? qt.color + '55' : C.border}`,
                borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
              {qt.label}
            </button>
          ))}
          <button onClick={() => setShowReclassify(false)}
            style={{ background: 'none', border: 'none',
              color: C.textDim, cursor: 'pointer', fontSize: 11 }}>done</button>
        </div>
      )}
    </div>
  );
}

export default function TasksTab({ tasks, bizA, bizB, onAdd, onToggle, onDelete, onReclassify, onFocus }) {
  const [newTxt, setNewTxt] = useState('');
  const [capPrev, setCapPrev] = useState(null);
  const now = Date.now();

  function addTask() {
    if (!newTxt.trim()) return;
    const c = classify(newTxt.trim(), bizA, bizB);
    onAdd({ text: newTxt.trim(), ...c, done: false });
    setCapPrev({ text: newTxt.trim(), ...c });
    setNewTxt('');
    setTimeout(() => setCapPrev(null), 3000);
  }

  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const bizColors = { [bizA]: C.purple, [bizB]: C.green, Personal: C.violet };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={S.card}>
        <span style={S.lbl}>Quick capture</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...S.inp, flex: 1 }}
            placeholder="What needs doing..."
            value={newTxt}
            onChange={e => setNewTxt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            autoFocus />
          <button style={S.btn()} onClick={addTask}>Capture</button>
        </div>
        {capPrev && (
          <div style={{ marginTop: 7, background: '#1A1A2E',
            border: `1px solid ${C.borderMid}`, borderRadius: 7,
            padding: '7px 11px', fontSize: 13, color: '#8A8ADA' }}>
            ✦ Filed to {capPrev.biz} · {QUADS.find(q => q.id === capPrev.quadrant)?.label}
          </div>
        )}
      </div>

      {[bizA, bizB, 'Personal'].map(biz => {
        const bt = active.filter(t => t.biz === biz);
        if (!bt.length) return null;
        const col = bizColors[biz] || C.textDim;
        return (
          <div key={biz} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...S.lbl, color: col, marginBottom: 0 }}>{biz}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>
                {bt.length} task{bt.length !== 1 ? 's' : ''}
              </span>
            </div>
            {[...bt].sort((a, b) => QUAD_ORDER[a.quadrant] - QUAD_ORDER[b.quadrant])
              .map(t => (
                <TaskRow key={t.id} task={t} now={now} bizA={bizA} bizB={bizB}
                  onToggle={onToggle} onDelete={onDelete}
