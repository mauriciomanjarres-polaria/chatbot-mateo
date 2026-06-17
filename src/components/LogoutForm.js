'use client';

import { useState } from 'react';
import '../styles/auth.css';

export default function LogoutForm({ user, onLogout, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (confirmText.trim().toLowerCase() !== 'salir') {
      setError('Escribe "salir" para confirmar.');
      return;
    }
    onLogout();
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form className="auth-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Cerrar sesión</h2>
        <p>
          ¿Seguro que deseas salir de la cuenta <strong>{user?.email}</strong>?
        </p>

        <div className="auth-field">
          <label htmlFor="logout-confirm">Escribe &quot;salir&quot; para confirmar</label>
          <input
            id="logout-confirm"
            type="text"
            placeholder="salir"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError('');
            }}
            autoComplete="off"
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="auth-btn auth-btn--danger">
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
