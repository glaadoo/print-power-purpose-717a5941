import kenzieMascot from "@/assets/kenzie-mascot.png";

export default function MascotHeader() {
  return (
    <header className="bg-mascot-bg py-8 px-4 sm:py-12 md:py-16">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <img
          src={kenzieMascot}
          alt="Kenzie - Print Power Purpose Mascot"
          className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 object-contain"
        />
      </div>
    </header>
  );
}
