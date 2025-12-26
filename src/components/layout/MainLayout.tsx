import { useState, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import BroadcastNotification from "@/components/BroadcastNotification";
import PullToRefreshIndicator from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Receipt, 
  BarChart3, 
  Settings, 
  Phone, 
  LogOut,
  Menu,
  X,
  Loader2,
  CreditCard
} from "lucide-react";
import appLogo from "@/assets/app-logo.png";
import { cn } from "@/lib/utils";

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  const { isRefreshing, pullDistance } = usePullToRefresh({ onRefresh: handleRefresh });

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Students", path: "/students" },
    { icon: DollarSign, label: "Fee Structure", path: "/fee-structure" },
    { icon: Receipt, label: "Payments", path: "/payments" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: CreditCard, label: "Billing", path: "/billing" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: Phone, label: "Contact Us", path: "/contact" },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Mobile header with menu and theme toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-sidebar rounded-md p-1">
          <BroadcastNotification />
          <ThemeToggle />
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-sidebar rounded-md text-sidebar-foreground"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - moved to right side on mobile */}
      <aside className={cn(
        "fixed lg:static inset-y-0 right-0 lg:left-0 lg:right-auto z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={appLogo} alt="School Fee System" className="h-10 w-10" />
              <span className="font-bold text-lg">School Fee</span>
            </Link>
            <div className="hidden lg:flex items-center gap-2">
              <BroadcastNotification />
              <ThemeToggle />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              <span>{loggingOut ? "Logging out..." : "Logout"}</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content - scrollable */}
      <main className="flex-1 lg:ml-0 p-4 sm:p-6 lg:p-8 mt-14 lg:mt-0 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;