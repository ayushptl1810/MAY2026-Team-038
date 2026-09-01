import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import SiteLayout from "./components/shared/SiteLayout";
import AdminLayout from "./components/shared/AdminLayout";
import Home from "./pages/Home";
import HeritageShop from "./pages/HeritageShop";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import AdminReviewPage from "./pages/AdminReview";
import AdminDatabase from "./components/admin/AdminDatabase.jsx";
import AdminChat from "./components/admin/AdminChat.jsx";
import GlobeHome from "./pages/GlobeHome.jsx";
import TrailExperience from "./pages/TrailExperience.jsx";
import VolunteerPage from "./pages/VolunteerPage";
import EventPage from "./pages/EventPage";
import EventRegistration from "./pages/EventRegistration";
import AdminEvents from "./pages/AdminEvents";
import AdminEventCreate from "./pages/AdminEventCreate";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboardNew from "./pages/AdminDashboard";
import AdminShopPage from "./pages/AdminShop";

import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Client-Side Route Protection Component.
// Checks "is logged in" — fine-grained per-action authorization (e.g.
// shop_admin vs system_admin) is enforced server-side and surfaced as an
// inline 403 message.
function ProtectedRoute() {
  const hasToken = localStorage.getItem("intach_token");

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Admin-only route guard. GET /auth/me returns `role`, and every non
// registered_member role (volunteer, event_coordinator, heritage_expert,
// shop_admin, system_admin) is staff — same convention HomeOrAdminRedirect
// already uses. A logged-out visitor goes to /login; a logged-in plain
// member gets bounced to "/" instead of seeing the admin shell at all.
function AdminRoute() {
  const hasToken = localStorage.getItem("intach_token");
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  const storedUser = localStorage.getItem("intach_user");
  const role = storedUser ? JSON.parse(storedUser).role : null;
  if (role === "registered_member" || !role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// "/" is the public homepage. A logged-in staff user (anything but a plain
// registered_member) belongs on the admin side, so redirect them there on a
// fresh page load; registered_members stay on the public homepage like any
// other visitor.
function HomeOrAdminRedirect() {
  const hasToken = localStorage.getItem("intach_token");
  const storedUser = localStorage.getItem("intach_user");
  const role = storedUser ? JSON.parse(storedUser).role : null;

  if (hasToken && role !== "registered_member") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <AnimatedPage><Home /></AnimatedPage>;
}

// Helper wrapper to animate transition for standalone page components
function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      
      {/* Site Layout Wrapped Routes (Gets Header & Footer automatically) */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomeOrAdminRedirect />} />
        
        {/* Protected User Routes (Gets Header & Footer) */}
        <Route element={<ProtectedRoute />}>
          
          <Route path="/orders" element={<AnimatedPage><OrderHistory /></AnimatedPage>} />
          <Route path="/volunteer/*" element={<AnimatedPage><VolunteerPage /></AnimatedPage>} />
          <Route path="/events/register" element={<AnimatedPage><EventRegistration /></AnimatedPage>} />
        </Route>

        {/* Public Layout-Wrapped Routes */}
        <Route path="/events" element={<AnimatedPage><EventPage /></AnimatedPage>} />
        <Route path="/shop" element={<AnimatedPage><HeritageShop /></AnimatedPage>} />
        <Route path="/product/:id" element={<AnimatedPage><ProductDetails /></AnimatedPage>} />
        <Route path="/trails" element={<AnimatedPage><GlobeHome /></AnimatedPage>} />

        {/* Actions that require login, but keep the site header/footer */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<AnimatedPage><Checkout /></AnimatedPage>} />
        </Route>
      </Route>

      {/* Standalone Public Routes (No Header & Footer) */}
      <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
      <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />

      {/* Immersive trail — protected: browsing /trails is public, actually
          starting a trail experience requires login (same pattern as
          /events/register). */}
      <Route element={<ProtectedRoute />}>
        <Route path="/trails/:trailId" element={<AnimatedPage><TrailExperience /></AnimatedPage>} />
      </Route>

      {/* Admin Routes (No Global Header & Footer, gets AdminSidebar layout).
          AdminRoute checks role, not just login — a logged-in
          registered_member is bounced to "/" like a logged-out visitor. */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin-review" element={<AnimatedPage><AdminReviewPage /></AnimatedPage>} />
          <Route path="/admin-db" element={<AnimatedPage><AdminDatabase /></AnimatedPage>} />
          <Route path="/admin-dashboard" element={<AnimatedPage><AdminDashboardNew /></AnimatedPage>} />
          <Route path="/admin-shop" element={<AnimatedPage><AdminShopPage /></AnimatedPage>} />
          <Route path="/admin/events" element={<AnimatedPage><AdminEvents /></AnimatedPage>} />
          <Route path="/admin/events/create" element={<AnimatedPage><AdminEventCreate /></AnimatedPage>} />
        </Route>
        {/* Immersive admin chat — full-bleed, no persistent admin nav */}
        <Route path="/admin-chat" element={<AnimatedPage><AdminChat /></AnimatedPage>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AnimatedRoutes />
    </>
  );
}