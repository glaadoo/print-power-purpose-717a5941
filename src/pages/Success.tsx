export default function Success() {
  return (
    <main className="p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Payment successful 🎉</h1>
      <a href="/products" className="underline mt-4 inline-block text-foreground hover:opacity-70">
        Back to products
      </a>
    </main>
  );
}
