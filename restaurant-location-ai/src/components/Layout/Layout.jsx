import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Map, Store, BarChart3, Settings } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/map',      icon: Map,       label: 'Map' },
  { to: '/stores',   icon: Store,     label: 'Stores' },
  { to: '/compare',  icon: BarChart3, label: 'Compare' },
  { to: '/settings', icon: Settings,  label: 'Settings' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const isMap = pathname === '/map' || pathname === '/';

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Page content */}
      {isMap ? (
        /* Map fills the entire screen */
        <div className="absolute inset-0">
          <Outlet />
        </div>
      ) : (
        /* Other pages scroll inside a padded container */
        <div className="absolute inset-0 overflow-y-auto bg-gray-50 pb-24">
          <Outlet />
        </div>
      )}

      {/* Floating bottom nav pill — always on top */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-gray-100 p-1.5 gap-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              )
            }
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
