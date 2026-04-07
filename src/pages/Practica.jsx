import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Square, Loader2, ChevronRight, BookOpen, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EjerciciosGuiados from '@/components/practica/EjerciciosGuiados';

const EJERCICIOS = [
  { id: 'escalas', label: 'Escalas', emoji: '🎼', desc: 'Mayor, menor, pentatónica' },
  { id: 'acordes', label: 'Acordes', emoji: '🎸', desc: 'Abiertos y con cejilla' },
  { id: 'fingerpicking', label: 'Fingerpicking', emoji: '🤌', desc: 'Patrones p-i-m-a' },
  { id: 'rasgueo', label: 'Rasgueo', emoji: '⚡', desc: 'Strumming y ritmo' },
  { id: 'ritmo', label: 'Ritmo', emoji: '🥁', desc: 'Compás y subdivisión' },
  { id: 'calentamiento', label: 'Calentamiento', emoji: '🔥', desc: 'Ejercicios de dedos' },
];

function simularMetricas(ejercicio, duracionSeg) {
  const base = Math.min(duracionSeg / 10, 10);
  const rand = (min, max) => Math.round(Math.random() * (max - min) + min);
  return {
    puntuacion: Math.min(10, parseFloat((base * 0.5 + rand(3, 5)).toFixed(1))),
    bpm: ejercicio === 'calentamiento' ? rand(60, 80) : ejercicio === 'escalas' ? rand(80, 120) : rand(90, 140),
    energia: rand(45, 95),
    precision: rand(50, 95),
    ritmo: rand(50, 98),
  };
}

