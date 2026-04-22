import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Music2, Loader2 } from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────
const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CUERDAS_GUITARRA = [
  { nombre: 'E2', freq: 82.41, cuerda: '6ª' },
  { nombre: 'A2', freq: 110.0, cuerda: '5ª' },
  { nombre: 'D3', freq: 146.83, cuerda: '4ª' },
  { nombre: 'G3', freq: 196.0, cuerda: '3ª' },
  { nombre: 'B3', freq: 246.94, cuerda: '2ª' },
  { nombre: 'E4', freq: 329.63, cuerda: '1ª' },
];

// Rango de frecuencias guitarra: E2=82Hz a E4=330Hz
const MIN_FREQ_GUITARRA = 70;
const MAX_FREQ_GUITARRA = 400;

// Acordes: mapa nota raíz → tipo → semitonos desde la raíz
const CHORD_TEMPLATES = {
  'Mayor':   [0, 4, 7],
  'Menor':   [0, 3, 7],
  'Séptima': [0, 4, 7, 10],
  'Menor7':  [0, 3, 7, 10],
  'Quinta':  [0, 7],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Autocorrelation pitch detection con refinamiento parabólico
 * Algoritmo robusto tipo GuitarTuna
 */
function detectarFrecuencia(buffer, sampleRate) {
  const SIZE = buffer.length;
  
  // Calcular RMS para detectar si hay señal suficiente
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  // Calcular offset mínimo y máximo basado en rango de guitarra
  const minPeriod = Math.floor(sampleRate / MAX_FREQ_GUITARRA);
  const maxPeriod = Math.floor(sampleRate / MIN_FREQ_GUITARRA);

  // Autocorrelation con normalización
  const correlations = new Float32Array(maxPeriod + 1);
  
  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;
    const limit = SIZE - lag;
    
    for (let i = 0; i < limit; i++) {
      const val1 = buffer[i];
      const val2 = buffer[i + lag];
      sum += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
    
    // Normalización para evitar sesgo hacia frecuencias bajas
    const norm = Math.sqrt(norm1 * norm2);
    if (norm > 0) {
      correlations[lag] = sum / norm;
    }
  }

  // Buscar primer pico significativo después del mínimo
  let bestPeriod = -1;
  let bestCorr = 0;
  
  // Buscar en rango de periodos válidos
  for (let i = minPeriod + 1; i < maxPeriod; i++) {
    // Es un pico si es mayor que sus vecinos
    if (correlations[i] > correlations[i - 1] && 
        correlations[i] > correlations[i + 1] &&
        correlations[i] > correlations[bestPeriod] &&
        correlations[i] > 0.5) { // Umbral mínimo de correlación
      bestCorr = correlations[i];
      bestPeriod = i;
    }
  }

  // Refinamiento parabólico para mayor precisión
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const y0 = correlations[bestPeriod - 1];
    const y1 = correlations[bestPeriod];
    const y2 = correlations[bestPeriod + 1];
    const ajuste = (y2 - y0) / (2 * (2 * y1 - y0 - y2));
    bestPeriod = bestPeriod + ajuste;
  }

  if (bestPeriod > 0 && bestCorr > 0.5) {
    return sampleRate / bestPeriod;
  }

  return null;
}

/**
 * Suavizado temporal: promedia detecciones recientes con ponderación
 */
function temporalSmoothing(frequencies, newFreq, maxHistory = 5) {
  if (!newFreq) {
    // Si no hay nueva freq, devolver null si el buffer está vacío
    return frequencies.length > 0 ? frequencies[frequencies.length - 1] : null;
  }

  const updated = [...frequencies, newFreq].slice(-maxHistory);
  
  // Promedio ponderado exponencial (más peso a recientes)
  let pesoTotal = 0;
  let sumaPonderada = 0;
  updated.forEach((freq, i) => {
    const peso = Math.pow(0.7, updated.length - 1 - i);
    pesoTotal += peso;
    sumaPonderada += freq * peso;
  });

  return pesoTotal > 0 ? sumaPonderada / pesoTotal : null;
}

/**
 * Detectar pitch estables y filtrar armónicos
 */
