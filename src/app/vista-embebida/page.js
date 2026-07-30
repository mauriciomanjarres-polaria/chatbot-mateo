'use client';

import { useEffect, useState } from 'react';
import {
  EMBED_MSG_LOAD,
  EMBED_MSG_READY,
} from '../../lib/embed-registry';

function isSafeHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function VistaEmbebidaPage() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      if (!event.data || event.data.type !== EMBED_MSG_LOAD) return;

      const targetUrl = event.data.url;
      if (!isSafeHttpUrl(targetUrl)) {
        setStatus('error');
        return;
      }

      setStatus('redirecting');
      window.location.replace(targetUrl);
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: EMBED_MSG_READY }, window.location.origin);

    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <main
      style={{
        margin: 0,
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#050708',
        color: 'rgba(248, 248, 246, 0.55)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
      }}
    >
      {status === 'error'
        ? 'No se pudo cargar la vista'
        : 'Cargando vista…'}
    </main>
  );
}
