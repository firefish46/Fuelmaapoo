'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import styles from '@/styles/Login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [tab, setTab] = useState('govt');
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setForm({ username: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter username and password');
      return;
    }
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      toast('Login successful', 'success');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
     
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.logoRow}>
          {/*<div className={styles.logoIcon}><i className="fa-solid fa-gas-pump"></i></div>*/}
            <h1 className={styles.title}><i className="fa-solid fa-gas-pump"></i>Fuel<span>Mapoo</span></h1>
            <p className={styles.subtitle}> 🇧🇩</p>
          </div>
          <p className={styles.subtitle}> Supply Monitoring System</p>
        </div>

        <div className={styles.box}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'govt' ? styles.tabActive : ''}`}
              onClick={() => switchTab('govt')}
            >
              ▲ Govt Admin
            </button>
            <button
              className={`${styles.tab} ${styles.tabAmber} ${tab === 'pump' ? styles.tabActive : ''}`}
              onClick={() => switchTab('pump')}
            >
              ⛽ Pump Operator
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder={tab === 'govt' ? 'Govt username' : 'Operator username'}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} ${tab === 'govt' ? styles.submitGovt : styles.submitPump}`}
              disabled={loading}
            >
              {loading ? <span className={styles.spinner} /> : null}
              {loading ? 'Authenticating...' : `Login as ${tab === 'govt' ? 'Govt Admin' : 'Pump Operator'}`}
            </button>
          </form>

          {error && <p className={styles.error}>✕ {error}</p>}
        </div>
      </div>
    </div>
  );
}