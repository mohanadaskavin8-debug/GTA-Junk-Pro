import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Cake, Menu, X, ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useGetPublicSettings } from "@workspace/api-client-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: settings } = useGetPublicSettings();

  const phone = settings?.businessPhone ?? "437-775-9626";
  const email = settings?.businessEmail ?? "payments@pieceofcakejunk.com";
  const serviceArea = settings?.serviceArea ?? "Greater Toronto Area";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground overflow-x-hidden selection:bg-secondary selection:text-secondary-foreground">
      {/* Top Bar - Very thin info bar */}
      <div className="hidden md:flex bg-primary text-primary-foreground text-xs py-1.5 px-6 justify-between items-center z-50 relative">
        <p>Serving the {serviceArea} with 5.0 Star Rated Service</p>
        <div className="flex gap-4">
          <a href={`mailto:${email}`} className="hover:text-secondary transition-colors">
            {email}
          </a>
        </div>
      </div>

      {/* Navbar */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-md border-b shadow-sm py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors duration-300 shadow-md">
                <Cake className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl leading-none tracking-tight">PIECE OF CAKE</span>
                <span className="font-display font-bold text-[10px] leading-none text-primary tracking-widest uppercase">Junk Removal</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.path} href={link.path}>
                <div
                  className={`text-sm font-semibold transition-colors cursor-pointer hover:text-primary ${
                    location === link.path ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </div>
              </Link>
            ))}
            
            <div className="flex items-center gap-4 ml-4">
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm font-bold group">
                <div className="bg-secondary/20 p-2 rounded-full text-secondary-foreground group-hover:bg-secondary transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="hidden lg:inline">{phone}</span>
              </a>
              <Link href="/book">
                <Button className="rounded-full shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all group font-bold">
                  Book Online
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-[72px] z-30 bg-background/95 backdrop-blur-xl md:hidden border-b flex flex-col p-6"
          >
            <nav className="flex flex-col gap-6 text-xl font-display font-bold">
              {navLinks.map((link) => (
                <Link key={link.path} href={link.path}>
                  <div className={`cursor-pointer ${location === link.path ? "text-primary" : "text-foreground"}`}>
                    {link.name}
                  </div>
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-4">
              <a href={`tel:${phone}`} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/10 text-secondary-foreground font-bold text-lg justify-center border border-secondary/20">
                <Phone className="w-5 h-5" />
                {phone}
              </a>
              <Link href="/book">
                <Button size="lg" className="w-full text-lg rounded-xl h-14">
                  Book Online Now
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground pt-16 pb-8 border-t border-primary-foreground/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8 mb-12">
            <div className="col-span-1 md:col-span-2 pr-0 lg:pr-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-secondary text-secondary-foreground p-2 rounded-xl">
                  <Cake className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-white">
                  <span className="font-display font-black text-2xl leading-none tracking-tight">PIECE OF CAKE</span>
                  <span className="font-display font-bold text-[11px] leading-none text-secondary tracking-widest uppercase">Junk Removal</span>
                </div>
              </div>
              <p className="text-primary-foreground/80 mb-8 max-w-sm">
                Junk removal made easy. Fast, friendly, and stress-free service across the Greater Toronto Area. Eco-friendly disposal you can trust.
              </p>
              <div className="flex items-center gap-4">
                <a href={`tel:${phone}`} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-secondary hover:text-secondary-foreground transition-all">
                  <Phone className="w-5 h-5" />
                </a>
                <a href={`mailto:${email}`} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-secondary hover:text-secondary-foreground transition-all">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-display font-bold text-lg mb-6 text-white">Quick Links</h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link href={link.path}>
                      <div className="text-primary-foreground/80 hover:text-secondary transition-colors cursor-pointer inline-flex items-center">
                        <ArrowRight className="w-3 h-3 mr-2 opacity-0 -ml-5 transition-all group-hover:opacity-100 group-hover:ml-0" />
                        {link.name}
                      </div>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/admin/login">
                    <div className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors cursor-pointer text-sm mt-4">
                      Admin Portal
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-display font-bold text-lg mb-6 text-white">Contact</h4>
              <ul className="space-y-4 text-primary-foreground/80">
                <li className="flex gap-3">
                  <Phone className="w-5 h-5 shrink-0 text-secondary" />
                  <span>{phone}</span>
                </li>
                <li className="flex gap-3">
                  <Mail className="w-5 h-5 shrink-0 text-secondary" />
                  <span>{email}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 shrink-0 rounded-full border border-secondary flex items-center justify-center text-[10px] font-bold text-secondary">
                    GTA
                  </div>
                  <span>Serving Toronto &<br/>Surrounding Areas</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 text-sm text-primary-foreground/60">
            <p>&copy; {new Date().getFullYear()} Piece of Cake Junk. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span className="flex items-center gap-1 font-bold text-secondary">
                <span className="text-yellow-400">★★★★★</span> 5.0 Google Rating
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
