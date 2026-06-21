'use client';

import { useState } from 'react';
import * as authApi from '../lib/auth-api';
import PolariaIcon from './PolariaIcon';
import '../styles/auth.css';

export default function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [needsCompanyCode, setNeedsCompanyCode] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!needsCompanyCode) {
        const preloginResult = await authApi.prelogin(username.trim());

        if (preloginResult.status === 422) {
          setNeedsCompanyCode(true);
          return;
        }

        if (!preloginResult.ok) {
          setError(preloginResult.error || 'No se pudo validar el usuario.');
          return;
        }
      }

      const loginResult = await authApi.login({
        username: username.trim(),
        password,
        codigoEmpresa: needsCompanyCode ? codigoEmpresa.trim() : undefined,
      });

      if (!loginResult.ok || !loginResult.session) {
        setError(loginResult.error || 'Usuario o contraseña incorrectos.');
        return;
      }

      onLoginSuccess(loginResult.session);
    } catch {
      setError('No se pudo conectar con el servidor. Revisa tu conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sso-page">
      <form className="sso-card auth-form" onSubmit={handleSubmit}>
        <PolariaIcon size={32} />
        <h1>Iniciar sesión</h1>
        <p>Modo desarrollo local — usa las mismas credenciales del WMS.</p>

        <div className="auth-field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {needsCompanyCode && (
          <div className="auth-field">
            <label htmlFor="codigoEmpresa">Código de empresa</label>
            <input
              id="codigoEmpresa"
              type="text"
              autoComplete="organization"
              value={codigoEmpresa}
              onChange={(event) => setCodigoEmpresa(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-btn auth-btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
