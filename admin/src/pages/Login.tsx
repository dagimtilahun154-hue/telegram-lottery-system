import { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = import.meta.env.VITE_ADMIN_PIN || '1234';
    if (pin === correctPin) {
      localStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setError('Invalid PIN code. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="icon-wrap">
          <Lock size={22} />
        </div>
        <h1>Admin Authentication</h1>
        <p>Enter administrative access PIN to continue</p>

        {error && <div className="pin-error">{error}</div>}

        <input
          type="password"
          className="pin-input"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          maxLength={8}
          autoFocus
          placeholder="••••"
        />

        <button className="btn btn-primary btn-block" style={{ padding: '12px' }} type="submit">
          Authenticate <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
