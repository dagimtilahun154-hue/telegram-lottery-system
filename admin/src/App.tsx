import { useState } from 'react';
import { LayoutDashboard, Ticket, CheckSquare, ShoppingBag, Radio, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LotteryManager } from './pages/LotteryManager';
import { Purchases } from './pages/Purchases';
import { Verification } from './pages/Verification';
import { Broadcast } from './pages/Broadcast';
import './index.css';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'lottery', icon: Ticket, label: 'Lottery Manager' },
  { id: 'verification', icon: CheckSquare, label: 'Verification' },
  { id: 'purchases', icon: ShoppingBag, label: 'Purchases' },
  { id: 'broadcast', icon: Radio, label: 'Broadcast Studio' },
];

function App() {
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem('admin_auth') === 'true');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuth) {
    return <Login onLogin={() => setIsAuth(true)} />;
  }

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'lottery': return <LotteryManager />;
      case 'verification': return <Verification />;
      case 'purchases': return <Purchases />;
      case 'broadcast': return <Broadcast />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <ShieldCheck size={20} color="var(--primary-accent)" />
          <span>Lottery Admin</span>
        </div>
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Overlay backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} color="var(--primary-accent)" />
            <h1>Lottery Admin</h1>
          </div>
          <p>Management & Operations</p>
        </div>

        <ul className="nav-list">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          className="nav-link logout-btn"
          onClick={() => { localStorage.removeItem('admin_auth'); setIsAuth(false); }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
