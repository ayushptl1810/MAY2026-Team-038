import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsGrid from "../components/admin-dashboard/StatsGrid";
import SalesChart from "../components/admin-dashboard/SalesChart";
import EventsPanel from "../components/admin-dashboard/EventsPanel";
import VolunteerUploads from "../components/admin-dashboard/VolunteerUploads";
import AdminSidebar from "../components/shared/AdminSidebar";
import {
  getShopStats,
  getEvents,
  getRecentUploads,
  getMemberStats,
  getSalesTrend,
} from "../api/dashboard";
import { listPending } from "../api/heritage";
import { ApiError } from "../api/client";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [reviewCount, setReviewCount] = useState(0);
  const [shopStats, setShopStats] = useState(null);
  const [eventsData, setEventsData] = useState({ today: [], upcoming: [] });
  const [uploads, setUploads] = useState([]);
  const [memberStats, setMemberStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getShopStats(),
      getEvents(),
      getRecentUploads(),
      listPending(),
      getMemberStats(),
      getSalesTrend(),
    ])
      .then(([stats, events, recentUploads, pending, members, trend]) => {
        if (cancelled) return;
        setShopStats(stats);
        setEventsData(events);
        setUploads(recentUploads.uploads);
        setReviewCount(pending.total);
        setMemberStats(members);
        setSalesTrend(trend.points);
      })
      .catch((err) => {
        if (!cancelled) {
          setDashboardError(err instanceof ApiError ? err.detail : "Something went wrong, please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <main className="p-8 md:p-12 overflow-y-auto w-full h-full text-heritage-espresso bg-heritage-cream/90">
        {/* Inline Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full mb-10 text-left">
          <div>
            <h2 className="font-serif text-3xl font-bold text-heritage-espresso">
              Conservation Dashboard
            </h2>
            <p className="text-sm text-heritage-charcoal/70 mt-1 font-sans">
              Welcome back, administrator. Overview of Pune's heritage pulse.
            </p>
          </div>
          
        </header>

        {dashboardError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans">
            {dashboardError}
          </div>
        )}

        {/* 1. Summary Statistics Grid */}
        <section className="mb-8">
          <StatsGrid
            shopRevenueCents={shopStats?.total_revenue_cents}
            pendingReviewsCount={reviewCount}
            plannedEventsCount={eventsData.upcoming.length}
            totalMembers={memberStats?.total_members}
            newMembersThisWeek={memberStats?.new_this_week}
          />
        </section>

        {/* 2. Bento Layout: Analytics & Schedules */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
          <div className="lg:col-span-8 h-full">
            <SalesChart points={salesTrend} />
          </div>
          <div className="lg:col-span-4 h-full">
            <EventsPanel todayEvents={eventsData.today} upcomingEvents={eventsData.upcoming} />
          </div>
        </section>

        {/* 3. Volunteer Submissions Review Grid */}
        <section className="mb-4">
          <VolunteerUploads uploads={uploads} onReviewCountChange={(count) => setReviewCount(count)} />
        </section>
      </main>
  );
}
