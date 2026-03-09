'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/AuthContext';
import ui from '@/styles/UI.module.css';

const CLASS_ICONS = {
  'Motorcycle':'🏍','Private Car':'🚗','Pickup / SUV':'🚙','Microbus':'🚐',
  'Minibus':'🚌','Bus':'🚌','Light Truck':'🚛','Heavy Truck':'🚚',
  'Agricultural':'🚜','Emergency':'🚑',
};

function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions/stats');
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  if (!user) return null;

  return (
    <AppShell>
      <div className={ui.pageTitle}>
        <span className={ui.pageTitleText}>Dashboard</span>
        <span className={ui.pageTitleSub}>Live Overview</span>
      </div>

      {loading ? (
        <div className={ui.empty}><div className={ui.spinner} style={{margin:'0 auto'}} /></div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className={ui.statsGrid}>
            <StatCard label="Today's Transactions" value={stats.totalTransactions} color="" />
            <StatCard label="Fuel Dispensed Today" value={`${stats.totalFuelDispensed}L`} color="Amber" />
            <StatCard label="Unique Vehicles" value={stats.uniqueVehicles} color="Green" />
            <StatCard label="Rejected Requests" value={stats.rejectedCount} color="Red" sub="Over-limit attempts" />
            <StatCard label="Active Pump Stations" value={stats.activePumps} color="" sub={`of ${stats.totalPumps} total`} />
            <StatCard label="Valid Transactions" value={stats.validCount} color="Green" />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem'}}>
            {/* Recent transactions */}
            <div className={ui.card}>
              <div className={ui.cardTitle}><span className={ui.cardDot} />Recent Transactions</div>
              {stats.recentTransactions?.length === 0
                ? <div className={ui.empty}>No transactions yet today</div>
                : stats.recentTransactions?.map(t => (
                  <div key={t._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(26,58,92,0.3)'}}>
                    <div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.86rem',color:'var(--text)'}}>{t.vehicleReg}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.68rem',color:'var(--text2)'}}>{t.vehicleClass} · {t.pumpName}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text3)'}}>{fmtTime(t.createdAt)}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:'1rem'}}>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.9rem',color:'var(--accent2)'}}>{t.amountLiters}L</div>
                      <span className={`${ui.badge} ${t.status === 'valid' ? ui.badgeGreen : ui.badgeRed}`}>{t.status}</span>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Class usage */}
            <div className={ui.card}>
              <div className={ui.cardTitle}><span className={`${ui.cardDot} ${ui.cardDotAmber}`} />Usage by Vehicle Class</div>
              {!stats.byClass?.length
                ? <div className={ui.empty}>No data for today</div>
                : (() => {
                    const max = Math.max(...stats.byClass.map(c => c.total));
                    return stats.byClass.map(c => {
                      const pct = max > 0 ? (c.total / max * 100).toFixed(0) : 0;
                      return (
                        <div key={c._id} style={{marginBottom:'12px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--font-mono)',fontSize:'0.7rem',marginBottom:'4px'}}>
                            <span style={{color:'var(--text)'}}>{CLASS_ICONS[c._id] || '🚗'} {c._id}</span>
                            <span style={{color:'var(--accent2)'}}>{c.total.toFixed(1)}L ({c.count} txns)</span>
                          </div>
                          <div className={ui.fuelBar}>
                            <div className={`${ui.fuelBarFill} ${ui.fuelGreen}`} style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      );
                    });
                  })()
              }
            </div>
          </div>
        </>
      ) : (
        <div className={ui.empty}>Failed to load dashboard data</div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className={ui.statCard}>
      <div className={ui.statLabel}>{label}</div>
      <div className={`${ui.statValue} ${color ? ui['statValue'+color] : ''}`}>{value}</div>
      {sub && <div className={ui.statSub}>{sub}</div>}
    </div>
  );
}
