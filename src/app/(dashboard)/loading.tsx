export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto relative h-[calc(100vh-60px)]">
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="h-7 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          <div className="h-8 w-24 rounded-lg bg-card animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-card animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-card animate-pulse" />
        </div>
      </div>
      <div className="w-full flex-1 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-border/60 rounded-xl overflow-hidden">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}