import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Circle, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EJERCICIOS_POR_TIPO = {
  escalas: [
    {
      titulo: 'Posición de la mano',
      descripcion: 'Coloca el pulgar detrás del mástil, dedos curvados sobre las cuerdas. El dedo índice en el traste 5 de la cuerda E grave.',
      bpm: 60,
      compas: '4/4',
      patron: ['1', '2', '3', '4'],
      tip: 'Mantén los dedos cerca de los trastes para mejorar la presión.',
      duracion: 60,
    },
    {
      titulo: 'Escala de Do Mayor - Subida',
      descripcion: 'Sigue la secuencia: C-D-E-F-G-A-B-C. Cuerdas 5 y 4, trastes 3-2-0 en cada una.',
      bpm: 60,
      compas: '4/4',
      patron: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C↑'],
      tab: ['5:3', '5:0', '4:2', '4:0', '3:2', '3:0', '2:1', '1:0'],
      tip: 'Usa un dedo por traste. No saltes dedos.',
      duracion: 90,
    },
    {
      titulo: 'Escala de Do Mayor - Bajada',
      descripcion: 'Ahora en sentido inverso: C-B-A-G-F-E-D-C. Mismo patrón pero descendente.',
      bpm: 60,
      patron: ['C↓', 'B', 'A', 'G', 'F', 'E', 'D', 'C'],
      tip: 'Mantén el mismo ritmo que en la subida. No aceleres.',
      duracion: 90,
    },
    {
      titulo: 'Escala a 80 BPM',
      descripcion: 'Repite la escala completa (subida y bajada) a 80 BPM. Usa un metrónomo si puedes.',
      bpm: 80,
      patron: ['↑ C-D-E-F-G-A-B-C', '↓ C-B-A-G-F-E-D-C'],
      tip: 'Si te equivocas, no pares. Sigue el ritmo.',
      duracion: 120,
    },
    {
      titulo: 'Escala pentatónica menor en La',
      descripcion: 'Posición 1: trastes 5-8 en todas las cuerdas. Patrón: 5-8 / 5-7 / 5-7 / 5-7 / 5-8 / 5-8',
      bpm: 70,
      patron: ['A', 'C', 'D', 'E', 'G', 'A↑'],
      tip: 'Esta es la escala base del rock y blues. ¡Memorízala!',
      duracion: 120,
    },
  ],
  acordes: [
    {
      titulo: 'Acorde de La menor (Am)',
      descripcion: 'Dedos: índice en 2ª cuerda traste 1, medio en 4ª traste 2, anular en 3ª traste 2. Cuerdas 1 y 5-6 al aire.',
      bpm: null,
      patron: ['Am', '×', '○', '2', '2', '1', '○'],
      tip: 'Presiona fuerte y rasguea lentamente para verificar cada nota.',
      duracion: 60,
    },
    {
      titulo: 'Acorde de Do Mayor (C)',
      descripcion: 'Índice en 2ª traste 1, medio en 4ª traste 2, anular en 5ª traste 3. No rasguees la 6ª cuerda.',
      bpm: null,
      patron: ['C', '×', '3', '2', '○', '1', '○'],
      tip: 'El acorde C es el más común. Practica hasta que salga limpio.',
      duracion: 60,
    },
    {
      titulo: 'Cambio Am → C',
      descripcion: 'Alterna entre Am y C cada 4 tiempos. Cuenta: 1-2-3-4 Am / 1-2-3-4 C.',
      bpm: 60,
      compas: '4/4',
      patron: ['Am', 'Am', 'Am', 'Am', 'C', 'C', 'C', 'C'],
      tip: 'El truco es anticipar el cambio en el tiempo 4. Mueve los dedos antes.',
      duracion: 90,
    },
    {
      titulo: 'Acorde de Sol Mayor (G)',
      descripcion: 'Meñique en 1ª traste 3, anular en 6ª traste 3, medio en 5ª traste 2. Todas las cuerdas suenan.',
      bpm: null,
      patron: ['G', '3', '2', '○', '○', '○', '3'],
      tip: 'G es grande pero muy usado. Practica la forma hasta que sea automática.',
      duracion: 60,
    },
    {
      titulo: 'Progresión Am - C - G',
      descripcion: 'La progresión más popular del pop. Cada acorde dura 4 tiempos a 70 BPM.',
      bpm: 70,
      compas: '4/4',
      patron: ['Am', 'Am', 'Am', 'Am', 'C', 'C', 'C', 'C', 'G', 'G', 'G', 'G'],
      tip: '¡Esta progresión es la base de cientos de canciones!',
      duracion: 120,
    },
  ],
  fingerpicking: [
    {
      titulo: 'Posición de la mano derecha',
      descripcion: 'Pulgar (p) cubre cuerdas 4, 5, 6. Índice (i) → 3ª. Medio (m) → 2ª. Anular (a) → 1ª.',
      bpm: null,
      patron: ['p', 'i', 'm', 'a'],
      tip: 'No apoyes la mano en la guitarra. Deja los dedos flotar.',
      duracion: 60,
    },
    {
      titulo: 'Patrón básico p-i-m-a',
      descripcion: 'Con un acorde de Am: pulsa pulgar (6ª), índice (3ª), medio (2ª), anular (1ª) en secuencia.',
      bpm: 60,
      compas: '4/4',
      patron: ['p', 'i', 'm', 'a', 'p', 'i', 'm', 'a'],
      tip: 'Empieza muy lento. La velocidad viene sola con la práctica.',
      duracion: 90,
    },
    {
      titulo: 'Patrón p-i-m-i',
      descripcion: 'Pulgar, índice, medio, índice. Es el patrón de "Dust in the Wind" y muchas baladas.',
      bpm: 60,
      patron: ['p', 'i', 'm', 'i', 'p', 'i', 'm', 'i'],
      tip: 'El índice es el pivot de este patrón. Debe ser constante.',
      duracion: 90,
    },
    {
      titulo: 'Travis Picking básico',
      descripcion: 'El pulgar alterna entre 6ª y 4ª cuerda mientras los otros dedos siguen el patrón.',
      bpm: 60,
      patron: ['p6', 'i', 'p4', 'm', 'p6', 'i', 'p4', 'm'],
      tip: 'Este estilo lo usan artistas como Paul Simon y Chet Atkins.',
      duracion: 120,
    },
  ],
  rasgueo: [
    {
      titulo: 'Rasgueo hacia abajo',
      descripcion: 'Muñeca relajada, rasguea hacia abajo con las uñas. Empieza desde la 6ª cuerda hasta la 1ª.',
      bpm: 60,
      compas: '4/4',
      patron: ['↓', '↓', '↓', '↓'],
      tip: 'El movimiento viene de la muñeca, no del codo.',
      duracion: 60,
    },
    {
      titulo: 'Rasgueo arriba-abajo',
      descripcion: 'Alterna rasgueos hacia abajo (↓) y arriba (↑). Cuenta: 1-y-2-y-3-y-4-y.',
      bpm: 60,
      compas: '4/4',
      patron: ['↓', '↑', '↓', '↑', '↓', '↑', '↓', '↑'],
      tip: 'El rasgueo hacia arriba es más suave. No fuerces.',
      duracion: 90,
    },
    {
      titulo: 'Patrón D-DU-UDU',
      descripcion: 'El patrón más común del pop: ↓ ↓↑ ↑↓↑. Cuenta: 1, 2-y, y-3-y.',
      bpm: 70,
      patron: ['↓', '↓', '↑', '↑', '↓', '↑'],
      tip: 'Usado en Wonderwall, House of Gold y muchísimas canciones.',
      duracion: 120,
    },
    {
      titulo: 'Muting con palma (Palm mute)',
      descripcion: 'Apoya el lado de la palma sobre las cuerdas cerca del puente. Rasguea hacia abajo.',
      bpm: 80,
      patron: ['PM↓', 'PM↓', '↓', '↑', 'PM↓', 'PM↓', '↓', '↑'],
      tip: 'El muting da ese sonido "chunky" del rock y metal.',
      duracion: 90,
    },
  ],
  ritmo: [
    {
      titulo: 'Sentir el pulso',
      descripcion: 'Golpea el cuerpo de la guitarra con la palma en tiempos 1 y 3. Pie en todos los tiempos.',
      bpm: 60,
      compas: '4/4',
      patron: ['1', '2', '3', '4'],
      tip: 'El ritmo es la base de todo. Sin ritmo no hay música.',
      duracion: 60,
    },
    {
      titulo: 'Subdivisión en corcheas',
      descripcion: 'Cuenta en voz alta: 1-y-2-y-3-y-4-y mientras rasgueas hacia abajo en cada número.',
      bpm: 70,
      patron: ['1', 'y', '2', 'y', '3', 'y', '4', 'y'],
      tip: 'Las "y" son los tiempos débiles. Deben sonar igual de fuertes.',
      duracion: 90,
    },
    {
      titulo: 'Síncopa básica',
      descripcion: 'Acento en los tiempos 2 y 4. Rasguea pero enfatiza esos tiempos. Es el "backbeat" del rock.',
      bpm: 70,
      patron: ['1', '2⚡', '3', '4⚡'],
      tip: 'El backbeat es lo que hace que la música tenga "swing".',
      duracion: 90,
    },
    {
      titulo: 'Compás de 3/4 (Vals)',
      descripcion: 'Tres tiempos por compás. Cuenta: 1-2-3 / 1-2-3. Rasguea en el 1 y golpea en 2 y 3.',
      bpm: 60,
      compas: '3/4',
      patron: ['1', '2', '3', '1', '2', '3'],
      tip: 'La música latinoamericana usa mucho este compás.',
      duracion: 90,
    },
  ],
  calentamiento: [
    {
      titulo: 'Estiramiento de dedos',
      descripcion: 'Estira cada dedo hacia atrás suavemente por 10 segundos. Empieza por el meñique.',
      bpm: null,
      patron: ['🤙 meñique', '💍 anular', '🖕 medio', '👆 índice'],
      tip: 'Nunca toques sin calentar. Evita lesiones.',
      duracion: 60,
    },
    {
      titulo: 'Ejercicio 1-2-3-4 (Araña)',
      descripcion: 'Coloca dedos 1, 2, 3, 4 en trastes consecutivos en cada cuerda. Sube y baja.',
      bpm: 60,
      patron: ['1', '2', '3', '4', '→ siguiente cuerda'],
      tab: ['6:1-2-3-4', '5:1-2-3-4', '4:1-2-3-4', '3:1-2-3-4', '2:1-2-3-4', '1:1-2-3-4'],
      tip: 'Este ejercicio entrena independencia de dedos. Es el más importante.',
      duracion: 120,
    },
    {
      titulo: 'Trinos de dedos',
      descripcion: 'Alterna rápidamente entre dos dedos en el mismo traste. Índice-Medio, luego Medio-Anular.',
      bpm: 80,
      patron: ['i-m', 'i-m', 'm-a', 'm-a', 'a-c', 'a-c'],
      tip: 'Los trinos mejoran la velocidad y coordinación.',
      duracion: 60,
    },
    {
      titulo: 'Cromatismo completo',
      descripcion: 'Toca cada semitraste consecutivo en todas las cuerdas, empezando en el traste 1.',
      bpm: 70,
      patron: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
      tip: 'El cromatismo es la base técnica de todos los guitarristas profesionales.',
      duracion: 120,
    },
  ],
};

