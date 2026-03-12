'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../lib/ToastContext';
// Change import line:
import { parseRegistration, getInputHint, validateRegistration } from '../../lib/bdRegistration';
import { normalizeReg } from '../../lib/utils';
import ui from '@/styles/UI.module.css';
const VEHICLE_CLASSES = [
  'Motorcycle', 'Private Car', 'Pickup / SUV', 'Microbus',
  'Minibus', 'Bus', 'Light Truck', 'Heavy Truck', 'Agricultural', 'Emergency'
];
const ICONS = {
  'Motorcycle':'🏍', 'Private Car':'🚗', 'Pickup / SUV':'🚙', 'Microbus':'🚐',
  'Minibus':'🚌', 'Bus':'🚌', 'Light Truck':'🚛', 'Heavy Truck':'🚚',
  'Agricultural':'🚜', 'Emergency':'🚑'
};

export default function DispensePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [pumps, setPumps] = useState([]);
  const [form, setForm] = useState({
    vehicleReg: '', vehicleClass: '', amountLiters: '', pumpId: '', ownerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
const [regError, setRegError] = useState('');
  // Detection state
  const [detecting, setDetecting]       = useState(false);   // spinner while fetching history
  const [detectedFrom, setDetectedFrom] = useState(null);    // 'reg' | 'history' | null
  const [hint, setHint]                 = useState(null);    // live BRTA hint while typing
  const debounceRef = useRef(null);

  useEffect(() => {
    async function loadPumps() {
      const res = await fetch('/api/pumps');
      if (!res.ok) return;
    const data = await res.json();
if (!res.ok) {
  setError(data.error || `Server error ${res.status}`);
  console.error('[DISPENSE]', res.status, data);
  return;
}
      const allPumps = data.pumps || [];
      setPumps(allPumps);
      if (user?.role === 'pump' && user?.pumpId) {
        setForm(f => ({ ...f, pumpId: user.pumpId }));
      } else if (allPumps.length > 0) {
        setForm(f => ({ ...f, pumpId: allPumps[0]._id }));
      }
    }
    if (user) loadPumps();
  }, [user]);

  // Live hint while typing (no debounce needed — pure local parse)
  useEffect(() => {
    setHint(getInputHint(form.vehicleReg));
  }, [form.vehicleReg]);

useEffect(() => {
  if (!form.vehicleReg || form.vehicleReg.length < 4) {
    setDetectedFrom(null);
    setRegError('');
    setForm(f => ({ ...f, vehicleClass: '' }));
    return;
  }

  // Always run strict validation
  const validation = validateRegistration(form.vehicleReg);
  if (!validation.isValid) {
    setRegError(validation.error || 'Invalid registration format');
  } else {
    setRegError('');
  }

  // Try full parse for class detection
  const parsed = parseRegistration(form.vehicleReg);
  if (parsed?.isValid && parsed.suggestedSystemClass) {
    setForm(f => ({ ...f, vehicleClass: parsed.suggestedSystemClass }));
    setDetectedFrom('reg');
    setDetecting(false);
    return;
  }

  const h = getInputHint(form.vehicleReg);
  if (h?.systemClass) {
    setForm(f => ({ ...f, vehicleClass: h.systemClass }));
    setDetectedFrom('reg');
    setDetecting(false);
    return;
  }

  setDetecting(true);
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    try {
      const res = await fetch(`/api/vehicles/check?reg=${form.vehicleReg}`);
      const d   = await res.json();
      if (d.detectedClass) {
        setForm(f => ({ ...f, vehicleClass: d.detectedClass }));
        setDetectedFrom('history');
      } else {
        setDetectedFrom(null);
        setForm(f => ({ ...f, vehicleClass: '' }));
      }
    } catch {}
    finally { setDetecting(false); }
  }, 600);

  return () => clearTimeout(debounceRef.current);
}, [form.vehicleReg]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vehicleReg || !form.vehicleClass || !form.amountLiters || !form.pumpId) {
      setError('Please fill all required fields');
      return;
    }
    if (!form.vehicleClass) {
      setError('Vehicle class could not be detected. Please enter a valid registration number.');
      return;
    }
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amountLiters: parseFloat(form.amountLiters) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setReceipt(data);
      if (data.status === 'valid') {
        toast(`${data.effectiveAmount || form.amountLiters}L dispensed to ${form.vehicleReg}`, 'success');
      } else {
        toast(`Transaction rejected: ${data.rejectionReason}`, 'error');
      }
      setForm(f => ({ ...f, vehicleReg: '', ownerName: '', amountLiters: '', vehicleClass: '' }));
      setDetectedFrom(null);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  const availablePumps = user?.role === 'pump'
    ? pumps.filter(p => p._id === user.pumpId)
    : pumps;
  const selectedPump = pumps.find(p => p._id === form.pumpId);

  // Dispense button is only enabled when class is resolved
