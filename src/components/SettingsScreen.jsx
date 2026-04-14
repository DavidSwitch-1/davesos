import { useState } from 'react';
import { C, S } from '../lib/styles';
import { supabase } from '../lib/supabase';

export default function SettingsScreen({ settings, onSave, onClose, onSignOut, darkMode, onToggleDark }) {

  const [name,     setName]     = useState(settings.owner_name || '');
  const [bizA,     setBizA]     = useState(settings.biz_a || '');
  const [bizB,     setBizB]     = useState(settings.biz_b || '');
  const [bizC,     setBizC]     = useState(settings.biz_c || 'Personal');
  const [count,    setCount]    = useState(settings.workspace_count || 2);
  const [saved,    setSaved]    = useState(false);

  const [newEmail,     setNewEmail]     = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [emailMsg,     setEmailMsg]     = useState('');
  const [passMsg,      setPassMsg]      = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [passLoading,  setPassLoading]  = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setEmailLoading(true); setEmailMsg('');
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailLoading(false);
    if (error) setEmailMsg('Error: ' + error.message);
    else setEmailMsg('Confirmation sent to ' + newEmail + ' — check your inbox!');
    setNewEmail('');
  }

  async function handleChangePassword() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPass) { setPassMsg('Passwords do not match'); return; }
    if (newPassword.length < 6) { setPassMsg('Password must be at least 6 characters'); return; }
    setPassLoading(true); setPassMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    if (error) setPassMsg('Error: ' + error.message);
    else { setPassMsg('Password updated successfully!'); setNewPassword(''); setConfirmPass(''); }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('wins').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('radar').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('delegations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('energy_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('user_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch(e) {}
    await supabase.auth.signOut();
    setDeleteLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif",
      color: C.text, padding: '2rem', overflowY: 'auto' }}>

      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>

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
          <input style={{ ...S.inp, fontSize: 15 }} placeholder="e.g. Dave"
            value={name} onChange={e => setName(e.target.value)} />
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>Used in greetings and coach responses.</div>
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
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Workspace names</span>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>
              {count === 1 ? 'Your workspace' : 'Workspace 1'}
            </label>
            <input style={{ ...S.inp, fontSize: 14 }} placeholder="e.g. My Business..."
              value={bizA} onChange={e => setBizA(e.target.value)} />
          </div>
          {count >= 2 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>Workspace 2</label>
              <input style={{ ...S.inp, fontSize: 14 }} placeholder="e.g. Side project..."
                value={bizB} onChange={e => setBizB(e.target.value)} />
            </div>
          )}
          {count >= 3 && (
            <div>
              <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 5 }}>Workspace 3</label>
              <input style={{ ...S.inp, fontSize: 14 }} placeholder="e.g. Personal..."
                value={bizC} onChange={e => setBizC(e.target.value)} />
            </div>
          )}
        </div>

        <button onClick={handleSave}
          style={{ ...S.btn(saved ? C.green : C.purple), width: '100%',
            padding: '13px', fontSize: 15, fontWeight: 700, marginBottom: 24 }}>
          {saved ? '✓ Saved!' : 'Save changes'}
        </button>

        {/* Appearance */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Appearance</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{darkMode ? 'Dark mode' : 'Light mode'}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Toggle between dark and light</div>
            </div>
            <button onClick={onToggleDark}
              style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: 8,
                padding: '8px 14px', fontSize: 18, cursor: 'pointer' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Change email */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Change email</span>
          <input style={{ ...S.inp, fontSize: 14, marginBottom: 10 }}
            type="email" placeholder="New email address..."
            value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          {emailMsg && (
            <div style={{ fontSize: 12, color: emailMsg.startsWith('Error') ? C.red : C.green, marginBottom: 8 }}>
              {emailMsg}
            </div>
          )}
          <button onClick={handleChangeEmail} disabled={emailLoading || !newEmail.trim()}
            style={{ ...S.btn(C.purple), opacity: emailLoading || !newEmail.trim() ? 0.5 : 1, fontSize: 13 }}>
            {emailLoading ? '...' : 'Update email'}
          </button>
        </div>

        {/* Change password */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Change password</span>
          <input style={{ ...S.inp, fontSize: 14, marginBottom: 10 }}
            type="password" placeholder="New password..."
            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input style={{ ...S.inp, fontSize: 14, marginBottom: 10 }}
            type="password" placeholder="Confirm new password..."
            value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
          {passMsg && (
            <div style={{ fontSize: 12, color: passMsg.includes('success') ? C.green : C.red, marginBottom: 8 }}>
              {passMsg}
            </div>
          )}
          <button onClick={handleChangePassword} disabled={passLoading || !newPassword.trim()}
            style={{ ...S.btn(C.purple), opacity: passLoading || !newPassword.trim() ? 0.5 : 1, fontSize: 13 }}>
            {passLoading ? '...' : 'Update password'}
          </button>
        </div>

        {/* Sign out */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <span style={S.lbl}>Account</span>
          <button onClick={onSignOut}
            style={{ ...S.btn(C.purple), width: '100%', padding: '12px', fontSize: 14 }}>
            Sign out
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ ...S.card, border: '1px solid ' + C.red + '44', marginBottom: 24 }}>
          <span style={{ ...S.lbl, color: C.red }}>Danger zone</span>
          <div style={{ fontSize: 13, color: C.textDim, marginBottom: 12, lineHeight: 1.5 }}>
            Permanently delete your account and all data. This cannot be undone.
          </div>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              style={{ background: C.red + '22', color: C.red, border: '1px solid ' + C.red + '44',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Delete my account
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: C.red, marginBottom: 10, fontWeight: 600 }}>
                Are you sure? This will delete everything permanently.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                  style={{ ...S.btn(C.red), opacity: deleteLoading ? 0.6 : 1, fontSize: 13 }}>
                  {deleteLoading ? 'Deleting...' : 'Yes, delete everything'}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  style={{ ...S.ghost, fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
