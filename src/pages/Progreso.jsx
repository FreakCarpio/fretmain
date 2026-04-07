import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Progreso() {
  const { data: practicas = [], isLoading } = useQuery({
    queryKey: ['practicas'],
    queryFn: () => base44.entities.Practica.list('-created_date', 30),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const firstName = user?.full_name?.split(' ')[0] || 'Guitarrista';

  const promedioPrecision = practicas.length
    ? Math.round(practicas.reduce((acc, p) => acc + (p.precision || 0), 0) / practicas.length)
    : 0;
  const promedioRitmo = practicas.length
    ? Math.round(practicas.reduce((acc, p) => acc + (p.ritmo || 0), 0) / practicas.length)
    : 0;
  const promedioEnergia = practicas.length
    ? Math.round(practicas.reduce((acc, p) => acc + (p.energia || 0), 0) / practicas.length)
    : 0;
  const totalMinutos = practicas.reduce((acc, p) => acc + (p.duracion_minutos || 0), 0);

  const progresoGeneral = Math.round((promedioPrecision * 0.4 + promedioRitmo * 0.35 + promedioEnergia * 0.25));

  // Datos para gráficos de línea (últimas 7 prácticas)
  const lineData = [...practicas].reverse().slice(-7).map((p, i) => ({
    name: i + 1,
    tecnica: p.puntuacion ? Math.round(p.puntuacion * 10) : 0,
    precision: p.precision || 0,
    nivel: p.energia || 0,
  }));

  const ultimaPractica = practicas[0];

  const radialData = [
    { name: 'Progreso', value: progresoGeneral, fill: '#22d3ee' },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Tu progreso</h2>
        <p className="text-primary text-xl font-bold">{firstName}</p>
        <p className="text-muted-foreground text-sm">Nivel IA: Intermedio</p>
      </div>

      {/* Gráfico radial de rendimiento */}
      <div className="bg-card rounded-2xl p-5 border border-border/60">
        <p className="text-foreground font-bold text-center mb-4">Rendimiento general</p>
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="55%" outerRadius="90%"
              data={[
                { value: promedioEnergia, fill: '#22d3ee' },
                { value: promedioPrecision, fill: '#4ade80' },
                { value: promedioRitmo, fill: '#f472b6' },
              ]}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'hsl(var(--muted))' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">Progreso calculado</p>
            <p className="text-xs text-muted-foreground">por Wilfredo</p>
            <p className="text-4xl font-black text-primary mt-1">{progresoGeneral}%</p>
          </div>
        </div>
      </div>

      {/* Gráficos de línea */}
      <div className="bg-card rounded-2xl p-4 border border-border/60 space-y-5">
        {/* Técnica */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
              <p className="text-sm text-foreground font-medium">Técnica</p>
            </div>
            <p className="text-pink-400 font-bold text-sm">
              {practicas.length ? Math.round(practicas.reduce((a, p) => a + (p.puntuacion || 0), 0) / practicas.length * 10) : 0}%
            </p>
          </div>
          <ResponsiveContainer width="100%" height={50}>
            <LineChart data={lineData}>
              <Line type="monotone" dataKey="tecnica" stroke="#f472b6" strokeWidth={2} dot={{ fill: '#f472b6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Precisión */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <p className="text-sm text-foreground font-medium">Precisión en las notas</p>
            </div>
            <p className="text-green-400 font-bold text-sm">{promedioPrecision}%</p>
          </div>
          <ResponsiveContainer width="100%" height={50}>
            <LineChart data={lineData}>
              <Line type="monotone" dataKey="precision" stroke="#4ade80" strokeWidth={2} dot={{ fill: '#4ade80', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Nivel */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <p className="text-sm text-foreground font-medium">Nivel de jugador</p>
            </div>
            <p className="text-cyan-400 font-bold text-sm">{promedioEnergia}%</p>
          </div>
          <ResponsiveContainer width="100%" height={50}>
            <LineChart data={lineData}>
              <Line type="monotone" dataKey="nivel" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats inferiores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border/60">
          <p className="text-muted-foreground text-xs leading-tight mb-2">Canciones completadas con éxito</p>
          <p className="text-4xl font-black text-foreground">{practicas.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/60">
          <p className="text-muted-foreground text-xs mb-2">Minutos de práctica</p>
          <p className="text-4xl font-black text-foreground">{totalMinutos}</p>
        </div>
      </div>

      {/* Resumen de Wilfredo */}
      {ultimaPractica?.feedback_wilfredo && (
        <div className="bg-card rounded-2xl p-4 border border-border/60">
          <p className="text-primary font-bold text-sm mb-2">Resumen de Wilfredo</p>
          <p className="text-foreground text-sm leading-relaxed">{ultimaPractica.feedback_wilfredo}</p>
        </div>
      )}

      {!practicas.length && !isLoading && (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">Aún no hay prácticas registradas.</p>
          <p className="text-muted-foreground text-xs mt-1">¡Empieza a practicar para ver tu progreso!</p>
        </div>
      )}
    </div>
  );
}