'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/lib/ToastContext';
import ui from '@/styles/UI.module.css';

const CLASS_ICONS = {
  'Motorcycle':'🏍','Private Car':'🚗','Pickup / SUV':'🚙','Microbus':'🚐',
  'Minibus':'🚌','Bus':'🚌','Light Truck':'🚛','Heavy Truck':'🚚',
  'Agricultural':'🚜','Emergency':'🚑',
};

export default function LimitsPage() {
  const toast = useToast();
  const [limits, setLimits] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/limits').then(r=>r.json()).then(d => {
      setLimits(d.limits || []);
      const init = {};
      (d.limits || []).forEach(l => { init[l.vehicleClass] = l.dailyLimitLiters; });
      setEdits(init);
    }).finally(() => setLoading(false));
  }, []);

  const save = async (vehicleClass) => {
    const val = parseFloat(edits[vehicleClass]);
    if (!val || val <= 0) { toast('Invalid limit value', 'error'); return; }
    setSaving(p => ({ ...p, [vehicleClass]: true }));
    try {
      const res = await fetch('/api/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleClass, dailyLimitLiters: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLimits(prev => prev.map(l => l.vehicleClass === vehicleClass ? { ...l, dailyLimitLiters: val } : l));
      toast(`Limit for ${vehicleClass} updated to ${val}L/day`, 'success');
    } catch(err) { toast(err.message, 'error'); }
    finally { setSaving(p => ({ ...p, [vehicleClass]: false })); }
  };

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Fuel Limits</span>
        <span className={ui.pageTitleSub}>Government Control Panel</span>
      </div>
      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={ui.cardDot} />Daily Fuel Limits by Vehicle Class</div>
        <p style={{fontFamily:'var(--font-mono)',fontSize:'0.76rem',color:'var(--text2)',marginBottom:'1.5rem'}}>
          ⚠ Only Government Admin can modify these limits. Changes take effect immediately for all pump stations.
        </p>
        {loading ? (
          <div className={ui.empty}><div className={ui.spinner} style={{margin:'0 auto'}} /></div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'1rem'}}>
            {limits.map(l => (
              <LimitCard
                key={l.vehicleClass}
                limit={l}
                editValue={edits[l.vehicleClass] ?? l.dailyLimitLiters}
                onChange={v => setEdits(p => ({ ...p, [l.vehicleClass]: v }))}
                onSave={() => save(l.vehicleClass)}
                saving={saving[l.vehicleClass]}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LimitCard({ limit, editValue, onChange, onSave, saving }) {
  const icon = CLASS_ICONS[limit.vehicleClass] || '🚗';
  const changed = parseFloat(editValue) !== limit.dailyLimitLiters;
  return (
    <div style={{
      background:'var(--surface2)',
      border:`1px solid ${changed?'rgba(0,212,255,0.3)':'var(--border)'}`,
      borderRadius:'var(--radius)',
      padding:'1.2rem',
      transition:'border-color 0.18s',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <div style={{fontFamily:'var(--font-head)',fontSize:'0.95rem',fontWeight:'700',letterSpacing:'0.5px',display:'flex',alignItems:'center',gap:'7px'}}>
          <span style={{fontSize:'1.3rem'}}>{icon}</span>
          {limit.vehicleClass}
        </div>
        {changed && <span style={{fontFamily:'var(--font-mono)',fontSize:'0.64rem',color:'var(--accent)',letterSpacing:'1px'}}>MODIFIED</span>}
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.64rem',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'3px'}}>Current Limit</div>
        <div style={{fontFamily:'var(--font-head)',fontSize:'1.6rem',fontWeight:'700',color:'var(--accent)'}}>
          {limit.dailyLimitLiters} <span style={{fontSize:'0.85rem',color:'var(--text2)'}}>L/day</span>
        </div>
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        <input
          type="number"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          min="1" max="9999" step="1"
          style={{
            flex:1, background:'var(--bg)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'8px 10px',
            color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:'0.9rem',
            outline:'none',
          }}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border)'}
        />
        <button
          onClick={onSave}
          disabled={saving || !changed}
          style={{
            background: changed ? 'var(--accent)' : 'var(--surface3)',
            color: changed ? '#000' : 'var(--text3)',
            border:'none', borderRadius:'var(--radius-sm)',
            padding:'8px 16px', fontFamily:'var(--font-head)',
            fontWeight:'700', letterSpacing:'1px', fontSize:'0.8rem',
            cursor: changed ? 'pointer' : 'not-allowed',
            transition:'all 0.18s', display:'flex', alignItems:'center', gap:'5px',
          }}
        >
          {saving ? <span style={{width:'12px',height:'12px',border:'2px solid rgba(0,0,0,0.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /> : null}
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
