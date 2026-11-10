import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ExternalLink
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
    { label: 'Disputes', to: '/disputes', icon: ShieldAlert },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] text-[#172033]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#E4E9F0] bg-white fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E4E9F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              P
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">ProofRail</span>
              <span className="text-[10px] font-semibold text-blue-600 ml-1.5 uppercase px-1.5 py-0.5 bg-blue-50 rounded">AI</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Account / Logout */}
        <div className="p-4 border-t border-[#E4E9F0] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-medium text-xs border border-slate-200">
              {user?.name ? user.name[0].toUpperCase() : 'M'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-900 truncate">{user?.name || 'Merchant'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/40 backdrop-blur-xs flex">
          <div className="w-64 bg-white h-full flex flex-col p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <span className="font-bold text-base text-slate-900">ProofRail AI</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 text-sm text-red-600 py-2 px-3 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-[#E4E9F0] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 text-slate-500 md:hidden hover:bg-slate-50 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Persistent Top Bar Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100/90 rounded-full border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>PayPal Sandbox · AI-assisted · Human-approved</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              target="_blank"
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-slate-50 border border-slate-200"
            >
              <span>Landing Page</span>
              <ExternalLink className="w-3 h-3" />
            </NavLink>
            <button
              onClick={() => navigate('/transactions/new')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
            >
              + Create Transaction
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

