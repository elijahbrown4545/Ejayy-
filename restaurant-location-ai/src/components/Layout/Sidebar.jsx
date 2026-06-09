import { NavLink } from 'react-router-dom';
import { Map, Store, BarChart3, Settings, X } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/map',      icon: Map,      label: 'Map' },
  { to: '/stores',   icon: Store,    label: 'Stores' },
  { to: '/compare',  icon: BarChart3, label: 'Compare' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={onClose} />}

      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200',
        'flex flex-col transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between px-4 py-4 lg:hidden">
          <span className="font-bold text-gray-900">Menu</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="px-4 py-5 hidden lg:block">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">SiteSelect</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}
