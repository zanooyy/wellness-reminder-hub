
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useEffect, useState } from "react";
import { Bell, Clock, FileText, ShieldCheck } from "lucide-react";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const featureItems = [
    {
      icon: <ShieldCheck className="h-8 w-8 mb-4 text-primary" />,
      title: "Secure User Profiles",
      description: "Store your personal health information securely and access it anywhere, anytime.",
    },
    {
      icon: <Bell className="h-8 w-8 mb-4 text-primary" />,
      title: "Medicine Reminders",
      description: "Set custom alarms for your medications and never miss a dose again.",
    },
    {
      icon: <FileText className="h-8 w-8 mb-4 text-primary" />,
      title: "Health Notes",
      description: "Keep track of symptoms, improvements, and other health observations in one place.",
    },
    {
      icon: <Clock className="h-8 w-8 mb-4 text-primary" />,
      title: "Schedule Management",
      description: "Organize your health routines with intuitive scheduling tools.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        <div className="container px-4 mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight animate-slide-down">
              Your Personal Wellness Reminder Hub
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-down" style={{ animationDelay: "100ms" }}>
              Never miss your medications again. Track your health journey with our intuitive wellness management platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-down" style={{ animationDelay: "200ms" }}>
              <Link to="/register">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div 
          className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/5 to-background -z-10"
          style={{ 
            transform: `translateY(${scrollY * 0.1}px)`,
            opacity: 1 - scrollY * 0.001,
          }}
        />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/50">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simplify Your Health Management</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform offers everything you need to stay on top of your health routines.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureItems.map((item, index) => (
              <div 
                key={index} 
                className="bg-background rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex justify-center">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="bg-primary/10 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <h2 className="text-3xl font-bold mb-4">Ready to take control of your health?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of users who have simplified their health management routine with Wellness Hub.
              </p>
              <Link to="/register">
                <Button size="lg">Start Your Journey</Button>
              </Link>
            </div>
            
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 -z-0">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M39.9,-51.2C54.7,-39.1,71.9,-29.3,77.4,-15.2C82.9,-1,76.7,17.6,66.3,31.4C55.9,45.2,41.3,54.3,26.2,58.7C11.1,63.1,-4.6,62.7,-21.3,59.9C-38,57,-55.8,51.5,-67.9,39.3C-80,27.1,-86.5,8.1,-81.3,-7.7C-76.1,-23.5,-59.1,-36.1,-43.4,-48.5C-27.7,-60.9,-13.9,-73.1,-0.1,-72.9C13.6,-72.8,25.2,-63.3,39.9,-51.2Z" transform="translate(100 100)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-muted-foreground text-sm">
                © {new Date().getFullYear()} Wellness Hub. All rights reserved.
              </p>
            </div>
            
            <div className="flex space-x-6">
              <Link to="/login" className="text-muted-foreground hover:text-primary text-sm">
                Login
              </Link>
              <Link to="/register" className="text-muted-foreground hover:text-primary text-sm">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
