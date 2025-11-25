import { ReactNode, useEffect } from "react";
import VistaprintNav from "./VistaprintNav";

export default function Layout({
  children,
  centered = true,
  showHeader = true,
  title,
}: {
  children: ReactNode;
  centered?: boolean;
  showHeader?: boolean;
  title?: string;
}) {
  // Optional: update document title if provided
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  return (
    <div className="min-h-screen bg-background">
      {showHeader && <VistaprintNav />}

      <main
        className={`${centered ? "flex items-center justify-center min-h-[calc(100vh-64px)]" : ""} px-4 py-8`}
      >
        <div className={`w-full ${centered ? "max-w-4xl" : "max-w-7xl mx-auto"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
