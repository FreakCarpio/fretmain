import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import MessageBubble from '@/components/chat/MessageBubble';
import SugerenciasRapidas from '@/components/chat/SugerenciasRapidas';

const WILFREDO_SYSTEM = `Eres Wilfredo, un instructor experto y amigable de guitarra acústica. 
Solo respondes sobre guitarra acústica: técnica, escalas, afinaciones, acordes y memoria muscular.
Explicas de forma clara, paso a paso y motivadora. Hablas en español.
Si te preguntan algo que no es de guitarra, redirige amablemente al tema.
Usa emojis de vez en cuando para ser más expresivo 🎸`;

export default function Chat() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: mensajes = [] } = useQuery({
    queryKey: ['mensajes', sessionId],
    queryFn: () => base44.entities.MensajeWilfredo.filter({ sesion_id: sessionId }, 'created_date', 100),
    refetchInterval: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, isLoading]);

  const enviarMensaje = async (texto) => {
    const msg = texto || input.trim();
    if (!msg || isLoading) return;
    setInput('');
    setIsLoading(true);

    // Guardar mensaje del usuario
    await base44.entities.MensajeWilfredo.create({
      rol: 'user',
      contenido: msg,
      sesion_id: sessionId,
    });

    queryClient.invalidateQueries({ queryKey: ['mensajes', sessionId] });

    // Obtener respuesta de Wilfredo
    const historial = mensajes.slice(-6).map(m => ({
      role: m.rol === 'user' ? 'user' : 'assistant',
      content: m.contenido,
    }));

    const respuesta = await base44.integrations.Core.InvokeLLM({
      prompt: `${WILFREDO_SYSTEM}

Historial reciente:
${historial.map(h => `${h.role === 'user' ? 'Usuario' : 'Wilfredo'}: ${h.content}`).join('\n')}

Usuario: ${msg}

Wilfredo:`,
    });

    await base44.entities.MensajeWilfredo.create({
      rol: 'wilfredo',
      contenido: respuesta,
      sesion_id: sessionId,
    });

    queryClient.invalidateQueries({ queryKey: ['mensajes', sessionId] });
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="font-bold text-primary-foreground">W</span>
          </div>
          <div>
            <p className="font-bold text-foreground">Wilfredo</p>
            <p className="text-xs text-green-400">🟢 Tu instructor de guitarra</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mensajes.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎸</span>
            </div>
            <p className="font-semibold text-foreground">¡Hola! Soy Wilfredo</p>
            <p className="text-xs text-muted-foreground mt-1 mb-6">Tu instructor personal de guitarra acústica</p>
            <SugerenciasRapidas onSelect={enviarMensaje} />
          </div>
        )}

        {mensajes.map(m => (
          <MessageBubble key={m.id} mensaje={m} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-xs font-bold text-primary-foreground">W</span>
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border">
        {mensajes.length > 0 && (
          <div className="mb-3">
            <SugerenciasRapidas onSelect={enviarMensaje} />
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-foreground text-sm outline-none border border-border focus:border-primary resize-none"
            placeholder="Pregúntale algo a Wilfredo..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={() => enviarMensaje()}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}