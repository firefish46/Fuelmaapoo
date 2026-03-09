'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import ui from '@/styles/UI.module.css';

const CLASS_ICONS = {
  'Motorcycle':'🏍','Private Car':'🚗','Pickup / SUV':'🚙','Microbus':'🚐',
  'Minibus':'🚌','Bus':'🚌','Light Truck':'🚛','Heavy Truck':'🚚',
  'Agricultural':'🚜','Emergency':'🚑',
};

function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
  });
}

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [filters, setFilters] = useState({ reg:'', vehicleClass:'', pumpId:'', status:'', date:'' });

  useEffect(() => {
    fetch('/api/limits').then(r=>r.json()).then(d=>setLimits(d.limits||[]));
    fetch('/api/pumps').then(r=>r.json()).then(d=>setPumps(d.pumps||[]));
  }, []);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 20 });
    if (filters.reg) params.set('reg', filters.reg);
    if (filters.vehicleClass) params.set('class', filters.vehicleClass);
    if (filters.pumpId) params.set('pump', filters.pumpId);
    if (filters.status) params.set('status', filters.status);
    if (filters.date) params.set('date', filters.date);
    try {
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setRecords(data.transactions || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(pg);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val }));

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Fuel Records</span>
        <span className={ui.pageTitleSub}>{total} Total Transactions</span>
      </div>
      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={ui.cardDot} />Transaction Log</div>
        <div className={ui.filterRow}>
          <input className={ui.filterInput} placeholder="🔍 Search reg / owner..." value={filters.reg} onChange={e=>setFilter('reg',e.target.value)} style={{minWidth:'180px'}} />
          <select className={ui.filterInput} value={filters.vehicleClass} onChange={e=>setFilter('vehicleClass',e.target.value)}>
            <option value="">All Classes</option>
            {limits.map(l=><option key={l.vehicleClass} value={l.vehicleClass}>{CLASS_ICONS[l.vehicleClass]||'🚗'} {l.vehicleClass}</option>)}
          </select>
          <select className={ui.filterInput} value={filters.pumpId} onChange={e=>setFilter('pumpId',e.target.value)}>
            <option value="">All Pumps</option>
            {pumps.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select className={ui.filterInput} value={filters.status} onChange={e=>setFilter('status',e.target.value)}>
            <option value="">All Status</option>
            <option value="valid">Valid</option>
            <option value="rejected">Rejected</option>
          </select>
          <input className={ui.filterInput} type="date" value={filters.date} onChange={e=>setFilter('date',e.target.value)} />
          <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} onClick={() => { setFilters({reg:'',vehicleClass:'',pumpId:'',status:'',date:''}); }}>Clear</button>
        </div>
        {loading ? (
          <div className={ui.empty}><div className={ui.spinner} style={{margin:'0 auto'}} /></div>
        ) : records.length === 0 ? (
          <div className={ui.empty}>No transactions found</div>
        ) : (
          <>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead><tr>
                  <th>Timestamp</th>
                  <th>Reg. No.</th>
                  <th>Owner</th>
                  <th>Class</th>
                  <th>Pump Station</th>
                  <th>Operator</th>
                  <th>Amount</th>
                  <th>Daily Total</th>
                  <th>Limit</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  {records.map(t => (
                    <tr key={t._id}>
                      <td className={ui.monoCell} style={{fontSize:'0.76rem',color:'var(--text2)',whiteSpace:'nowrap'}}>{fmtTime(t.createdAt)}</td>
                      <td className={ui.monoCell} style={{color:'var(--accent)',fontWeight:'700'}}>{t.vehicleReg}</td>
                      <td style={{fontSize:'0.84rem'}}>{t.ownerName}</td>
                      <td style={{fontSize:'0.84rem',whiteSpace:'nowrap'}}>{CLASS_ICONS[t.vehicleClass]||'🚗'} {t.vehicleClass}</td>
                      <td className={ui.dimCell} style={{whiteSpace:'nowrap'}}>{t.pumpName}</td>
                      <td className={ui.dimCell}>{t.operatorName}</td>
                      <td className={ui.monoCell} style={{color:'var(--accent2)'}}>{t.amountLiters}L</td>
                      <td className={ui.monoCell}>{t.dailyTotalAfter != null ? `${t.dailyTotalAfter}L` : '—'}</td>
                      <td className={ui.monoCell}>{t.dailyLimit != null ? `${t.dailyLimit}L` : '—'}</td>
                      <td>
                        <span className={`${ui.badge} ${t.status==='valid'?ui.badgeGreen:ui.badgeRed}`}>{t.status}</span>
                        {t.rejectionReason && <div style={{fontSize:'0.65rem',color:'var(--danger)',marginTop:'2px',maxWidth:'140px'}}>{t.rejectionReason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div style={{display:'flex',gap:'0.5rem',justifyContent:'center',marginTop:'1rem',alignItems:'center'}}>
                <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} disabled={page<=1} onClick={()=>load(page-1)}>← Prev</button>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--text2)'}}>Page {page} of {pages}</span>
                <button className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`} disabled={page>=pages} onClick={()=>load(page+1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
