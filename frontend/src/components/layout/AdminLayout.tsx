import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  Sliders, 
  UserCheck, 
  LogOut, 
  Menu, 
  X,
  Brain
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Academic Structure', path: '/admin/structure', icon: BookOpen },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/admin/settings', icon: Sliders },
    { name: 'Admin Users', path: '/admin/users', icon: UserCheck }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800 shadow-xl">
        <div className="p-6 flex items-center gap-3 bg-slate-950 border-b border-slate-800">
          <Brain className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
              NeuroPlan
            </h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path) || (item.path === '/admin/dashboard' && location.pathname === '/admin');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-300 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          
          <aside className="relative flex flex-col w-64 bg-slate-900 text-white h-full shadow-2xl animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 flex items-center gap-3 bg-slate-950 border-b border-slate-800">
              <Brain className="h-8 w-8 text-indigo-400" />
              <div>
                <h1 className="font-extrabold text-lg bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
                  NeuroPlan
                </h1>
                <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Admin Console</p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" onClick={() => setMobileOpen(false)}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path) || (item.path === '/admin/dashboard' && location.pathname === '/admin');
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-300 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-6 py-4 md:hidden bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-indigo-600" />
            <span className="font-extrabold text-slate-900 tracking-tight">NeuroPlan Admin</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
