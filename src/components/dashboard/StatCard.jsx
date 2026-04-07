export default function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-border">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}