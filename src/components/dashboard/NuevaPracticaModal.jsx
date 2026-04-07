import { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ejercicios = ['escala', 'acordes', 'fingerpicking', 'strumming', 'libre'];

export default function NuevaPracticaModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: '',
    ejercicio: 'libre',
    duracion_minutos: 15,
    puntuacion: 7,
    fecha: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.titulo.trim()) return;
    setLoading(true);

    // Generar feedback de Wilfredo con IA
    const feedbackRaw = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres Wilfredo, un instructor experto de guitarra acústica. 
El estudiante acaba de terminar una práctica de ${form.duracion_minutos} minutos de ${form.ejercicio} 
titulada "${form.titulo}" y se autoevaluó con ${form.puntuacion}/10.
Da un feedback corto, motivador y específico (máximo 2 oraciones) en español.`,
    });

    await base44.entities.Practica.create({
      ...form,
      feedback_wilfredo: feedbackRaw,
    });

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Nueva Práctica</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">¿Qué practicaste?</label>
            <input
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-sm outline-none border border-border focus:border-primary"
              placeholder="Ej: Escala de Do mayor"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Tipo de ejercicio</label>
            <div className="flex flex-wrap gap-2">
              {ejercicios.map(ej => (
                <button
                  key={ej}
                  onClick={() => setForm({ ...form, ejercicio: ej })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.ejercicio === ej ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duración (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-sm outline-none border border-border focus:border-primary"
                value={form.duracion_minutos}
                onChange={e => setForm({ ...form, duracion_minutos: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Auto-evaluación /10</label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-sm outline-none border border-border focus:border-primary"
                value={form.puntuacion}
                onChange={e => setForm({ ...form, puntuacion: Number(e.target.value) })}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || !form.titulo.trim()}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Wilfredo analizando... 🎸' : 'Guardar práctica'}
          </button>
        </div>
      </div>
    </div>
  );
}