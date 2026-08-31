import { useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useUser } from './hooks/useSupabase';
import { Navbar } from './components/Navbar';
import { Register } from './pages/Register';
import { Grid } from './pages/Grid';
import { MyTickets } from './pages/MyTickets';
import { Draws } from './pages/Draws';
import { Settings } from './pages/Settings';
import './index.css';

function App() {
  const { telegramId, isReady } = useTelegram();
  const { user, loading, setUser } = useUser(telegramId);
  const [currentPage, setCurrentPage] = useState('grid');

  // Wait for TWA SDK + user data
  if (!isReady || loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>
      </div>
    );
  }

  // Not registered — show register page
  if (!user) {
    return <Register onRegistered={() => window.location.reload()} />;
  }

  // Handle language change from settings
  const handleLanguageChange = (lang: string) => {
    setUser({ ...user, language_code: lang });
  };

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'grid':
        return <Grid />;
      case 'mytickets':
        return <MyTickets />;
      case 'draws':
        return <Draws />;
      case 'settings':
        return <Settings user={user} onLanguageChange={handleLanguageChange} />;
      default:
        return <Grid />;
    }
  };

  return (
    <>
      {renderPage()}
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
    </>
  );
}

export default App;
