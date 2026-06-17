import { useState } from 'react';

const PHONE_NUMBER_ID = "1104260132766227";
const USER_PHONE = "573017447947";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const nuevoChat = () => {
    setMessages([]);
    setShowWelcome(true);
  };

  const enviarMensaje = async () => {
    const texto = inputValue.trim();
    if (!texto) return;

    setShowWelcome(false);
    setInputValue('');
    
    const nuevosMensajes = [...messages, { tipo: 'usuario', texto }];
    setMessages(nuevosMensajes);
    setHistory(prev => [texto.substring(0, 30), ...prev]);

    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: PHONE_NUMBER_ID },
            messages: [{
              from: USER_PHONE,
              id: 'wamid.' + crypto.randomUUID().replace(/-/g, ''),
              type: 'text',
              text: { body: texto }
            }]
          }
        }]
      }]
    };

    try {
      const response = await fetch('https://polariatech.app.n8n.cloud/webhook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const respuestaIA = data.output ?? data.reply ?? JSON.stringify(data);

      setMessages([...nuevosMensajes, { tipo: 'ia', texto: respuestaIA }]);
    } catch (e) {
      setMessages([...nuevosMensajes, { tipo: 'ia', texto: 'Error al conectar con el servidor.' }]);
    }
  };

  return {
    messages,
    history,
    inputValue,
    setInputValue,
    showWelcome,
    nuevoChat,
    enviarMensaje
  };
}
