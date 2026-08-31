import { ShieldCheck, PhoneCall, ArrowRight } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface RegisterProps {
  onRegistered: () => void;
}

export function Register({}: RegisterProps) {
  const { firstName, showAlert } = useTelegram();

  const handleRegister = () => {
    showAlert(
      'To complete registration, please return to the bot chat window and tap the "Register" button to share your phone number.'
    );
  };

  return (
    <div className="register-page">
      <div className="logo-badge">
        <ShieldCheck size={32} />
      </div>
      <h1>Account Registration</h1>
      <p>
        Welcome{firstName ? `, ${firstName}` : ''}.<br />
        To participate in spot lotteries and track your purchases, please register your phone number via Telegram.
      </p>
      <button className="btn btn-primary btn-block" onClick={handleRegister} style={{ padding: '12px' }}>
        <PhoneCall size={18} /> Register via Telegram <ArrowRight size={16} />
      </button>
      <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        Already completed registration? Pull down to refresh your view.
      </p>
    </div>
  );
}
