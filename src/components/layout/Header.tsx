
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Bell, FileText, Home, Menu, User, X } from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Track scroll position to change header style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Navigation items
  const navItems = user
    ? [
        { name: "Dashboard", path: "/dashboard", icon: <Home className="w-4 h-4 mr-2" /> },
        { name: "Profile", path: "/profile", icon: <User className="w-4 h-4 mr-2" /> },
        { name: "Reminders", path: "/reminders", icon: <Bell className="w-4 h-4 mr-2" /> },
        { name: "Notes", path: "/notes", icon: <FileText className="w-4 h-4 mr-2" /> },
      ]
    : [
        { name: "Login", path: "/login" },
        { name: "Register", path: "/register" },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <span className="text-xl font-semibold tracking-tight mr-8">Wellness Hub</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center text-sm font-medium transition-colors duration-200 hover:text-primary ${
                isActive(item.path)
                  ? "text-primary"
                  : "text-foreground/70"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          
          {user && (
            <Button
              variant="ghost"
              className="text-sm font-medium hover:text-destructive"
              onClick={signOut}
            >
              Sign Out
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-background z-40 pt-16 md:hidden animate-fade-in">
          <nav className="flex flex-col p-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center p-2 text-lg font-medium rounded-md transition-colors duration-200 ${
                  isActive(item.path)
                    ? "bg-secondary text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
            
            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start text-lg font-medium text-destructive"
                onClick={signOut}
              >
                Sign Out
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