export default function Practica() {
  const [fase, setFase] = useState('seleccion'); // seleccion | modo | guiado | cronometro | analisis | resultado
  const [ejercicioSel, setEjercicioSel] = useState(null);
  const [modoSeleccionado, setModoSeleccionado] = useState(null); // 'guiado' | 'libre'
  const [segundos, setSegundos] = useState(0);
  const [metricas, setMetricas] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);

  const intervalRef = useRef(null);
  const queryClient = useQueryClient();

  const iniciarLibre = () => {
    setSegundos(0);
    setFase('cronometro');
    intervalRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
  };

  const finalizarSesion = async (durSeg, completados = 0) => {
    clearInterval(intervalRef.current);
    const met = simularMetricas(ejercicioSel.id, durSeg || segundos);
    setMetricas(met);
    setEjerciciosCompletados(completados);
    setFase('analisis');
    setLoadingFeedback(true);

    const historial = await base44.entities.Practica.list('-created_date', 5);
    const resumen = historial.length > 0
      ? historial.map(p => `- ${p.ejercicio}: puntuación ${p.puntuacion}/10`).join('\n')
      : 'Sin historial previo.';

    const respuesta = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres Wilfredo, instructor experto de guitarra acústica.
SESIÓN: ${ejercicioSel.label} | Duración: ${Math.floor((durSeg || segundos) / 60)} min ${(durSeg || segundos) % 60} seg
Puntuación: ${met.puntuacion}/10 | BPM: ${met.bpm} | Precisión: ${met.precision}% | Ritmo: ${met.ritmo}%
${completados > 0 ? `Ejercicios guiados completados: ${completados}` : 'Sesión libre.'}
Historial: ${resumen}

Da feedback personalizado en 3 secciones (en español con emojis):
1. **Feedback** (2 oraciones motivadoras y honestas)
2. **Errores detectados** (1-2 específicos)
3. **Próxima clase** (qué practicar, BPM, tiempo)`,
      model: 'claude_sonnet_4_6',
    });

    await base44.entities.Practica.create({
      titulo: `${ejercicioSel.label} - ${new Date().toLocaleDateString('es-ES')}`,
      ejercicio: ejercicioSel.id,
      fecha: new Date().toISOString(),
      duracion_segundos: durSeg || segundos,
      duracion_minutos: parseFloat(((durSeg || segundos) / 60).toFixed(1)),
      ...met,
      feedback_wilfredo: respuesta,
      errores_detectados: extraerSeccion(respuesta, 'errores'),
      proxima_clase: extraerSeccion(respuesta, 'próxima'),
    });

    queryClient.invalidateQueries({ queryKey: ['practicas'] });
    setFeedback(respuesta || 'No se pudo generar feedback en este momento. ¡Sigue practicando! 🎸');
    setLoadingFeedback(false);
    setFase('resultado');
  };

  const extraerSeccion = (texto, clave) => {
    if (!texto) return '';
    const match = texto.match(new RegExp(`${clave}[^:]*:(.*?)(?:\\n\\d|\\*\\*|$)`, 'si'));
    return match ? match[1].trim().slice(0, 200) : '';
  };

  const reiniciar = () => {
    setFase('seleccion');
    setEjercicioSel(null);
    setModoSeleccionado(null);
    setSegundos(0);
    setMetricas(null);
    setFeedback(null);
    setEjerciciosCompletados(0);
  };

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <div className="px-4 py-5">
      <h2 className="text-2xl font-bold text-foreground mb-1">Práctica</h2>
      <p className="text-muted-foreground text-sm mb-5">Sesión con feedback de Wilfredo 🤖</p>

      <AnimatePresence mode="wait">

        {/* SELECCIÓN DE EJERCICIO */}
        {fase === 'seleccion' && (
          <motion.div key="sel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Elige un ejercicio</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {EJERCICIOS.map(ej => (
                <button
                  key={ej.id}
                  onClick={() => setEjercicioSel(ej)}
                  className={`rounded-2xl p-4 text-left border transition-all ${
                    ejercicioSel?.id === ej.id
                      ? 'border-primary bg-primary/20'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  <span className="text-2xl block mb-2">{ej.emoji}</span>
                  <p className="font-semibold text-foreground text-sm">{ej.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ej.desc}</p>
                </button>
              ))}
            </div>

            {ejercicioSel && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setFase('modo')}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Continuar con {ejercicioSel.label}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* SELECCIÓN DE MODO */}
        {fase === 'modo' && (
          <motion.div key="modo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-6">
              <span className="text-4xl">{ejercicioSel.emoji}</span>
              <p className="font-bold text-foreground mt-2 text-lg">{ejercicioSel.label}</p>
              <p className="text-muted-foreground text-sm">{ejercicioSel.desc}</p>
            </div>

            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">¿Cómo quieres practicar?</p>

            <div className="space-y-3 mb-6">
              {/* Modo guiado */}
              <button
                onClick={() => { setModoSeleccionado('guiado'); setFase('guiado'); }}
                className="w-full bg-card border border-primary/40 rounded-2xl p-4 text-left hover:border-primary transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Práctica guiada</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ejercicios paso a paso estilo Yousician. Te guío en cada movimiento.</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">Recomendado</span>
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">5 ejercicios</span>
                </div>
              </button>

              {/* Modo libre */}
              <button
                onClick={() => { setModoSeleccionado('libre'); iniciarLibre(); }}
                className="w-full bg-card border border-border/60 rounded-2xl p-4 text-left hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Timer className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Práctica libre</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Toca a tu ritmo. Cronómetro + análisis de Wilfredo al finalizar.</p>
                  </div>
                </div>
              </button>
            </div>

            <button onClick={() => setFase('seleccion')} className="text-muted-foreground text-sm underline w-full text-center">
              ← Cambiar ejercicio
            </button>
          </motion.div>
        )}

        {/* MODO GUIADO */}
        {fase === 'guiado' && (
          <motion.div key="guiado" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">{ejercicioSel.emoji}</span>
              <div>
                <p className="font-bold text-foreground">{ejercicioSel.label} — Guiado</p>
                <p className="text-xs text-muted-foreground">Sigue cada ejercicio a tu ritmo</p>
              </div>
            </div>
            <EjerciciosGuiados
              ejercicio={ejercicioSel.id}
              onFinalizar={(completados) => finalizarSesion(completados * 90, completados)}
            />
          </motion.div>
        )}

        {/* CRONÓMETRO LIBRE */}
        {fase === 'cronometro' && (
          <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <div className="mb-4">
              <span className="text-2xl">{ejercicioSel.emoji}</span>
              <p className="font-bold text-foreground mt-1">{ejercicioSel.label}</p>
            </div>
            <div className="relative w-52 h-52 mx-auto mb-8">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="88" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                <circle
                  cx="100" cy="100" r="88"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8" fill="none"
                  strokeDasharray={553}
                  strokeDashoffset={553 - (553 * ((segundos % 60) / 60))}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-foreground tabular-nums">{mm}:{ss}</span>
                <span className="text-xs text-muted-foreground mt-1">en curso</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 mb-8">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{ height: [4, Math.random() * 28 + 8, 4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.07 }}
                />
              ))}
            </div>
            <button
              onClick={() => finalizarSesion(segundos)}
              className="w-full bg-destructive text-destructive-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Finalizar sesión
            </button>
          </motion.div>
        )}

        {/* ANALIZANDO */}
        {fase === 'analisis' && (
          <motion.div key="anal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <p className="font-bold text-foreground text-lg">Wilfredo está analizando...</p>
            <p className="text-muted-foreground text-sm mt-2">Generando feedback personalizado 🎸</p>
            <div className="mt-6 space-y-2">
              {['Procesando métricas...', 'Revisando historial...', 'Preparando feedback adaptativo...'].map((t, i) => (
                <motion.p key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                  className="text-xs text-muted-foreground">✓ {t}</motion.p>
              ))}
            </div>
          </motion.div>
        )}

        {/* RESULTADO */}
        {fase === 'resultado' && metricas && (
          <motion.div key="res" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {ejerciciosCompletados > 0 && (
              <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-3 mb-4 text-center">
                <p className="text-green-400 font-bold">🎉 ¡Completaste {ejerciciosCompletados} ejercicios guiados!</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Puntuación', value: `${metricas.puntuacion}/10`, color: 'text-primary' },
                { label: 'BPM', value: metricas.bpm, color: 'text-blue-400' },
                { label: 'Energía', value: `${metricas.energia}%`, color: 'text-orange-400' },
                { label: 'Precisión', value: `${metricas.precision}%`, color: 'text-green-400' },
                { label: 'Ritmo', value: `${metricas.ritmo}%`, color: 'text-purple-400' },
                { label: 'Duración', value: `${mm}:${ss}`, color: 'text-foreground' },
              ].map(m => (
                <div key={m.label} className="bg-card border border-border/60 rounded-2xl p-3 text-center">
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-primary/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">W</span>
                </div>
                <p className="font-semibold text-foreground text-sm">Feedback de Wilfredo</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{feedback}</p>
            </div>
            <button
              onClick={reiniciar}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              Nueva sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}