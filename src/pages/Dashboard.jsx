import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Flame, Clock, Target, ChevronRight, Music2 } from 'lucide-react';
import NuevaPracticaModal from '@/components/dashboard/NuevaPracticaModal';
import PracticaCard from '@/components/dashboard/PracticaCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CANCIONES_SUGERIDAS = [
  { titulo: 'Do I Wanna Know?', artista: 'Arctic Monkeys', nivel: 'Intermedio' },
  { titulo: 'Come As You Are', artista: 'Nirvana', nivel: 'Fácil' },
  { titulo: 'Wonderwall', artista: 'Oasis', nivel: 'Fácil' },
  { titulo: 'Hotel California', artista: 'Eagles', nivel: 'Avanzado' },
  { titulo: '505', artista: 'Arctic Monkeys', nivel: 'Intermedio' },
];

const nivelColor = {
  'Fácil': 'text-green-400',
  'Intermedio': 'text-primary',
  'Avanzado': 'text-red-400',
};

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: practicas = [], isLoading } = useQuery({
    queryKey: ['practicas'],
    queryFn: () => base44.entities.Practica.list('-created_date', 20),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const totalMinutos = practicas.reduce((acc, p) => acc + (p.duracion_minutos || 0), 0);
  const promedioPrecision = practicas.length
    ? Math.round(practicas.reduce((acc, p) => acc + (p.precision || 0), 0) / practicas.length)
    : 0;

  const racha = (() => {
    if (!practicas.length) return 0;
    let dias = new Set();
    practicas.forEach(p => {
      const d = new Date(p.created_date);
      dias.add(d.toDateString());
    });
    return dias.size;
  })();

  const objetivoMinutos = 15;
  const minutosHoy = practicas
    .filter(p => new Date(p.created_date).toDateString() === new Date().toDateString())
    .reduce((acc, p) => acc + (p.duracion_minutos || 0), 0);
  const progresoObjetivo = Math.min(100, Math.round((minutosHoy / objetivoMinutos) * 100));

  const ultimaPractica = practicas[0];
  const firstName = user?.full_name?.split(' ')[0] || 'Guitarrista';

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Hola, {firstName} 👋</h2>
        <p className="text-muted-foreground text-sm mt-0.5">GuitarAI detecta que hoy puedes subir de nivel.</p>
        <p className="text-primary text-sm font-semibold mt-1">Nivel IA actual: Intermedio</p>
      </div>

      {/* Continuar práctica */}
      {ultimaPractica && (
        <div className="bg-card rounded-2xl p-4 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-3 h-3 text-primary fill-primary" />
            </div>
            <p className="font-bold text-foreground">Continuar práctica</p>
          </div>
          <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
            Tu última sesión fue de <span className="text-foreground font-medium">{ultimaPractica.ejercicio}</span>. 
            Sigue practicando para mejorar tu técnica.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold"
            >
              Seguir
            </button>
            <button className="border border-border text-foreground px-4 py-2 rounded-full text-xs font-semibold">
              Ver rutina
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3 border border-border/60">
          <div className="text-pink-400 mb-1">⭐</div>
          <p className="text-2xl font-black text-foreground">{racha}</p>
          <p className="text-xs text-muted-foreground">Racha</p>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min(100, racha * 10)}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-3 border border-border/60">
          <div className="text-green-400 mb-1">🎯</div>
          <p className="text-2xl font-black text-foreground">{promedioPrecision}%</p>
          <p className="text-xs text-muted-foreground">Precisión</p>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: `${promedioPrecision}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-3 border border-border/60">
          <div className="text-blue-400 mb-1">👤</div>
          <p className="text-2xl font-black text-foreground">{practicas.length}</p>
          <p className="text-xs text-muted-foreground">Completadas</p>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, practicas.length * 5)}%` }} />
          </div>
        </div>
      </div>

      {/* Objetivo del día */}
      <div className="bg-card rounded-2xl p-4 border border-border/60">
        <p className="text-primary font-bold text-sm mb-2">Objetivo del día</p>
        <p className="text-foreground text-sm mb-1">Completa {objetivoMinutos} minutos de práctica y mejora tu precisión en notas al 90%.</p>
        <p className="text-muted-foreground text-xs mb-3">Progreso de hoy: {minutosHoy} / {objetivoMinutos} min</p>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progresoObjetivo}%` }}
          />
        </div>
      </div>

      {/* Consejo de Wilfredo */}
      {ultimaPractica?.feedback_wilfredo && (
        <div className="bg-card rounded-2xl p-4 border border-primary/20">
          <p className="text-primary font-bold text-sm mb-2">Consejo de Wilfredo</p>
          <p className="text-foreground text-sm leading-relaxed line-clamp-3">
            {ultimaPractica.feedback_wilfredo}
          </p>
        </div>
      )}

      {/* Prácticas recientes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-foreground">Prácticas recientes</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold"
          >
            <Plus className="w-3 h-3" /> Nueva
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse border border-border" />)}
          </div>
        ) : practicas.length === 0 ? (
          <div className="text-center py-10">
            <Music2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">¡Toca "Nueva" para comenzar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {practicas.slice(0, 5).map(p => (
              <PracticaCard key={p.id} practica={p} />
            ))}
          </div>
        )}
      </div>

      {/* Canciones sugeridas */}
      <div>
        <p className="font-bold text-foreground mb-3">Canciones sugeridas</p>
        <div className="space-y-2">
          {CANCIONES_SUGERIDAS.slice(0, 3).map((c, i) => (
            <div key={i} className="bg-card rounded-2xl px-4 py-3 border border-border/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{c.titulo}</p>
                <p className="text-xs text-muted-foreground">{c.artista}</p>
              </div>
              <span className={`text-xs font-semibold ${nivelColor[c.nivel]}`}>{c.nivel}</span>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <NuevaPracticaModal
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['practicas'] })}
        />
      )}
    </div>
  );
}