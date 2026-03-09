'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/lib/ToastContext';
import ui from '@/styles/UI.module.css';

export default function EmployeesPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username:'', password:'', name:'', role:'pump', pumpId:'' });
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState({});

  const load = useCallback(async () => {
    const [eRes, pRes] = await Promise.all([fetch('/api/employees'), fetch('/api/pumps')]);
    const [eData, pData] = await Promise.all([eRes.json(), pRes.json()]);
    setEmployees(eData.employees || []);
    const ps = pData.pumps || [];
    setPumps(ps);
    if (!form.pumpId && ps.length) setForm(p => ({ ...p, pumpId: ps[0]._id }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEmployee = async (e) => {
    e?.preventDefault();
    if (!form.username || !form.password || !form.name || !form.role) {
      toast('All fields are required', 'error'); return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Employee "${form.name}" created`, 'success');
      setForm({ username:'', password:'', name:'', role:'pump', pumpId: pumps[0]?._id || '' });
      load();
    } catch(err) { toast(err.message, 'error'); }
    finally { setAdding(false); }
  };

  const toggleActive = async (emp) => {
    setToggling(p => ({ ...p, [emp._id]: true }));
    try {
      const res = await fetch(`/api/employees/${emp._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !emp.active }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`${emp.name} ${emp.active ? 'deactivated' : 'activated'}`, 'info');
      load();
    } catch(err) { toast(err.message, 'error'); }
    finally { setToggling(p => ({ ...p, [emp._id]: false })); }
  };

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Employees</span>
        <span className={ui.pageTitleSub}>User Account Management</span>
      </div>

      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={ui.cardDot} />Add Pump Operator Account</div>
        <form onSubmit={addEmployee}>
          <div className={ui.formGrid}>
            <div className={ui.formGroup}>
              <label className={ui.label}>Username *</label>
              <input className={ui.input} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value.toLowerCase()}))} placeholder="e.g. pump_op3" />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Password *</label>
              <input className={ui.input} type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Set password" />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Full Name *</label>
              <input className={ui.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Employee full name" />
            </div>
            <div className={ui.formGroup}>
              <label className={ui.label}>Assigned Pump Station</label>
              <select className={ui.select} value={form.pumpId} onChange={e=>setForm(p=>({...p,pumpId:e.target.value}))}>
                <option value="">-- No assignment --</option>
                {pumps.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={adding} style={{marginTop:'0.5rem'}}>
            {adding ? <span className={ui.spinner} style={{borderColor:'rgba(0,0,0,0.3)',borderTopColor:'#000'}} /> : '+'}
            {adding ? 'Creating...' : 'Add Employee'}
          </button>
        </form>
      </div>

      <div className={ui.card}>
        <div className={ui.cardTitle}><span className={ui.cardDot} />Employee List</div>
        {loading ? (
          <div className={ui.empty}><div className={ui.spinner} style={{margin:'0 auto'}} /></div>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead><tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Assigned Pump</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr></thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp._id}>
                    <td className={ui.monoCell}>{emp.username}</td>
                    <td style={{fontWeight:'500'}}>{emp.name}</td>
                    <td>
                      <span className={`${ui.badge} ${emp.role==='govt'?ui.badgeBlue:ui.badgeAmber}`}>
                        {emp.role === 'govt' ? 'Govt Admin' : 'Pump Operator'}
                      </span>
                    </td>
                    <td className={ui.dimCell}>{emp.pumpId?.name || '—'}</td>
                    <td>
                      <span className={`${ui.badge} ${emp.active?ui.badgeGreen:ui.badgeRed}`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={ui.monoCell} style={{fontSize:'0.74rem',color:'var(--text2)'}}>
                      {new Date(emp.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td>
                      {emp.role !== 'govt' && (
                        <button
                          className={`${ui.btn} ${ui.btnGhost} ${ui.btnSmall}`}
                          onClick={() => toggleActive(emp)}
                          disabled={toggling[emp._id]}
                          style={{borderColor: emp.active ? 'rgba(255,59,92,0.3)' : 'rgba(0,230,118,0.3)'}}
                        >
                          {toggling[emp._id] ? <span className={ui.spinner} /> : null}
                          {emp.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
