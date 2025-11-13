export default function KenzieHelpButton() {
  const handleClick = () => {
    // Open the Kenzie chat widget
    if (window.kenzieOpenChat) {
      window.kenzieOpenChat();
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(new CustomEvent("kenzie-open-chat"));
    }
  };

  return (
    <div className="flex justify-center mt-12 mb-8">
      <button
        onClick={handleClick}
        className="
          px-8 py-4 rounded-full
          bg-white/10 backdrop-blur-md
          border border-white/20
          text-white font-semibold
          hover:bg-white/20 hover:scale-105
          active:scale-95
          transition-all duration-300
          shadow-lg hover:shadow-xl
          flex items-center gap-3
        "
      >
        <span className="text-2xl animate-pulse">🐾</span>
        <span>Need Help? Ask Kenzie</span>
      </button>
    </div>
  );
}