export default function EjerciciosGuiados({ ejercicio, onFinalizar }) {
  const ejercicios = EJERCICIOS_POR_TIPO[ejercicio] || [];
  const [paso, setPaso] = useState(0);
  const [completados, setCompletados] = useState([]);

  const ejercicioActual = ejercicios[paso];
  const totalPasos = ejercicios.length;
  const progreso = Math.round(((completados.length) / totalPasos) * 100);

  const marcarCompletado = () => {
    if (!completados.includes(paso)) {
      setCompletados(prev => [...prev, paso]);
    }
    if (paso < totalPasos - 1) {
      setPaso(paso + 1);
    } else {
      onFinalizar(completados.length + 1);
    }
  };

  const estaCompletado = completados.includes(paso);

  return (
    <div className="space-y-4">
      {/* Progreso general */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">Ejercicio {paso + 1} de {totalPasos}</p>
        <p className="text-xs text-primary font-semibold">{progreso}% completado</p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* Pasos (indicadores) */}
      <div className="flex gap-1.5 mb-5">
        {ejercicios.map((_, i) => (
          <button
            key={i}
            onClick={() => setPaso(i)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              completados.includes(i) ? 'bg-green-400' : i === paso ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Tarjeta del ejercicio actual */}
      <AnimatePresence mode="wait">
        <motion.div
          key={paso}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
                Ejercicio {paso + 1}
              </p>
              <h3 className="font-bold text-foreground text-lg leading-tight">{ejercicioActual?.titulo}</h3>
            </div>
            {estaCompletado && <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{ejercicioActual?.descripcion}</p>

          {/* Patrón visual */}
          {ejercicioActual?.patron && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Patrón</p>
              <div className="flex flex-wrap gap-2">
                {ejercicioActual.patron.map((p, i) => (
                  <div
                    key={i}
                    className="bg-muted border border-border/60 rounded-xl px-3 py-1.5 text-center min-w-[2.5rem]"
                  >
                    <span className="text-sm font-bold text-foreground">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB si existe */}
          {ejercicioActual?.tab && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Tablatura</p>
              <div className="bg-muted rounded-xl p-3 font-mono text-xs text-foreground space-y-0.5">
                {ejercicioActual.tab.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            </div>
          )}

          {/* BPM y duración */}
          <div className="flex gap-3">
            {ejercicioActual?.bpm && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="text-blue-400 font-bold text-lg">{ejercicioActual.bpm}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
            )}
            {ejercicioActual?.compas && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="text-purple-400 font-bold text-lg">{ejercicioActual.compas}</p>
                <p className="text-xs text-muted-foreground">Compás</p>
              </div>
            )}
            {ejercicioActual?.duracion && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="text-orange-400 font-bold text-lg">{ejercicioActual.duracion}s</p>
                <p className="text-xs text-muted-foreground">Duración</p>
              </div>
            )}
          </div>

          {/* Tip de Wilfredo */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-primary mb-1">💡 Tip de Wilfredo</p>
            <p className="text-xs text-foreground leading-relaxed">{ejercicioActual?.tip}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Botones de navegación */}
      <div className="flex gap-3">
        {paso > 0 && (
          <button
            onClick={() => setPaso(paso - 1)}
            className="flex items-center gap-2 bg-muted text-foreground px-4 py-3 rounded-2xl font-semibold text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
        )}
        <button
          onClick={marcarCompletado}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-bold text-sm"
        >
          {paso < totalPasos - 1 ? (
            <>
              {estaCompletado ? 'Siguiente' : '✓ Listo, siguiente'}
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>🎉 Finalizar sesión</>
          )}
        </button>
      </div>
    </div>
  );
}