export default function Cancel() {
  return (
    <main className="p-6 max-w-2xl mx-auto text-center">
      <div className="bg-card border border-border rounded-lg p-8 mt-8">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Payment Cancelled</h1>
        <p className="text-lg text-muted-foreground mb-8">
          No worries! Your order wasn't processed. Feel free to try again when you're ready.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a 
            href="/products" 
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
          >
            Back to Products
          </a>
          <a 
            href="/causes" 
            className="inline-block px-6 py-3 bg-secondary text-secondary-foreground rounded-md font-medium hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
          >
            Choose a Cause
          </a>
        </div>
      </div>
    </main>
  );
}
