import { useState } from 'react';
import { Search } from 'lucide-react';

const CANCIONES = [
  { titulo: 'Do I Wanna Know?', artista: 'Arctic Monkeys', nivel: 'Intermedio', acordes: ['Am', 'C', 'G', 'Em'] },
  { titulo: 'Come As You Are', artista: 'Nirvana', nivel: 'Fácil', acordes: ['Em', 'D', 'C'] },
  { titulo: '505', artista: 'Arctic Monkeys', nivel: 'Intermedio', acordes: ['Dm', 'Am', 'C', 'G'] },
  { titulo: 'Wonderwall', artista: 'Oasis', nivel: 'Fácil', acordes: ['Em7', 'G', 'Dsus4', 'A7sus4'] },
  { titulo: 'Hotel California', artista: 'Eagles', nivel: 'Avanzado', acordes: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em'] },
  { titulo: 'Stairway to Heaven', artista: 'Led Zeppelin', nivel: 'Avanzado', acordes: ['Am', 'G', 'F', 'C'] },
  { titulo: 'Knockin on Heavens Door', artista: 'Bob Dylan', nivel: 'Fácil', acordes: ['G', 'D', 'Am'] },
  { titulo: 'Nothing Else Matters', artista: 'Metallica', nivel: 'Avanzado', acordes: ['Em', 'Am', 'C', 'D', 'G'] },
];

const nivelColor = {
  'Fácil': 'text-green-400',
  'Intermedio': 'text-primary',
  'Avanzado': 'text-red-400',
};

const nivelBg = {
  'Fácil': 'bg-green-400/10',
  'Intermedio': 'bg-primary/10',
  'Avanzado': 'bg-red-400/10',
};

export default function Buscar() {
  const [query, setQuery] = useState('');

  const filtradas = CANCIONES.filter(c =>
    c.titulo.toLowerCase().includes(query.toLowerCase()) ||
    c.artista.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Buscar</h2>
        <p className="text-muted-foreground text-sm">Encuentra canciones para practicar</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          placeholder="Buscar canciones o artistas..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Resultados */}
      <div className="space-y-2">
        {filtradas.map((c, i) => (
          <div key={i} className="bg-card rounded-2xl p-4 border border-border/60">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground">{c.titulo}</p>
                <p className="text-xs text-muted-foreground">{c.artista}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${nivelBg[c.nivel]} ${nivelColor[c.nivel]}`}>
                {c.nivel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {c.acordes.map((a, j) => (
                <span key={j} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No se encontraron canciones</p>
        )}
      </div>
    </div>
  );
}