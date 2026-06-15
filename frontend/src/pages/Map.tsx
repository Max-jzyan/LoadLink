export default function MapPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Map</h1>
      <div className="min-h-[60vh] flex-1 rounded-xl bg-muted/50 p-6 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">
          Interactive map with load and driver markers will render here.
        </p>
      </div>
    </div>
  )
}