function detectarPicos(analyser, sampleRate, historyRef) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const fftSize = analyser.fftSize;
  const freqPerBin = sampleRate / fftSize;
  
  // Umbral adaptativo: 30% del máximo actual
  const maxVal = Math.max(...dataArray);
  const umbral = Math.max(30, maxVal * 0.3);
  
  const minFreq = 60;
  const maxFreq = 1200;
  const picos = [];

  for (let i = 2; i < bufferLength - 2; i++) {
    const val = dataArray[i];
    const freq = i * freqPerBin;
    
    // Es un pico local
    if (val > umbral &&
        val >= dataArray[i - 1] && val >= dataArray[i - 2] &&
        val >= dataArray[i + 1] && val >= dataArray[i + 2]) {
      
      if (freq >= minFreq && freq <= maxFreq) {
        // Filtrar armónicos: solo detectar fundamentales
        // Un armónico tiene frecuencia = fundamental * n (n=2,3,4...)
        const esArmonico = picos.some(pico => {
          const ratio = freq / pico.freq;
          // Si es múltiplo entero cercano (2, 3, 4...) y la potencia es menor
          return (Math.abs(ratio - Math.round(ratio)) < 0.1) && 
                 ratio > 1.5 && val < pico.val;
        });
        
        if (!esArmonico) {
          picos.push({ freq, val, bin: i });
        }
      }
    }
  }

  // Ordenar por potencia (magnitud)
  picos.sort((a, b) => b.val - a.val);

  // Historial para estabilizar detección de acordes
  if (historyRef) {
    if (!historyRef.current.chordHistory) {
      historyRef.current.chordHistory = [];
    }
    
    const currentNotas = picos.slice(0, 6).map(p => {
      const info = freqToNota(p.freq);
      return info ? info.nota : null;
    }).filter(Boolean);

    if (currentNotas.length > 0) {
      historyRef.current.chordHistory.push(currentNotas);
      if (historyRef.current.chordHistory.length > 8) {
        historyRef.current.chordHistory.shift();
      }
    }
  }

  return picos.slice(0, 6).map(p => freqToNota(p.freq)).filter(Boolean);
}

/**
 * Estabilización de acorde: usar moda de historial
 */
function getEstableAcorde(historial) {
  if (!historial || historial.length < 3) return null;
  
  // Tomar últimas detecciones
  const recientes = historial.slice(-5);
  const conteo = {};
  
  recientes.forEach(notas => {
    const key = [...notas].sort().join('-');
    conteo[key] = (conteo[key] || 0) + 1;
  });

  // Encontrar la combinación más frecuente
  let mejorKey = null;
  let mejorCount = 0;
  
  for (const [key, count] of Object.entries(conteo)) {
    if (count > mejorCount) {
      mejorCount = count;
      mejorKey = key;
    }
  }

  // Solo devolver si hay consenso (más de 50% de las veces)
  if (mejorCount >= Math.ceil(recientes.length / 2)) {
    return mejorKey.split('-');
  }
  
  return null;
}

/**
 * Convertir frecuencia a información de nota
 */
function freqToNota(freq) {
  if (!freq || freq < 20) return null;
  const A4 = 440;
  const semitonos = 12 * Math.log2(freq / A4);
  const semIndex = Math.round(semitonos);
  const nota = NOTAS[((semIndex % 12) + 12 + 69) % 12];
  const semIndexReal = Math.round(semitonos) + 69;
  const octava = Math.floor(semIndexReal / 12) - 1;
  const freqIdeal = A4 * Math.pow(2, (semIndexReal - 69) / 12);
  const centsDiff = 1200 * Math.log2(freq / freqIdeal);
  return { nota, octava, centsDiff, freqIdeal, freq, semIndex };
}

/**
 * Encontrar la cuerda más cercana a la frecuencia detectada
 */
function encontrarCuerda(freq) {
  if (!freq) return null;
  
  let mejor = null;
  let menorDiff = Infinity;

  for (const cuerda of CUERDAS_GUITARRA) {
    const diff = Math.abs(cuerda.freq - freq);
    if (diff < menorDiff) {
      menorDiff = diff;
      mejor = cuerda;
    }
  }

  // Calcular cents de desviación
  if (mejor) {
    const centsOff = 1200 * Math.log2(freq / mejor.freq);
    return {
      ...mejor,
      centsOff,
      inTune: Math.abs(centsOff) < 5, // 5 cents de tolerancia
      almostInTune: Math.abs(centsOff) < 15
    };
  }
  
  return null;
}

