
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bell, Clock, FileText, User } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();

  const dashboardCards = [
    {
      title: "User Profile",
      description: "Manage your personal health information",
      icon: <User className="h-5 w-5" />,
      link: "/profile",
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      title: "Medicine Reminders",
      description: "Set up and manage your medication schedule",
      icon: <Bell className="h-5 w-5" />,
      link: "/reminders",
      color: "bg-violet-500/10 text-violet-500",
    },
    {
      title: "Health Notes",
      description: "Keep track of your health observations",
      icon: <FileText className="h-5 w-5" />,
      link: "/notes",
      color: "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your wellness hub, {user?.email?.split('@')[0] || 'User'}!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index} className="overflow-hidden card-hover animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${card.color}`}>
                  {card.icon}
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={card.link}>
                  <Button>
                    <Clock className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to get the most out of your Wellness Hub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Complete your profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your personal details to help us personalize your experience
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Set up your medicine reminders</h3>
                  <p className="text-sm text-muted-foreground">
                    Create reminders for your medications to stay on schedule
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Start tracking with notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Record how you feel, symptoms, and other health observations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
