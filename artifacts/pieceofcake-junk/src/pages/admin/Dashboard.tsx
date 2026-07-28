import { Link } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Calendar, Users, Package, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Bookings", value: stats.totalBookings, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Estimates Today", value: stats.bookingsToday, icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "New This Week", value: stats.bookingsThisWeek, icon: BarChart, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Pending Estimates", value: stats.pendingBookings, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Completed Jobs", value: stats.completedBookings, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Email Subscribers", value: stats.totalSubscribers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
  ];

  const totalForBars = Math.max(stats.totalBookings, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">{card.title}</h3>
                  <div className="text-3xl font-bold font-display">{card.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Estimate Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-bold">{stats.pendingBookings}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(stats.pendingBookings / totalForBars) * 100}%` }} />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="font-bold">{stats.confirmedBookings}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.confirmedBookings / totalForBars) * 100}%` }} />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-bold">{stats.completedBookings}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats.completedBookings / totalForBars) * 100}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <h3 className="text-xl font-bold mb-2">Free estimates, booked online</h3>
            <p className="opacity-80 mb-6">
              Every booking is a no-obligation in-person estimate. Customers get an instant email
              confirmation — confirm each visit from the Bookings tab.
            </p>
            <Link href="/admin/bookings">
              <Button variant="secondary" className="rounded-xl font-bold w-fit">
                Review Pending Estimates
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
