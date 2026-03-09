'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import ui from '@/styles/UI.module.css';
import { parseRegistration } from '../../lib/bdRegistration';

const CLASS_ICONS = {
  'Motorcycle':'🏍','Private Car':'🚗','Pickup / SUV':'🚙','Microbus':'🚐',
  'Minibus':'🚌','Bus':'🚌','Light Truck':'🚛','Heavy Truck':'🚚',
  'Agricultural':'🚜','Emergency':'🚑',
};

export default function DispensePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [limits, setLimits] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [form, setForm] = useState({ vehicleReg:'', ownerName:'', vehicleClass:'', amountLiters:'', pumpId:'' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [alert, setAlert] = useState(null);

useEffect(() => {
  if (form.vehicleReg.length >= 5) {
    // First try to parse from reg number directly
    const parsed = parseRegistration(form.vehicleReg);
    if (parsed?.isValid && parsed.suggestedSystemClass) {
      setForm(f => ({ ...f, vehicleClass: f.vehicleClass || parsed.suggestedSystemClass }));
      return;
    }
    // Fallback: check transaction history
    fetch(`/api/vehicles/check?reg=${form.vehicleReg}`)
      .then(r => r.json())
      .then(d => {
        if (d.detectedClass) setForm(f => ({ ...f, vehicleClass: f.vehicleClass || d.detectedClass }));
      })
      .catch(() => {});
  }
}, [form.vehicleReg]);

  // Auto-detect class from history
  useEffect(() => {
    if (form.vehicleReg.length >= 4) {
      const t = setTimeout(async () => {
        const res = await fetch(`/api/vehicles/check?reg=${form.vehicleReg}`);
        if (res.ok) {
          const d = await res.json();
          if (d.detectedClass && !form.vehicleClass) {
            setForm(p => ({ ...p, vehicleClass: d.detectedClass }));
          }
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [form.vehicleReg]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const { vehicleReg, vehicleClass, amountLiters, pumpId } = form;
    if (!vehicleReg || !vehicleClass || !amountLiters || !pumpId) {
      setAlert({ type:'error', msg:'Please fill all required fields.' }); return;
    }
    setAlert(null); setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleReg: vehicleReg.toUpperCase(),
          ownerName: form.ownerName || 'N/A',
          vehicleClass,
          amountLiters: parseFloat(amountLiters),
          pumpId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      if (data.status === 'valid') {
        toast(`${amountLiters}L dispensed to ${vehicleReg.toUpperCase()}`, 'success');
        setForm(p => ({ ...p, vehicleReg:'', ownerName:'', vehicleClass:'', amountLiters:'' }));
      } else {
        toast(`Transaction rejected: ${data.rejectionReason}`, 'error');
      }
    } catch(err) {
      setAlert({ type:'error', msg: err.message });
    } finally { setLoading(false); }
  };

  const availablePumps = user?.role === 'pump'
    ? pumps.filter(p => p._id === user.pumpId)
    : pumps;

  const txn = result?.transaction;
  const pct = txn ? Math.min((txn.dailyTotalAfter / txn.dailyLimit) * 100, 100) : 0;
  const barColor = pct >= 100 ? ui.fuelRed : pct >= 75 ? ui.fuelYellow : ui.fuelGreen;

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Dispense Fuel</span>
        <span className={ui.pageTitleSub}>Record Transaction</span>
      </div>

      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={`${ui.cardDot} ${ui.cardDotAmber}`} />Fuel Dispensing Form</div>
        <form onSubmit={handleSubmit}>
          <div className={ui.formGrid}>
            <div className={ui.formGroup}>
              <label className={ui.label}>Vehicle Registration No. *</label>
              <input
                className={ui.input}
                value={form.vehicleReg}
                onChange={e => setForm(p => ({ ...p, vehicleReg: e.target.value.toUpperCase() }))}
                placeholder="e.g. ABC-1234"
                style={{textTransform:'uppercase'}}
              />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Vehicle Class *</label>
              <select className={ui.select} value={form.vehicleClass} onChange={e => setForm(p => ({ ...p, vehicleClass: e.target.value }))}>
                <option value="">-- Select Class --</option>
                {limits.map(l => (
                  <option key={l.vehicleClass} value={l.vehicleClass}>
                    {CLASS_ICONS[l.vehicleClass]||'🚗'} {l.vehicleClass} (Limit: {l.dailyLimitLiters}L)
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Fuel Amount (Liters) *</label>
              <input
                className={ui.input}
                type="number"
                value={form.amountLiters}
                onChange={e => setForm(p => ({ ...p, amountLiters: e.target.value }))}
                placeholder="e.g. 10"
                min="0.1" step="0.1"
              />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Pump Station *</label>
              <select
                className={ui.select}
                value={form.pumpId}
                onChange={e => setForm(p => ({ ...p, pumpId: e.target.value }))}
                disabled={user?.role === 'pump'}
              >
                <option value="">-- Select Pump --</option>
                {availablePumps.map(p => (
                  <option key={p._id} value={p._id}>{p.name} {p.status === 'offline' ? '(Offline)' : ''}</option>
                ))}
              </select>
            </div>
            <div className={`${ui.formGroup} ${ui.formGroupFull}`}>
              <label className={ui.label}>Owner / Driver Name (Optional)</label>
              <input
                className={ui.input}
                value={form.ownerName}
                onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
                placeholder="Vehicle owner or driver name"
              />
            </div>
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnAmber}`} disabled={loading} style={{marginTop:'0.5rem'}}>
            {loading ? <span className={ui.spinner} style={{borderColor:'rgba(0,0,0,0.3)',borderTopColor:'#000'}} /> : '⛽'}
            {loading ? 'Processing...' : 'Record Fuel Dispensing'}
          </button>
        </form>
        {alert && <div className={`${ui.alert} ${alert.type==='error'?ui.alertError:ui.alertSuccess}`}>{alert.msg}</div>}
      </div>

      {/* Receipt */}
      {result && txn && (
        <div className={ui.card} style={{
          borderColor: result.status==='valid' ? 'rgba(0,230,118,0.3)' : 'rgba(255,59,92,0.3)',
          background: result.status==='valid' ? 'rgba(0,230,118,0.04)' : 'rgba(255,59,92,0.04)',
        }}>
          <div className={ui.cardTitle}>
            <span className={result.status==='valid' ? `${ui.cardDot} ${ui.cardDotGreen}` : `${ui.cardDot}`} style={result.status!=='valid'?{background:'var(--danger)',boxShadow:'0 0 6px var(--danger)'}:{}} />
            Transaction Receipt
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'1.2rem'}}>
            <span style={{fontSize:'1.8rem'}}>{result.status==='valid'?'✅':'❌'}</span>
            <div>
              <div style={{fontFamily:'var(--font-head)',fontSize:'1.1rem',fontWeight:'700',letterSpacing:'1px',color:result.status==='valid'?'var(--success)':'var(--danger)'}}>
                {result.status==='valid' ? 'TRANSACTION APPROVED' : 'TRANSACTION REJECTED'}
              </div>
              {result.rejectionReason && (
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.76rem',color:'var(--danger)',marginTop:'2px'}}>{result.rejectionReason}</div>
              )}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.7rem',marginBottom:'1rem'}}>
            {[
              { label:'Transaction ID', value: txn._id?.slice(-8).toUpperCase(), accent:'blue' },
              { label:'Status', value: txn.status.toUpperCase(), accent: txn.status==='valid'?'green':'red' },
              { label:'Vehicle Reg.', value: txn.vehicleReg },
              { label:'Vehicle Class', value: `${CLASS_ICONS[txn.vehicleClass]||'🚗'} ${txn.vehicleClass}` },
              { label:'Amount', value: `${txn.amountLiters} L`, accent:'amber' },
              { label:'Pump Station', value: txn.pumpName },
              { label:'Operator', value: txn.operatorName },
              { label:'Timestamp', value: new Date(txn.createdAt).toLocaleTimeString('en-GB') },
            ].map(item => (
              <div key={item.label} style={{background:'rgba(255,255,255,0.03)',borderRadius:'4px',padding:'10px 12px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'3px'}}>{item.label}</div>
                <div style={{
                  fontFamily:'var(--font-mono)',fontSize:'0.86rem',fontWeight:'700',
                  color: item.accent==='blue'?'var(--accent)':item.accent==='amber'?'var(--accent2)':item.accent==='green'?'var(--success)':item.accent==='red'?'var(--danger)':'var(--text)',
                }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className={ui.fuelBarWrap}>
            <div className={ui.fuelBarLabels}>
              <span>Daily usage after transaction</span>
              <span>{txn.dailyTotalAfter?.toFixed(1)} / {txn.dailyLimit} L</span>
            </div>
            <div className={ui.fuelBar}>
              <div className={`${ui.fuelBarFill} ${barColor}`} style={{width:`${pct}%`}} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
