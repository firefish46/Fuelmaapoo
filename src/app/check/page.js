'use client';
import { useState, useEffect } from 'react';
import AppShell from '../../components/layout/AppShell';
import { parseRegistration, getInputHint, BRTA_CLASS_MAP } from '../../lib/bdRegistration';
import { normalizeRegistration } from '@/lib/utils';
import '@/styles/globals.css';
const VEHICLE_CLASSES = ['Motorcycle','Private Car','Pickup / SUV','Microbus','Minibus','Bus','Light Truck','Heavy Truck','Agricultural','Emergency'];

function FuelBar({ used, limit }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barClass = pct >= 100 ? 'high' : pct >= 75 ? 'mid' : 'low';
  return (
    <div className="fuel-bar-wrap">
      <div className="fuel-bar-meta">
        <span>Daily Usage</span>
        <span>{used.toFixed(1)} / {limit}L ({pct.toFixed(0)}%)</span>
      </div>
      <div className="fuel-bar">
        <div className={`fuel-bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CheckPage() {
  const [reg, setReg] = useState('');
  const [cls, setCls] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState(null);       // live class hint from reg input
  const [parsed, setParsed] = useState(null);   // full parsed result

  // Live parse as user types
 useEffect(() => {
  const p = parseRegistration(reg);
  setParsed(p);
  const h = getInputHint(reg);
  setHint(h);

  // Auto-fill class — use hint if full parse didn't work
  if (p?.isValid && p.suggestedSystemClass) {
    setCls(p.suggestedSystemClass);
  } else if (h?.systemClass && !cls) {
    setCls(h.systemClass);
  }
}, [reg]);

  async function handleCheck(e) {
    e.preventDefault();
    if (!reg.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
     const params = new URLSearchParams({ reg: normalizeRegistration(reg) });
      if (cls) params.set('class', cls);
      const res = await fetch(`/api/vehicles/check?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResult(data);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  const status = result
    ? result.isEligible === null ? 'warning'
      : result.isEligible ? 'valid' : 'invalid'
    : null;

  const statusLabel = result
    ? result.isEligible === null ? '⚠️ VEHICLE CLASS UNKNOWN'
      : result.isEligible ? '✅ ELIGIBLE FOR FUEL'
      : '❌ DAILY LIMIT REACHED — NOT ELIGIBLE'
    : null;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title"><span className="pt-icon">🔍</span> CHECK VEHICLE</div>
          <div className="page-subtitle">Verify Daily Fuel Eligibility</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><div className="ct-dot" />VEHICLE LOOKUP</div>

  <div className="format-guide">
  <strong>📋 REG FORMAT:</strong> [District]-[Class]-[Series]-[Number]
  <br />
  <span>Examples: </span>
  <span className="example">Dhaka Metro-B-11-1234</span>
  {'  ·  '}
  <span className="example">CTG-G-22-5678</span>
  {'  ·  '}
  <span className="example">Sylhet-MA-15-0099</span>
</div>

        <form onSubmit={handleCheck}>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Registration No.</label>
              <div className="input-wrap">
                <span className="input-icon">🚗</span>
                <input
                  className="form-control "
                  value={reg}
                  onChange={e => setReg(e.target.value.toUpperCase())}
                  placeholder="e.g. Dhaka Metro-B-11-1234"
                  style={{ textTransform: 'uppercase' }}
                  autoComplete="off"
                />
              </div>

        {hint && (
  <div className="reg-hint class-hint">
    <span className="reg-hint-icon">{hint.icon}</span>
    <div>
      <div>
        <span className="reg-hint-class">Class {hint.classCode}: {hint.label}</span>
        {hint.cc && <span className="reg-hint-cc">({hint.cc})</span>}
      </div>
      <div className="reg-hint-maps">→ Maps to: <strong>{hint.systemClass}</strong></div>
    </div>
  </div>
)}

       {parsed?.isValid && (
  <div className="reg-hint parse-hint">
    <span>📍</span>
    <span>
      <span className="reg-hint-district">{parsed.district}</span>
      <span className="reg-hint-sep">|</span>
      {parsed.classInfo.icon} <strong style={{color:'var(--text)'}}>{parsed.classInfo.label}</strong>
      <span className="reg-hint-sep">|</span>
      Series: {parsed.series} · No: {parsed.number}
    </span>
  </div>
)}
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Class</label>
              <select
                className="form-control"
                value={cls}
                onChange={e => setCls(e.target.value)}
              >
                <option value="">— Auto-detect from reg / history —</option>
                {VEHICLE_CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
          {parsed?.isValid && parsed.suggestedSystemClass && (
  <div className="auto-detect-label">
    ✓ Auto-detected: {parsed.classInfo.icon} {parsed.suggestedSystemClass}
    {parsed.classInfo.cc ? ` (${parsed.classInfo.cc})` : ''}
  </div>
)}
            </div>
          </div>

          <button type="submit" className="btn btn-primarycheck" disabled={loading || !reg.trim()}>
            {loading ? '⏳ Checking...' : '🔍 CHECK ELIGIBILITY'}
          </button>
        </form>

        {error && <div className="alert alert-error" style={{ marginTop: '0.8rem' }}>{error}</div>}

        {result && (
          <div className={`result-box ${status}`} style={{ marginTop: '1.2rem' }}>
            <div className="result-header">
              <span className="result-icon">{result.isEligible === null ? '⚠️' : result.isEligible ? '✅' : '❌'}</span>
              <span className={`result-title ${status}`}>{statusLabel}</span>
            </div>
            <div className="result-grid">
              <div className="result-item">
                <div className="result-item-label">Reg. Number</div>
                <div className="result-item-value">{result.vehicleReg}</div>
              </div>
              <div className="result-item">
                <div className="result-item-label">Vehicle Class</div>
                <div className="result-item-value">{result.detectedClass || 'Unknown'}</div>
              </div>
              <div className="result-item">
                <div className="result-item-label">Daily Limit</div>
                <div className="result-item-value">{result.dailyLimit !== null ? `${result.dailyLimit}L` : 'N/A'}</div>
              </div>
              <div className="result-item">
                <div className="result-item-label">Used Today</div>
                <div className="result-item-value" style={{ color: result.usedToday > 0 ? 'var(--accent2)' : 'inherit' }}>{result.usedToday}L</div>
              </div>
              <div className="result-item">
                <div className="result-item-label">Remaining</div>
                <div className="result-item-value" style={{ color: result.remaining === 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {result.remaining !== null ? `${result.remaining}L` : 'N/A'}
                </div>
              </div>
              <div className="result-item">
                <div className="result-item-label">Times Fueled Today</div>
                <div className="result-item-value">{result.timesServedToday}</div>
              </div>
            </div>
            {result.dailyLimit !== null && <FuelBar used={result.usedToday} limit={result.dailyLimit} />}
            {result.history?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Recent History
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>DATE</th><th>PUMP</th><th>AMOUNT</th><th>CLASS</th><th>STATUS</th></tr>
                    </thead>
                    <tbody>
                      {result.history.map(h => (
                        <tr key={h.id}>
                          <td className="dim">{new Date(h.date).toLocaleString()}</td>
                          <td>{h.pump}</td>
                          <td className="mono">{h.amount}L</td>
                          <td>{h.vehicleClass}</td>
                          <td><span className={`badge badge-${h.status === 'valid' ? 'green' : 'red'}`}>{h.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BRTA CLASS REFERENCE TABLE */}
      <div className="card">
        <div className="card-title"><div className="ct-dot amber" />BRTA VEHICLE CLASS REFERENCE</div>
        <div className="table-wrap">
         <table className="brta-ref-table">
            <thead>
              <tr><th>CLASS CODE</th><th>DESCRIPTION</th><th>ENGINE</th><th>SYSTEM CLASS</th></tr>
            </thead>
            <tbody>
              {Object.entries(BRTA_CLASS_MAP).map(([code, info]) => (
                <tr key={code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{code}</td>
                  <td>{info.icon} {info.label}</td>
                  <td className="dim">{info.cc || '—'}</td>
                  <td><span className="badge badge-blue">{info.systemClass}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}