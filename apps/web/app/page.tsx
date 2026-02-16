'use client';

import { FormEvent, useEffect, useState } from 'react';
import Dashboard from './components/dashboard';

const AUTH_KEY = 'farma_auth';
const APP_USER = 'admin';
const APP_PASS = '1234qwer';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAuthenticated(localStorage.getItem(AUTH_KEY) === '1');
    setReady(true);
  }, []);

  function submitLogin(e: FormEvent) {
    e.preventDefault();

    if (user.trim() === APP_USER && pass === APP_PASS) {
      localStorage.setItem(AUTH_KEY, '1');
      setAuthenticated(true);
      setError('');
      return;
    }

    setError('Invalid credentials');
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
    setPass('');
  }

  if (!ready) return null;

  if (authenticated) {
    return <Dashboard onLogout={logout} />;
  }

  return (
    <div className="farma-login-page">
      <div className="farma-login-card">
        <div className="farma-login-logo" />
        <h1 className="farma-login-title">Haytazentavo</h1>
        <p className="farma-login-sub">Sign in to continue</p>

        <form onSubmit={submitLogin}>
          <div className="mb-3">
            <label className="form-label farma-label">User</label>
            <input className="form-control farma-input" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </div>
          <div className="mb-3">
            <label className="form-label farma-label">Password</label>
            <input type="password" className="form-control farma-input" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </div>
          {error ? <div className="farma-login-error mb-3">{error}</div> : null}
          <button type="submit" className="btn farma-btn w-100">Log In</button>
        </form>

        <div className="farma-login-hint mt-3">
          user: <b>admin</b> | pass: <b>1234qwer</b>
        </div>
      </div>
    </div>
  );
}
