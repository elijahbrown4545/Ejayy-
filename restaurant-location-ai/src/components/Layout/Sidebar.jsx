import { NavLink } from 'react-router-dom';
import { Map, Building2, ClipboardList, BarChart3, LayoutDashboard, X, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/map',       icon: Map,           label: 'Map View' },
  { to: '/locations', icon: Building2,     label: 'Locations' },
  { to: '/survey',    icon: ClipboardList, label: 'Surveys' },
  { to: '/compare',   icon: BarChart3,     label: 'Compare Sites' },
  { to: '/expansion', icon: TrendingUp,    label: 'Expansion AI' },
  { to: '/admin',     icon: LayoutDashboard, label: 'Admin' },
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200',
          'flex flex-col transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 lg:hidden">
          <span className="font-bold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Restaurant Site Selection v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