// Block dispense if reg is invalid
const canDispense = form.vehicleReg && form.vehicleClass && form.amountLiters 
  && form.pumpId && !detecting && !regError;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title"><span className="pt-icon">⛽</span> DISPENSE FUEL</div>
          <div className="page-subtitle">Record Fuel Transaction</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><div className="ct-dot amber" />FUEL DISPENSING FORM</div>

        {user?.role === 'pump' && selectedPump && (
          <div className="pump-banner">
            🏪 Assigned Station: <strong>{selectedPump.name}</strong>
            <span className="pump-banner-loc"> — {selectedPump.location}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>

            {/* Vehicle Reg — full width */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Vehicle Registration No. *</label>
              <div className="input-wrap">
                <span className="input-icon">🚗</span>
                <input
                  className="form-control"
                  value={form.vehicleReg}
                  onChange={e => {
  const raw = e.target.value.toUpperCase();
  const normalized = raw.length >= 6 ? normalizeReg(raw) : raw;
  setForm(f => ({
    ...f,
    vehicleReg: normalized,
    vehicleClass: '',
  }));
}}
                  placeholder="e.g. Dhaka Metro-B-11-1234"
                  style={{ textTransform: 'uppercase' }}
                  autoComplete="off"
                />
              </div>

              {/* Live BRTA hint while typing */}
              {hint && !form.vehicleClass && (
                <div className="reg-hint class-hint">
                  <span className="reg-hint-icon">{hint.icon}</span>
                  <div>
                    <span className="reg-hint-class">
                      Class {hint.classCode}: {hint.label}
                    </span>
                    {hint.cc && <span className="reg-hint-cc">({hint.cc})</span>}
                    <div className="reg-hint-maps">
                      → Will map to: <strong>{hint.systemClass}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Detecting spinner */}
              {detecting && (
                <div className="detect-status detecting">
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                  Detecting vehicle class from history...
                </div>
              )}

              {/* Detected result */}
              {!detecting && form.vehicleClass && (
                <div className="detect-status detected">
                  <span>{ICONS[form.vehicleClass]}</span>
                  <span>
                    <strong>{form.vehicleClass}</strong>
                    <span className="detect-source">
                      {detectedFrom === 'reg'
                        ? ' — detected from registration number'
                        : ' — detected from transaction history'}
                    </span>
                  </span>
                </div>
              )}

              {/* Not detected */}
              {!detecting && form.vehicleReg.length >= 5 && !form.vehicleClass && (
                <div className="detect-status not-found">
                  ⚠ Could not auto-detect class — select manually below
                </div>
              )}
            </div>
            {regError && form.vehicleReg.length >= 6 && (
  <div className="detect-status not-found">
    🚫 {regError}
  </div>
)}

{!regError && form.vehicleReg.length >= 6 && (
  <div style={{
    marginTop: 5, fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
    color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5,
  }}>
    ✓ Valid registration format
  </div>
)}
            {/* Vehicle Class — shown always, locked when auto-detected */}
            <div className="form-group">
              <label className="form-label">
                Vehicle Class *
                {form.vehicleClass && detectedFrom && (
                  <button
                    type="button"
                    className="override-btn"
                    onClick={() => { setForm(f => ({ ...f, vehicleClass: '' })); setDetectedFrom(null); }}
                  >
                    ✎ Override
                  </button>
                )}
              </label>
            <select
             className={`form-control ${form.vehicleClass ? 'class-locked' : ''}`}
               value={form.vehicleClass}
                     onChange={e => {
                    setForm(f => ({ ...f, vehicleClass: e.target.value }));
                     setDetectedFrom('manual');
  }}
>
  <option value="">— Auto-detecting… or select manually —</option>
  {VEHICLE_CLASSES.map(c => (
    <option key={c} value={c}>{ICONS[c]} {c}</option>
  ))}
</select>
            </div>

            {/* Fuel Amount */}
            <div className="form-group">
              <label className="form-label">Fuel Amount (Liters) *</label>
              <div className="input-wrap">
                <span className="input-icon">🛢</span>
                <input
                  type="number"
                  className="form-control"
                  value={form.amountLiters}
                  onChange={e => setForm(f => ({ ...f, amountLiters: e.target.value }))}
                  placeholder="e.g. 10"
                  min="0.1"
                  step="0.1"
                  disabled={!form.vehicleClass}
                />
              </div>
            </div>

            {/* Pump Station */}
            <div className="form-group">
              <label className="form-label">Pump Station *</label>
              <select
                className="form-control"
                value={form.pumpId}
                onChange={e => setForm(f => ({ ...f, pumpId: e.target.value }))}
                disabled={user?.role === 'pump'}
              >
                <option value="">— Select Pump —</option>
                {availablePumps.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Owner Name */}
            <div className="form-group">
              <label className="form-label">Owner Name (Optional)</label>
              <input
                className="form-control"
                value={form.ownerName}
                onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                placeholder="Vehicle owner name"
                disabled={!form.vehicleClass}
              />
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '0.8rem' }}>{error}</div>}

          {/* Dispense button — disabled until class is resolved */}
          < button
            type="submit"
            className="btn btn-amber"
            disabled={!canDispense || loading}
            style={{ position: 'relative' }}
          >
            {loading ? '⏳ Processing...' : !form.vehicleClass ? '⚠ Waiting for vehicle class...' : '⛽ RECORD FUEL DISPENSING'}
          </button>

          {!form.vehicleClass && form.vehicleReg.length >= 3 && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              color: 'var(--text2)', marginTop: '0.5rem'
            }}>
              Enter full registration number to auto-detect class, or select manually above.
            </div>
          )}
        </form>
      </div>

      {/* RECEIPT */}
      {receipt && (
        <div className={`receipt ${receipt.status === 'rejected' ? 'rejected' : ''}`}>
          <div className="receipt-title">
            {receipt.status === 'valid' ? '✅ TRANSACTION SUCCESSFUL' : '❌ TRANSACTION REJECTED'}
          </div>
          {receipt.status === 'rejected' && receipt.rejectionReason && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
              color: 'var(--danger)', marginBottom: '0.8rem'
            }}>
              Reason: {receipt.rejectionReason}
            </div>
          )}
          <div className="receipt-grid">
            {[
              ['Transaction ID',    receipt.transaction?._id],
              ['Vehicle Reg.',      receipt.transaction?.vehicleReg],
              ['Vehicle Class',     receipt.transaction?.vehicleClass],
              ['Amount Dispensed',  `${receipt.transaction?.amountLiters}L`],
              ['Pump Station',      receipt.transaction?.pumpName],
              ['Operator',          receipt.transaction?.operatorName],
              ['Daily Usage After', receipt.transaction
                ? `${receipt.transaction.dailyTotalAfter?.toFixed(1)}L / ${receipt.transaction.dailyLimit}L`
                : '-'],
              ['Timestamp',         new Date(receipt.transaction?.createdAt).toLocaleString()],
            ].map(([label, val]) => (
              <div className="receipt-item" key={label}>
                <div className="receipt-label">{label}</div>
                <div className="receipt-value">{val}</div>
              </div>
            ))}
          </div>
          {receipt.distanceAllowance && (
            <div className={`distance-notice ${
              receipt.distanceAllowance.emergency ? 'emergency'
              : receipt.distanceAllowance.allowed  ? 'allowed' : 'denied'
            }`}>
              <span>
                {receipt.distanceAllowance.emergency ? '⚠️'
                  : receipt.distanceAllowance.allowed ? '📍' : '🚫'}
              </span>
              <span>{receipt.distanceAllowance.reason}</span>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}