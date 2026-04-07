import { useState, useEffect, useRef } from 'react';
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

// Acordes: mapa nota raíz → tipo → semitonos desde la raíz
const CHORD_TEMPLATES = {
  'Mayor':   [0, 4, 7],
  'Menor':   [0, 3, 7],
  'Séptima': [0, 4, 7, 10],
  'Menor7':  [0, 3, 7, 10],
  'Quinta':  [0, 7],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function freqToNota(freq) {
  if (!freq || freq < 20) return null;
  const A4 = 440;
  const semitonos = 12 * Math.log2(freq / A4);
  const semIndex = Math.round(semitonos) + 69;
  const nota = NOTAS[((semIndex % 12) + 12) % 12];
  const octava = Math.floor(semIndex / 12) - 1;
  const freqIdeal = A4 * Math.pow(2, (semIndex - 69) / 12);
  const centsDiff = 1200 * Math.log2(freq / freqIdeal);
  return { nota, octava, centsDiff, freqIdeal, semIndex };
}

function detectarFrecuencia(buffer, sampleRate) {
  const SIZE = buffer.length;
  const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.01) return null;
  let bestOffset = -1, bestCorr = 0;
  for (let offset = 20; offset < SIZE / 2; offset++) {
    let corr = 0;
    for (let i = 0; i < SIZE / 2; i++) corr += Math.abs(buffer[i] - buffer[i + offset]);
    corr = 1 - corr / (SIZE / 2);
    if (corr > bestCorr) { bestCorr = corr; bestOffset = offset; }
  }
  if (bestCorr > 0.9 && bestOffset > 0) return sampleRate / bestOffset;
  return null;
}

// Detectar múltiples picos en el espectro FFT para identificar acordes
function detectarPicos(analyser, sampleRate) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const notas = new Set();
  const umbral = 100;
  const minFreq = 60;
  const maxFreq = 1200;

  for (let i = 1; i < bufferLength - 1; i++) {
    if (dataArray[i] > umbral &&
        dataArray[i] > dataArray[i - 1] &&
        dataArray[i] > dataArray[i + 1]) {
      const freq = (i * sampleRate) / (analyser.fftSize * 2);
      if (freq >= minFreq && freq <= maxFreq) {
        const info = freqToNota(freq);
        if (info) notas.add(info.nota);
      }
    }
  }
  return [...notas];
}

function identificarAcorde(notas) {
  if (notas.length < 2) return null;

  const notaIndices = notas.map(n => NOTAS.indexOf(n)).filter(i => i >= 0);

  for (const raiz of notaIndices) {
    const nombreRaiz = NOTAS[raiz];
    for (const [tipo, intervalos] of Object.entries(CHORD_TEMPLATES)) {
      const notasAcorde = intervalos.map(i => (raiz + i) % 12);
      const todas = notasAcorde.every(n => notaIndices.includes(n));
      if (todas) {
        const sufijo = tipo === 'Mayor' ? '' : tipo === 'Menor' ? 'm' : tipo === 'Séptima' ? '7' : tipo === 'Menor7' ? 'm7' : '5';
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
  const [acorDeDetectado, setAcorDeDetectado] = useState(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const iniciar = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyserRef.current = analyser;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    setActivo(true);
    loop(analyser, ctx.sampleRate);
  };

  const detener = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    setActivo(false);
    setFrecuencia(null);
    setNotaInfo(null);
    setCuerdaDetectada(null);
    setNotasDetectadas([]);
    setAcorDeDetectado(null);
  };

  const loop = (analyser, sampleRate) => {
    const buffer = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);

      if (modo === 'afinador' || true) {
        const freq = detectarFrecuencia(buffer, sampleRate);
        if (freq) {
          setFrecuencia(freq);
          const info = freqToNota(freq);
          setNotaInfo(info);
          if (info) {
            const closest = CUERDAS_GUITARRA.reduce((prev, curr) =>
              Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev
            );
            if (Math.abs(closest.freq - freq) < 20) setCuerdaDetectada(closest);
            else setCuerdaDetectada(null);
          }
        }
      }

      // Detección de acordes
      const picos = detectarPicos(analyser, sampleRate);
      setNotasDetectadas(picos);
      if (picos.length >= 2) {
        const acorde = identificarAcorde(picos);
        setAcorDeDetectado(acorde);
      } else {
        setAcorDeDetectado(null);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => detener(), []);

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
            {acorDeDetectado ? (
              <>
                <div className="text-7xl font-black text-primary mb-2">{acorDeDetectado.nombre}</div>
                <p className="text-muted-foreground text-sm mb-1">Tipo: {acorDeDetectado.tipo}</p>
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