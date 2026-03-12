'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useToast } from '../../lib/ToastContext';

let L;

function MapPicker({ onSelect }) {
  const mapRef    = useRef(null);
  const leafRef   = useRef(null);
  const markerRef = useRef(null);
  const [address, setAddress]   = useState('');
  const [searching, setSearching] = useState(false);
  const [coords, setCoords]     = useState({ lat: 23.8103, lng: 90.4125 });

  useEffect(() => {
    if (leafRef.current || !mapRef.current) return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    import('leaflet').then(mod => {
      if (leafRef.current || !mapRef.current) return;
      L = mod.default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      if (mapRef.current._leaflet_id) mapRef.current._leaflet_id = null;
      const map = L.map(mapRef.current, { preferCanvas: true }).setView([23.8103, 90.4125], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      const marker = L.marker([23.8103, 90.4125], { draggable: true }).addTo(map);
      markerRef.current = marker;
      leafRef.current   = map;
      const onMove = (lat, lng) => {
        setCoords({ lat, lng });
        onSelect(lat, lng, null);
        reverseGeocode(lat, lng);
      };
      map.on('click', e => { marker.setLatLng(e.latlng); onMove(e.latlng.lat, e.latlng.lng); });
      marker.on('dragend', () => { const p = marker.getLatLng(); onMove(p.lat, p.lng); });
    });
    return () => { if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; } };
  }, []);

  async function reverseGeocode(lat, lng) {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      const addr = data.display_name || '';
      setAddress(addr);
      onSelect(lat, lng, addr);
    } catch {}
  }

  async function searchAddress() {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=bd`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
        leafRef.current?.setView([lat, lng], 16);
        markerRef.current?.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        setAddress(data[0].display_name);
        onSelect(lat, lng, data[0].display_name);
      }
    } finally { setSearching(false); }
  }

  return (
    <div className="map-picker-wrap">
      <div className="map-search-row">
        <input className="form-control" value={address} onChange={e => setAddress(e.target.value)}
          placeholder="Search address in Bangladesh..." onKeyDown={e => e.key === 'Enter' && searchAddress()} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={searchAddress} disabled={searching}>
          {searching ? '...' : '🔍'}
        </button>
      </div>
      <div ref={mapRef} className="leaflet-map" />
      <div className="map-coords">
        📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: '0.68rem' }}>Click or drag to reposition</span>
      </div>
    </div>
  );
}

function EmployeePanel({ pumpId, pumpName }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({ username: '', password: '', name: '' });
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [open, setOpen]           = useState(false);
  const toast = useToast();

  useEffect(() => { if (open) load(); }, [open]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/pumps/${pumpId}`);
    if (res.ok) { const d = await res.json(); setEmployees(d.employees || []); }
    setLoading(false);
  }

  async function add(e) {
    e.preventDefault();
    if (!form.username || !form.password || !form.name) { setError('All fields required'); return; }
    setAdding(true); setError('');
    const res  = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'pump', pumpId }) });
    const data = await res.json();
    if (res.ok) { toast(`${form.name} added`, 'success'); setForm({ username: '', password: '', name: '' }); load(); }
    else setError(data.error);
    setAdding(false);
  }

  async function toggle(emp) {
    const res = await fetch(`/api/employees/${emp._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !emp.active }) });
    if (res.ok) { load(); toast(`${emp.name} ${!emp.active ? 'activated' : 'deactivated'}`, 'info'); }
  }

  return (
    <div className="pump-emp-panel">
      <button type="button" className="pump-emp-toggle" onClick={() => setOpen(x => !x)}>
        👷 Employees {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="pump-emp-body">
          <form onSubmit={add} className="pump-emp-form">
            <input className="form-control" placeholder="Username" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input type="password" className="form-control" placeholder="Password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input className="form-control" placeholder="Full Name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
              {adding ? '…' : '➕'}
            </button>
          </form>
          {error && <div className="alert alert-error" style={{ marginTop: 6, padding: '5px 10px', fontSize: '0.78rem' }}>{error}</div>}
          {loading
            ? <div style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text2)' }}>Loading…</div>
            : employees.length === 0
              ? <div style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text3)' }}>No employees yet</div>
              : <div className="pump-emp-list">
                  {employees.map(emp => (
                    <div key={emp._id} className="pump-emp-row">
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text)' }}>{emp.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text2)' }}>{emp.username}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge badge-${emp.active ? 'green' : 'red'}`}>{emp.active ? 'ACTIVE' : 'OFF'}</span>
                        <button type="button" className="btn btn-sm btn-danger-ghost"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => toggle(emp)}>
                          {emp.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
          }
        </div>
      )}
    </div>
  );
}

