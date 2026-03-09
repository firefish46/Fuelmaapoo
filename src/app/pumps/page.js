'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/lib/ToastContext';
import ui from '@/styles/UI.module.css';

export default function PumpsPage() {
  const toast = useToast();
  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name:'', location:'' });
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState({});

  const load = useCallback(async () => {
    const res = await fetch('/api/pumps');
    const data = await res.json();
    setPumps(data.pumps || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPump = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.location) { toast('Name and location required', 'error'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/pumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Pump station "${form.name}" added`, 'success');
      setForm({ name:'', location:'' });
      load();
    } catch(err) { toast(err.message, 'error'); }
    finally { setAdding(false); }
  };

  const toggleStatus = async (pump) => {
    setToggling(p => ({ ...p, [pump._id]: true }));
    try {
      const res = await fetch(`/api/pumps/${pump._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pump.status === 'online' ? 'offline' : 'online' }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`${pump.name} is now ${pump.status === 'online' ? 'offline' : 'online'}`, 'info');
      load();
    } catch(err) { toast(err.message, 'error'); }
    finally { setToggling(p => ({ ...p, [pump._id]: false })); }
  };

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Pump Stations</span>
        <span className={ui.pageTitleSub}>Station Management</span>
      </div>

      {loading ? (
        <div className={ui.empty}><div className={ui.spinner} style={{margin:'0 auto'}} /></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
          {pumps.map(p => (
            <div key={p._id} style={{
              background:'var(--surface)',
              border:`1px solid ${p.status==='online'?'rgba(0,230,118,0.2)':'var(--border)'}`,
              borderRadius:'var(--radius)', padding:'1.3rem',
              position:'relative', overflow:'hidden',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                <span className={`${ui.badge} ${p.status==='online'?ui.badgeGreen:ui.badgeRed}`}>
                  {p.status === 'online' ? '● ONLINE' : '○ OFFLINE'}
                </span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'0.64rem',color:'var(--text3)'}}>
                  ID: {p._id?.slice(-6).toUpperCase()}
                </span>
              </div>
              <div style={{fontFamily:'var(--font-head)',fontSize:'1.1rem',fontWeight:'700',marginBottom:'4px'}}>{p.name}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.72rem',color:'var(--text2)',marginBottom:'10px'}}>📍 {p.location}</div>
              <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'10px'}}>
                <div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--text3)',letterSpacing:'1px'}}>TODAY'S OUTPUT</div>
                  <div style={{fontFamily:'var(--font-head)',fontSize:'1.5rem',fontWeight:'700',color:'var(--accent2)'}}>{(p.todayTotal||0).toFixed(1)}<span style={{fontSize:'0.8rem',color:'var(--text2)'}}> L</span></div>
                </div>
                <div style={{marginLeft:'auto'}}>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--text3)',letterSpacing:'1px'}}>TRANSACTIONS</div>
                  <div style={{fontFamily:'var(--font-head)',fontSize:'1.5rem',fontWeight:'700',color:'var(--text)'}}>{p.todayCount||0}</div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(p)}
                disabled={toggling[p._id]}
                className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`}
                style={{width:'100%',justifyContent:'center'}}
              >
                {toggling[p._id] ? <span className={ui.spinner} /> : null}
                {p.status === 'online' ? '○ Set Offline' : '● Set Online'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={ui.cardDot} />Add New Pump Station</div>
        <form onSubmit={addPump}>
          <div className={ui.formGrid}>
            <div className={ui.formGroup}>
              <label className={ui.label}>Pump Station Name *</label>
              <input className={ui.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. City Centre Fuel Depot" />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Location / Address *</label>
              <input className={ui.input} value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="e.g. 45 Main Street, Capital City" />
            </div>
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={adding} style={{marginTop:'0.5rem'}}>
            {adding ? <span className={ui.spinner} style={{borderColor:'rgba(0,0,0,0.3)',borderTopColor:'#000'}} /> : '+'}
            {adding ? 'Adding...' : 'Add Pump Station'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
