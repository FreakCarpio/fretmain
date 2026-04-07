const sugerencias = [
  '¿Cómo afino mi guitarra?',
  '¿Cómo toco la escala de Do?',
  'Ejercicio para principiantes',
  '¿Cómo mejorar mi técnica?',
  'Acorde de La menor',
];

export default function SugerenciasRapidas({ onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {sugerencias.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-3 py-2 rounded-full border border-border hover:border-primary hover:text-primary transition-all"
        >
          {s}
        </button>
      ))}
    </div>
  );
}