function identificarAcorde(notas) {
  if (!notas || notas.length < 2) return null;

  const notaIndices = notas.map(n => NOTAS.indexOf(n)).filter(i => i >= 0);
  if (notaIndices.length < 2) return null;

  for (const raiz of notaIndices) {
    const nombreRaiz = NOTAS[raiz];
    for (const [tipo, intervalos] of Object.entries(CHORD_TEMPLATES)) {
      const notasAcorde = intervalos.map(i => (raiz + i) % 12);
      const todas = notasAcorde.every(n => notaIndices.includes(n));
      if (todas) {
        const sufijo = tipo === 'Mayor' ? '' : 
                      tipo === 'Menor' ? 'm' : 
                      tipo === 'Séptima' ? '7' : 
                      tipo === 'Menor7' ? 'm7' : '5';
        return { nombre: `${nombreRaiz}${sufijo}`, tipo, raiz: nombreRaiz };
      }
    }
  }
  return null;
}

// ─── Componente ─────────────────────────────────────────────────────────────────
export default function Afinador() {
  const [modo, setModo] = useState('afinador'); // 'afinador' | 'acordes'
  const [activo, setActivo] = useState(false);

  // Afinador
  const [frecuencia, setFrecuencia] = useState(null);
  const [notaInfo, setNotaInfo] = useState(null);
  const [cuerdaDetectada, setCuerdaDetectada] = useState(null);
  const [consejo, setConsejo] = useState('');
  const [loadingConsejo, setLoadingConsejo] = useState(false);

  // Acordes
  const [notasDetectadas, setNotasDetectadas] = useState([]);
  const [acordeDetectado, setAcordeDetectado] = useState(null);

  // Refs para audio
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  
  // Refs para estabilización
  const freqHistoryRef = useRef([]);
  const lastUpdateRef = useRef(0);
  const chordHistoryRef = useRef({ chordHistory: [] });
  const lastChordUpdateRef = useRef(0);
  const stableFreqRef = useRef(null);
  const consecutiveFramesRef = useRef(0);

  // Throttle: mínimo 50ms entre actualizaciones de afinador
  const THROTTLE_AFINADOR = 50;
  // Throttle: mínimo 150ms entre actualizaciones de acordes
  const THROTTLE_ACORDES = 150;

  const iniciar = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
        video: false 
      });
      streamRef.current = stream;
      
      // Reutilizar AudioContext existente o crear nuevo
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      
      // Si estaba suspendido, reanudar
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Resetear historial
      freqHistoryRef.current = [];
      chordHistoryRef.current = { chordHistory: [] };
      stableFreqRef.current = null;
      consecutiveFramesRef.current = 0;
      
      setActivo(true);
      loop();
    } catch (err) {
      console.error('Error al iniciar micrófono:', err);
      setActivo(false);
    }
  };

  const detener = () => {
    cancelAnimationFrame(rafRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    // No cerrar AudioContext para poder reutilizarlo
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      // Mantener abierto para reutilización
    }
    
    setActivo(false);
    setFrecuencia(null);
    setNotaInfo(null);
    setCuerdaDetectada(null);
    setNotasDetectadas([]);
    setAcordeDetectado(null);
    
    // Limpiar refs
    freqHistoryRef.current = [];
    chordHistoryRef.current = { chordHistory: [] };
    stableFreqRef.current = null;
    consecutiveFramesRef.current = 0;
  };

  const loop = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    
    if (!analyser || !ctx) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    
    const sampleRate = ctx.sampleRate;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    
    const ahora = performance.now();
    
    // ── Procesamiento de AFINADOR ──
    if (ahora - lastUpdateRef.current >= THROTTLE_AFINADOR) {
      const rawFreq = detectarFrecuencia(buffer, sampleRate);
      
      if (rawFreq) {
        consecutiveFramesRef.current++;
        
        // Solo promediar si tenemos suficientes frames consecutivos
        if (consecutiveFramesRef.current >= 2) {
          const smoothedFreq = temporalSmoothing(
            freqHistoryRef.current,
            rawFreq,
            5
          );
          
          if (smoothedFreq) {
            stableFreqRef.current = smoothedFreq;
            
            setFrecuencia(smoothedFreq);
            const info = freqToNota(smoothedFreq);
            setNotaInfo(info);
            
            if (info) {
              const cuerda = encontrarCuerda(smoothedFreq);
              setCuerdaDetectada(cuerda);
            }
          }
        }
      } else {
        // Sin detección - decrementar contador
        consecutiveFramesRef.current = Math.max(0, consecutiveFramesRef.current - 2);
        
        // Mantener última frecuencia válida por un tiempo
        if (stableFreqRef.current && consecutiveFramesRef.current === 0) {
          // Ya no mostrar nada después de varios frames sin detección
        }
      }
      
      lastUpdateRef.current = ahora;
    }
    
    // ── Procesamiento de ACORDES ──
    if (ahora - lastChordUpdateRef.current >= THROTTLE_ACORDES) {
      const picos = detectarPicos(analyser, sampleRate, chordHistoryRef);
      const notas = picos.map(p => p.nota);
      
      setNotasDetectadas(notas);
      
      if (notas.length >= 2) {
        const historial = chordHistoryRef.current.chordHistory;
        const estableNotas = getEstableAcorde(historial);
        
        if (estableNotas) {
          const acorde = identificarAcorde(estableNotas);
          if (acorde) {
            setAcordeDetectado(acorde);
          }
        }
      } else {
        setAcordeDetectado(null);
      }
      
      lastChordUpdateRef.current = ahora;
    }
    
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Iniciar/parar loop cuando cambia activo
  useEffect(() => {
    if (activo) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
  }, [activo, loop]);

  const pedirConsejo = async () => {
    if (!notaInfo) return;
    setLoadingConsejo(true);
    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres Wilfredo, instructor experto de guitarra acústica. El estudiante está afinando su guitarra.
Nota detectada: ${notaInfo.nota}${notaInfo.octava} (${frecuencia?.toFixed(1)} Hz).
Desviación: ${notaInfo.centsDiff?.toFixed(0)} cents ${notaInfo.centsDiff > 0 ? 'alta' : 'baja'}.
Cuerda más cercana: ${cuerdaDetectada ? `${cuerdaDetectada.cuerda} (${cuerdaDetectada.nombre})` : 'no identificada'}.
Da un consejo corto y práctico (1-2 oraciones) en español sobre cómo afinar correctamente esta cuerda. Incluye un emoji.`,
    });
    setConsejo(resultado);
    setLoadingConsejo(false);
  };

  const cents = notaInfo?.centsDiff ?? 0;
  const afinado = Math.abs(cents) < 5;
  const pocoDesafinado = Math.abs(cents) < 20;
  const indicadorColor = afinado ? 'bg-green-400' : pocoDesafinado ? 'bg-yellow-400' : 'bg-red-400';
  const textoEstado = afinado ? '✅ Afinado' : cents > 0 ? '▲ Muy alto' : '▼ Muy bajo';
  const indicatorPos = Math.max(5, Math.min(95, 50 + (cents / 50) * 40));

  return (
    <div className="px-4 py-5 flex flex-col items-center min-h-[70vh]">
      <div className="w-full mb-5">
        <h2 className="text-2xl font-bold text-foreground mb-1">Afinador</h2>
        <p className="text-muted-foreground text-sm">Afinación inteligente con Wilfredo 🎸</p>
      </div>

      {/* Toggle de modo */}
      <div className="w-full bg-muted rounded-2xl p-1 flex mb-6">
        <button
          onClick={() => setModo('afinador')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            modo === 'afinador' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          🎵 Modo Afinador
        </button>
        <button
          onClick={() => setModo('acordes')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            modo === 'acordes' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          🎸 Modo Acordes
        </button>
      </div>

      {/* ── MODO AFINADOR ── */}
      {modo === 'afinador' && (
        <>
          {/* Cuerdas de referencia */}
          <div className="w-full mb-5">
            <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wider">Cuerdas de referencia</p>
            <div className="grid grid-cols-3 gap-2">
              {CUERDAS_GUITARRA.map(c => (
                <div
                  key={c.nombre}
                  className={`rounded-2xl p-3 text-center border transition-all ${
                    cuerdaDetectada?.nombre === c.nombre
                      ? 'border-primary bg-primary/20'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{c.cuerda}</p>
                  <p className="font-bold text-foreground">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.freq} Hz</p>
                </div>
              ))}
            </div>
          </div>

          {/* Display principal */}
          <div className="w-full bg-card border border-border/60 rounded-3xl p-6 mb-5 text-center">
            {notaInfo ? (
              <>
                <div className={`text-7xl font-black mb-1 ${afinado ? 'text-green-400' : pocoDesafinado ? 'text-yellow-400' : 'text-red-400'}`}>
                  {notaInfo.nota}
                  <span className="text-4xl text-muted-foreground">{notaInfo.octava}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-4">{frecuencia?.toFixed(1)} Hz</p>
                <div className="relative w-full h-4 bg-muted rounded-full mb-2 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-green-400 to-red-500 opacity-30 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-border" />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${indicadorColor} shadow-lg transition-all duration-200`}
                    style={{ left: `${indicatorPos}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <p className={`text-sm font-semibold ${afinado ? 'text-green-400' : pocoDesafinado ? 'text-yellow-400' : 'text-red-400'}`}>
                  {textoEstado} ({cents > 0 ? '+' : ''}{cents?.toFixed(0)} cents)
                </p>
              </>
            ) : (
              <div className="py-6">
                <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {activo ? 'Tocando una cuerda...' : 'Presiona iniciar para comenzar'}
                </p>
              </div>
            )}
          </div>

          {notaInfo && (
            <button
              onClick={pedirConsejo}
              disabled={loadingConsejo}
              className="w-full py-3 rounded-2xl border border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 mb-4"
            >
              {loadingConsejo ? <Loader2 className="w-4 h-4 animate-spin" /> : '🎓'}
              {loadingConsejo ? 'Wilfredo analizando...' : 'Pedir consejo a Wilfredo'}
            </button>
          )}

          {consejo && (
            <div className="w-full bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4">
              <p className="text-sm text-foreground leading-relaxed">{consejo}</p>
            </div>
          )}
        </>
      )}

      {/* ── MODO ACORDES ── */}
      {modo === 'acordes' && (
        <>
          {/* Display acorde */}
          <div className="w-full bg-card border border-border/60 rounded-3xl p-6 mb-5 text-center">
            {acordeDetectado ? (
              <>
                <div className="text-7xl font-black text-primary mb-2">{acordeDetectado.nombre}</div>
                <p className="text-muted-foreground text-sm mb-1">Tipo: {acordeDetectado.tipo}</p>
                <div className="inline-flex items-center gap-2 bg-green-400/20 text-green-400 px-4 py-1.5 rounded-full text-sm font-semibold">
                  ✅ Acorde detectado
                </div>
              </>
            ) : notasDetectadas.length > 0 ? (
              <>
                <div className="text-4xl font-black text-muted-foreground mb-2">
                  {notasDetectadas.join(' - ')}
                </div>
                <p className="text-muted-foreground text-sm">Notas detectadas, analizando acorde...</p>
                <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-semibold mt-2">
                  ⚡ Procesando...
                </div>
              </>
            ) : (
              <div className="py-6">
                <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {activo ? 'Toca un acorde en tu guitarra...' : 'Presiona iniciar para comenzar'}
                </p>
              </div>
            )}
          </div>

          {/* Acordes básicos de referencia */}
          <div className="w-full mb-5">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider text-center">Acordes detectables</p>
            <div className="grid grid-cols-4 gap-2">
              {['C', 'G', 'D', 'Am', 'Em', 'F', 'A', 'E'].map(a => (
                <div key={a} className="bg-card border border-border/60 rounded-xl p-2 text-center">
                  <p className="font-bold text-foreground text-sm">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Botón principal */}
      <button
        onClick={activo ? detener : iniciar}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
          activo
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {activo ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        {activo ? 'Detener' : 'Iniciar'}
      </button>
    </div>
  );
}