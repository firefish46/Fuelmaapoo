'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import styles from '@/styles/AppShell.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: '▦',  href: '/dashboard',  roles: ['govt','pump'] },
  { label: 'Check Vehicle', icon: '◉',  href: '/check',      roles: ['govt','pump'] },
  { label: 'Dispense Fuel', icon: '⛽', href: '/dispense',   roles: ['govt','pump'] },
  { label: 'Records',       icon: '☰',  href: '/records',    roles: ['govt','pump'] },
];

const ADMIN_ITEMS = [
  { label: 'Fuel Limits',   icon: '⚙',  href: '/limits',     roles: ['govt'] },
  { label: 'Pump Stations', icon: '◈',  href: '/pumps',      roles: ['govt'] },
  { label: 'Employees',     icon: '◎',  href: '/employees',  roles: ['govt'] },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const go = (href) => router.push(href);

  const filteredAdmin = ADMIN_ITEMS.filter(i => i.roles.includes(user?.role));
  const hasAdminItems = filteredAdmin.length > 0;

  return (
    <div className={styles.shell}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⛽</div>
          <div className={styles.logoText}>
            FUEL<span>mapo</span>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.clock}>{clock}</span>
          <span className={`${styles.roleBadge} ${user?.role === 'govt' ? styles.roleGovt : styles.rolePump}`}>
            {user?.role === 'govt' ? 'Govt Admin' : 'Pump Operator'}
          </span>
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>Operations</div>
            {NAV_ITEMS.filter(i => i.roles.includes(user?.role)).map(item => (
              <button
                key={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                onClick={() => go(item.href)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {hasAdminItems && (
            <>
              <div className={styles.divider} />
              <div className={styles.sideSection}>
                <div className={styles.sideLabel}>Admin</div>
                {filteredAdmin.map(item => (
                  <button
                    key={item.href}
                    className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                    onClick={() => go(item.href)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Main content */}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
