import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-brand-900 tracking-tight">
            AirPro
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {['Products', 'Solutions', 'OEM/ODM', 'Support'].map((item) => (
              <a key={item} href="#" className="text-sm text-gray-600 hover:text-brand-900 transition">
                {item}
              </a>
            ))}
            <Link
              to="/enquiry"
              className="text-sm text-brand-900 font-medium border-b-2 border-brand-900 pb-px"
            >
              Contact
            </Link>
          </nav>

          {/* CTA */}
          <Link
            to="/enquiry"
            className="bg-brand-900 text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-brand-800 transition"
          >
            Get a Quote
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start justify-between gap-6">
          <div>
            <p className="text-lg font-bold text-brand-900">AirPro</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs leading-relaxed">
              Professional-grade networking solutions for industrial automation, smart cities, and enterprise infrastructure.
            </p>
            <p className="text-gray-400 text-xs mt-4 uppercase tracking-wide">
              &copy; 2024 AirPro Industrial Networking Solutions. All rights reserved.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-gray-500 mt-1">
            {['Privacy Policy', 'Terms of Service', 'Compliance', 'Global Locations'].map((link) => (
              <a key={link} href="#" className="hover:text-brand-900 transition">
                {link}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
