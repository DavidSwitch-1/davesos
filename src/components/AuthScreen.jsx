import { useState } from 'react';
import { signIn, signUp, supabase } from '../lib/supabase';
import { S, C } from '../lib/styles';

export default function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    if (mode !== 'reset' && !password.trim()) return;
    setLoading(true); setError(''); setMessage('');

    if (mode === 'reset') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://davesos.vercel.app',
      });
      setLoading(false);
      if (err) setError(err.message);
      else setMessage('Check your email for a password reset link!');
      return;
    }

    const fn = mode === 'signin' ? signIn : signUp;
    const { data, error: err } = await fn(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data?.session) onAuth(data.session);
    else if (mode === 'signup') setMessage('Check your email to confirm your account, then sign in.');
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", color: C.text, padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Zoned</div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
            Get in the Zone.
          </div>
        </div>

        <div style={{ ...S.card, padding: '24px 28px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ ...S.lbl }}>Email</label>
            <input style={S.inp} type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
          </div>

          {mode !== 'reset' && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ ...S.lbl }}>Password</label>
              <input style={S.inp} type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          )}

          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: C.purple,
                  cursor: 'pointer', fontSize: 12 }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div style={{ fontSize: 13, color: C.red, marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
          {message && <div style={{ fontSize: 13, color: C.green, marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ ...S.btn(C.purple), width: '100%', padding: '10px',
              fontSize: 14, opacity: loading ? 0.6 : 1, marginBottom: 0 }}>
            {loading ? '...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: C.textDim }}>
          {mode === 'signin' && (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: 13 }}>
                Sign up
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: 13 }}>
                Sign in
              </button>
            </>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', fontSize: 13 }}>
              ← Back to sign in
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
