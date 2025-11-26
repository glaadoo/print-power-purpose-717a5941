import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full px-6 pb-8">
          <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <FooterCol
              title="About"
              links={[
                ["Our mission", "/about"],
                ["Team", "/team"],
                ["Press", "/press"],
              ]}
            />
            <FooterCol
              title="Who We Serve"
              links={[
                ["Nonprofits & clubs", "/who-we-serve/nonprofits"],
                ["Schools & teams", "/who-we-serve/schools"],
              ]}
            />
            <FooterCol
              title="Print Catalog"
              links={[
                ["All products", "/products"],
                ["Apparel", "/products/apparel"],
                ["Promo items", "/products/promo"],
              ]}
            />
            <FooterCol
              title="Insights"
              links={[
                ["Blog", "/blog"],
                ["Fundraising guides", "/guides/fundraising"],
              ]}
            />
            <FooterCol
              title="Support"
              links={[
                ["Help Center", "/help"],
                ["Privacy Policy", "/policies/privacy"],
                ["Terms of Use", "/policies/terms"],
              ]}
            />
          </div>

          {/* Social Media Links */}
          <div className="mt-8 flex justify-center gap-6">
            <SocialLink
              href="https://www.tiktok.com/@printpowerpurpose"
              label="TikTok"
              icon="tiktok"
            />
            <SocialLink
              href="https://www.instagram.com/printpowerpurpose"
              label="Instagram"
              icon="instagram"
            />
            <SocialLink
              href="https://www.linkedin.com/company/printpowerpurpose"
              label="LinkedIn"
              icon="linkedin"
            />
            <SocialLink
              href="https://www.youtube.com/@printpowerpurpose"
              label="YouTube"
              icon="youtube"
            />
          </div>

          <p className="mt-6 text-center text-xs font-normal">
            © {new Date().getFullYear()} Print Power Purpose. Some figures shown
            are examples; replace with live data when available.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h4 className="font-semibold mb-2 pb-1 border-b-2 border-blue-600">
        {title}
      </h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([text, href]) => (
          <li key={href}>
            <Link
              to={href}
              className="hover:text-blue-300 transition-colors"
            >
              {text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const icons = {
    tiktok:
      "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z",
    instagram:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    linkedin:
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    youtube:
      "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 transition-all hover:scale-110"
      aria-label={label}
    >
      <svg
        className="w-5 h-5 fill-white"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={icons[icon as keyof typeof icons]} />
      </svg>
    </a>
  );
}
