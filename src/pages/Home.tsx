export default function Home() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground">Print with Purpose</h1>
      <p className="mt-3 text-muted-foreground">Every order powers a cause you choose.</p>

      <div className="mt-8 rounded-xl bg-white/80 backdrop-blur border border-border p-6 shadow-sm">
        <div className="text-2xl sm:text-4xl font-bold">🐾 Kenzie</div>
        <p className="text-muted-foreground mt-2">"What are we printing for today?"</p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <a 
            href="/kenzie" 
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
          >
            Start with Kenzie
          </a>
          <a 
            href="/products" 
            className="px-4 py-2 rounded border border-border bg-card hover:bg-secondary focus:ring-2 focus:ring-ring transition-colors"
          >
            Browse Products
          </a>
        </div>
      </div>
    </main>
  );
}
