import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased">
      {/* Sidebar Navigation */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-[#f3eeff] dark:bg-slate-900 shadow-[12px_0_32px_rgba(44,42,81,0.04)] flex flex-col gap-2 p-4 border-r border-[#aca8d7]/15 z-50">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-[#2444eb] dark:text-[#8999ff]">Scholar Admin</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">System Control</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path === '/' ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Dashboard</span>
          </Link>
          <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path.includes('/users') ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">group</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Users</span>
          </Link>
          <Link to="/campaigns" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path.includes('/campaigns') ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">campaign</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Campaigns</span>
          </Link>
          <Link to="/payouts" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path.includes('/payouts') ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">payments</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Payouts</span>
          </Link>
          <Link to="/tickets" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path.includes('/tickets') ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">support_agent</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Help Desk</span>
          </Link>
          <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${path.includes('/settings') ? 'bg-[#ddd9ff] dark:bg-[#2444eb]/20 text-[#2444eb] dark:text-[#45fec9] border-r-4 border-[#2444eb] font-semibold hover:translate-x-1 active:opacity-80' : 'text-[#2c2a51] dark:text-[#aca8d7] hover:bg-[#ddd9ff]/30 hover:translate-x-1 font-semibold active:opacity-80'}`}>
            <span className="material-symbols-outlined">settings</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Settings</span>
          </Link>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-[#aca8d7]/20 flex flex-col gap-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error/10 transition-all font-bold group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">logout</span>
            <span className="font-['Plus_Jakarta_Sans'] text-sm font-medium">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="ml-64 min-h-screen">
        {/* Top App Bar */}
        <header className="w-full sticky top-0 z-40 bg-[#f9f5ff] dark:bg-slate-950 font-['Plus_Jakarta_Sans'] antialiased flex items-center justify-between px-8 py-4 border-b border-[#aca8d7]/15">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-md hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-outline-variant" placeholder="Search by name or email..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button className="p-2 text-on-surface-variant hover:bg-[#ddd9ff]/50 rounded-lg transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-[#ddd9ff]/50 rounded-lg transition-colors">
                <span className="material-symbols-outlined">settings_suggest</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/30 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface truncate max-w-[120px]">{user?.email?.split('@')[0] || 'Administrator'}</p>
                <p className="text-[10px] text-outline uppercase tracking-wider font-bold">System Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-black text-xs border-2 border-primary/20 shadow-sm">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
