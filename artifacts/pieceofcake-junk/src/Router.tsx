import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Route, Switch, Router as WouterRouter } from "wouter";

// Public Pages
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Book from "@/pages/Book";
import Contact from "@/pages/Contact";

// Admin Pages
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminBookings from "@/pages/admin/Bookings";
import AdminServices from "@/pages/admin/Services";
import AdminEmail from "@/pages/admin/Email";
import AdminSettings from "@/pages/admin/Settings";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin">
        {() => {
          // simple redirect to dashboard
          window.location.replace('/admin/dashboard');
          return null;
        }}
      </Route>
      <Route path="/admin/login">
        {() => <AdminLogin />}
      </Route>
      <Route path="/admin/dashboard">
        {() => <AdminLayout><AdminDashboard /></AdminLayout>}
      </Route>
      <Route path="/admin/bookings">
        {() => <AdminLayout><AdminBookings /></AdminLayout>}
      </Route>
      <Route path="/admin/services">
        {() => <AdminLayout><AdminServices /></AdminLayout>}
      </Route>
      <Route path="/admin/email">
        {() => <AdminLayout><AdminEmail /></AdminLayout>}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminLayout><AdminSettings /></AdminLayout>}
      </Route>

      {/* Public Routes */}
      <Route path="/">
        {() => <PublicLayout><Home /></PublicLayout>}
      </Route>
      <Route path="/services">
        {() => <PublicLayout><Services /></PublicLayout>}
      </Route>
      <Route path="/book">
        {() => <PublicLayout><Book /></PublicLayout>}
      </Route>
      <Route path="/contact">
        {() => <PublicLayout><Contact /></PublicLayout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default Router;
