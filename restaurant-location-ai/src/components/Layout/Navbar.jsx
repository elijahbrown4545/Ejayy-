import { Menu, MapPin } from 'lucide-react';

export default function Navbar({ onMenuClick }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg hidden sm:block">
            Site<span className="text-brand-500">Select</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium">
          Restaurant AI
        </span>
      </div>
    </header>
  );
}
