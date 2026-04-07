import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Search, Guitar, Star, User, Music } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/Dashboard', icon: Home, label: 'Home' },
    { path: '/Buscar', icon: Search, label: 'Buscar' },
    { path: '/Practica', icon: Guitar, label: 'Práctica' },
    { path: '/Afinador', icon: Music, label: 'Afinador' },
    { path: '/Progreso', icon: Star, label: 'Progreso' },
    { path: '/Chat', icon: User, label: 'Wilfredo' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border/40">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Music className="w-4 h-4 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">GuitarAI</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border/60 px-1 py-2 flex justify-around z-50">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} className="flex flex-col items-center gap-0.5 flex-1 py-1">
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/20' : ''}`}>
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}