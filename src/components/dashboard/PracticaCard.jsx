import { useState } from 'react';
import { Music2, Clock, Star, ChevronDown, ChevronUp, Zap, Target, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const ejercicioColors = {
  escalas: 'bg-blue-500/20 text-blue-400',
  acordes: 'bg-purple-500/20 text-purple-400',
  fingerpicking: 'bg-green-500/20 text-green-400',
  rasgueo: 'bg-orange-500/20 text-orange-400',
  ritmo: 'bg-pink-500/20 text-pink-400',
  calentamiento: 'bg-red-500/20 text-red-400',
  libre: 'bg-muted text-muted-foreground',
};

const ejercicioEmoji = {
  escalas: '🎼', acordes: '🎸', fingerpicking: '🤌',
  rasgueo: '⚡', ritmo: '🥁', calentamiento: '🔥', libre: '🎵',
};

export default function PracticaCard({ practica }) {
  const [expandida, setExpandida] = useState(false);

  const tieneMetricas = practica.bpm || practica.energia || practica.precision || practica.ritmo;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <button
        className="w-full p-4 text-left"
        onClick={() => setExpandida(e => !e)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{ejercicioEmoji[practica.ejercicio] || '🎵'}</span>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">{practica.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ejercicioColors[practica.ejercicio] || ejercicioColors.libre}`}>
                  {practica.ejercicio}
                </span>
                {practica.duracion_minutos && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{practica.duracion_minutos} min</span>
                  </div>
                )}
                {practica.fecha && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(practica.fecha), "d MMM", { locale: es })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {practica.puntuacion && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs font-bold text-primary">{practica.puntuacion}/10</span>
              </div>
            )}
            {expandida ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expandible */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
              {/* Métricas */}
              {tieneMetricas && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Métricas de sesión</p>
                  <div className="grid grid-cols-2 gap-2">
                    {practica.bpm && (
                      <div className="bg-muted rounded-xl p-2.5 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <p className="text-xs font-bold text-blue-400">{practica.bpm} BPM</p>
                          <p className="text-xs text-muted-foreground">Tempo</p>
                        </div>
                      </div>
                    )}
                    {practica.energia && (
                      <div className="bg-muted rounded-xl p-2.5 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-orange-400" />
                        <div>
                          <p className="text-xs font-bold text-orange-400">{practica.energia}%</p>
                          <p className="text-xs text-muted-foreground">Energía</p>
                        </div>
                      </div>
                    )}
                    {practica.precision && (
                      <div className="bg-muted rounded-xl p-2.5 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-green-400" />
                        <div>
                          <p className="text-xs font-bold text-green-400">{practica.precision}%</p>
                          <p className="text-xs text-muted-foreground">Precisión</p>
                        </div>
                      </div>
                    )}
                    {practica.ritmo && (
                      <div className="bg-muted rounded-xl p-2.5 flex items-center gap-2">
                        <Music2 className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-purple-400">{practica.ritmo}%</p>
                          <p className="text-xs text-muted-foreground">Ritmo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback Wilfredo */}
              {practica.feedback_wilfredo && (
                <div className="bg-primary/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-primary mb-1">🎸 Wilfredo dice:</p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{practica.feedback_wilfredo}</p>
                </div>
              )}

              {/* Próxima clase */}
              {practica.proxima_clase && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">📅 Próxima clase:</p>
                  <p className="text-xs text-foreground leading-relaxed">{practica.proxima_clase}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}