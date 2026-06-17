'use client';

import { useState } from 'react';
import '../styles/auth.css';

export default function LoginForm({ onLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = onLogin(email, password);
    if (result.success) {
      onClose();
      return;
    }
    setError(result.error);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form className="auth-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Iniciar sesión</h2>
        <p>Ingresa tus credenciales para acceder a Polaria AI.</p>

        <div className="auth-field">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="auth-btn auth-btn--primary">
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}