export default function PumpsPage() {
  const [pumps, setPumps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', location: '', lat: null, lng: null });
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');
  const toast = useToast();

  useEffect(() => { fetchPumps(); }, []);

  async function fetchPumps() {
    setLoading(true);
    const res = await fetch('/api/pumps');
    if (res.ok) { const d = await res.json(); setPumps(d.pumps || []); }
    setLoading(false);
  }

  async function toggleStatus(pump) {
    const s   = pump.status === 'online' ? 'offline' : 'online';
    const res = await fetch(`/api/pumps/${pump._id}`, { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
    if (res.ok) { setPumps(prev => prev.map(p => p._id === pump._id ? { ...p, status: s } : p)); toast(`${pump.name} → ${s}`, 'info'); }
  }

  async function addPump(e) {
    e.preventDefault();
    if (!form.name || !form.location) { setError('Name and location required'); return; }
    if (!form.lat || !form.lng)       { setError('Pick a location on the map first'); return; }
    setAdding(true); setError('');
    const res = await fetch('/api/pumps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      toast(`"${form.name}" added`, 'success');
      setForm({ name: '', location: '', lat: null, lng: null });
      setShowAdd(false);
      fetchPumps();
    } else { const d = await res.json(); setError(d.error); }
    setAdding(false);
  }

  if (loading) return <AppShell><div className="loading-wrap"><div className="spinner" /></div></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title"><span className="pt-icon">🏪</span> PUMP STATIONS</div>
          <div className="page-subtitle">Station Management · {pumps.length} stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(x => !x)}>
          {showAdd ? '✕ Cancel' : '➕ Add Station'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title"><div className="ct-dot" />NEW PUMP STATION</div>
          <form onSubmit={addPump}>
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Station Name *</label>
                <input className="form-control" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mirpur Fuel Depot" />
              </div>
              <div className="form-group">
                <label className="form-label">Address Label *</label>
                <input className="form-control" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Auto-fills from map or type manually" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">📍 Pick Location on Map</label>
              <MapPicker onSelect={(lat, lng, addr) => setForm(f => ({ ...f, lat, lng, location: addr || f.location }))} />
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '0.8rem' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? '…' : '➕ ADD PUMP STATION'}
            </button>
          </form>
        </div>
      )}

      <div className="pump-grid">
        {pumps.map(p => (
          <div key={p._id} className={`pump-card ${p.status}`}>

            {/* Header row */}
            <div className="pump-card-top">
              <div className="pump-status">
                <div className={`pump-dot ${p.status}`} />
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.7rem', letterSpacing: '1px' }}>
                  {p.status.toUpperCase()}
                </span>
              </div>
              <span className={`badge badge-${p.status === 'online' ? 'green' : 'red'}`}>
                {p.status}
              </span>
            </div>

            {/* Name */}
            <div className="pump-name">{p.name}</div>

            {/* Location */}
            <div className="pump-meta">📍 {p.location}</div>
            {p.lat && p.lng
              ? <div className="pump-meta" style={{ color: 'var(--text3)', fontSize: '0.68rem' }}>
                  🌐 {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </div>
              : <div className="pump-meta" style={{ color: 'var(--warning)', fontSize: '0.68rem' }}>
                  ⚠ No coordinates — distance check disabled
                </div>
            }

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

            {/* Today stats */}
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '0.62rem', color: 'var(--text3)', letterSpacing: '1px', marginBottom: 2 }}>
              TODAY'S OUTPUT
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--accent2)', lineHeight: 1 }}>
              {(p.todayTotal || 0).toFixed(1)}
              <span style={{ fontSize: '0.75rem', color: 'var(--text2)', marginLeft: 4 }}>
                L · {p.todayCount || 0} txns
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

            {/* Toggle button */}
            <button
              className={`btn btn-sm ${p.status === 'online' ? 'btn-danger-ghost' : 'btn-success'}`}
              style={{ width: '100%' }}
              onClick={() => toggleStatus(p)}
            >
              {p.status === 'online' ? '🔴 SET OFFLINE' : '🟢 SET ONLINE'}
            </button>

            {/* Employee panel */}
            <EmployeePanel pumpId={p._id} pumpName={p.name} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}