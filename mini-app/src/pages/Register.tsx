import React, { useState } from 'react';
import { ShieldCheck, PhoneCall, ArrowRight, Loader2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { registerUser } from '../services/supabase';

interface RegisterProps {
  onRegistered: () => void;
}

export function Register({ onRegistered }: RegisterProps) {
  const { telegramId, firstName, lastName, username, showAlert } = useTelegram();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      showAlert('Please enter a valid phone number (e.g. 0911223344 or +251911223344).');
      return;
    }

    if (!telegramId) {
      showAlert('Telegram ID not found. Please reload inside Telegram.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        telegramId,
        firstName: firstName || 'User',
        lastName,
        username,
        phoneNumber: cleanPhone,
        languageCode: 'am',
      });

      showAlert('🎉 Registration successful! Welcome to Diktyo Lottery.');
      onRegistered();
    } catch (err: any) {
      console.error('Registration error:', err);
      showAlert(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page" style={{ padding: '24px 16px', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
      <div className="logo-badge" style={{ display: 'inline-flex', padding: '16px', background: 'var(--color-surface-hover)', borderRadius: '50%', color: 'var(--color-primary)', marginBottom: '16px' }}>
        <ShieldCheck size={36} />
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Create Your Account</h1>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '24px' }}>
        Welcome{firstName ? `, ${firstName}` : ''}! Register your phone number to reserve lottery spots and view active tickets.
      </p>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Phone Number
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="tel"
              placeholder="0911223344 or +251..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: '1rem',
              }}
            />
            <PhoneCall size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-block"
          style={{
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Registering...
            </>
          ) : (
            <>
              Register Account <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
