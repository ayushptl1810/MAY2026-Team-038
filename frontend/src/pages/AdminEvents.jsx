import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { list, remove, listRegistrants } from "../api/events";
import { ApiError } from "../api/client";

const ITEMS_PER_PAGE = 6;

const statusBadge = (status) => {
  const map = {
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-heritage-cream-dark/60 text-heritage-charcoal/70 border-heritage-border/50",
    completed: "bg-heritage-cream-dark/60 text-heritage-charcoal/70 border-heritage-border/50",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] || map.draft;
};

const categoryColor = (eventType) => {
  const map = {
    heritage_walk: "bg-blue-50 text-blue-700",
    workshop: "bg-purple-50 text-purple-700",
    quiz: "bg-teal-50 text-teal-700",
    competition: "bg-orange-50 text-orange-700",
    cultural_event: "bg-amber-50 text-amber-700",
  };
  return map[eventType] || "bg-heritage-cream text-heritage-charcoal";
};

const isUpcoming = (event) =>
  event.status === "published" &&
  new Date(`${event.event_date}T00:00:00`) >= new Date(new Date().toDateString());

const formatEventType = (type) => type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (dateStr) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

export default function AdminEvents() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({ upcoming_events: 0, total_registrations: 0, completed_events: 0 });
  const [eventList, setEventList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [registrants, setRegistrants] = useState(null);
  const [registrantsLoading, setRegistrantsLoading] = useState(false);

  const fetchEvents = () => {
    setLoading(true);
    setError("");
    return list()
      .then((data) => {
        setSummary({
          upcoming_events: data.upcoming_events,
          total_registrations: data.total_registrations,
          completed_events: data.completed_events,
        });
        setEventList(data.events);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.detail : "Something went wrong, please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (selectedId === null) {
      setRegistrants(null);
      return;
    }
    setRegistrantsLoading(true);
    listRegistrants(selectedId)
      .then(setRegistrants)
      .catch((err) => {
        setError(err instanceof ApiError ? err.detail : "Something went wrong, please try again.");
        setSelectedId(null);
      })
      .finally(() => setRegistrantsLoading(false));
  }, [selectedId]);

  const filteredEvents = eventList.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || e.status === statusFilter);
  });

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const selectedEvent = eventList.find((e) => e.id === selectedId) || null;

  const deleteEvent = async (event) => {
    if (!isUpcoming(event)) return;
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await remove(event.id);
      if (selectedId === event.id) setSelectedId(null);
      fetchEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong, please try again.");
    }
  };

  return (
    <main className="p-8 md:p-12 overflow-y-auto w-full h-full text-heritage-espresso bg-[#f8ecd7]/90">

      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full mb-10 text-left">
        <div>
          <h2 className="font-serif text-3xl font-bold text-heritage-espresso">
            Event Management
          </h2>
          <p className="text-sm text-heritage-charcoal/70 mt-1 font-sans">
            Manage heritage events, view registrations, and track attendance.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/events/create")}
          className="mt-4 sm:mt-0 flex items-center gap-1.5 bg-heritage-red hover:bg-heritage-red/90 text-white font-semibold text-sm py-2.5 px-5 rounded shadow shadow-heritage-red/15 cursor-pointer transition-colors active:scale-95 duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Event</span>
        </button>
      </header>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-left">
        <div className="bg-heritage-cream-light p-5 rounded-xl border border-heritage-border/80 shadow-[0_4px_15px_rgba(43,33,24,0.04)]">
          <p className="text-heritage-charcoal/60 font-sans text-xs font-semibold uppercase tracking-wider">Upcoming Events</p>
          <h3 className="font-serif text-2xl font-bold text-heritage-espresso mt-1">{summary.upcoming_events}</h3>
          <p className="text-[10px] text-heritage-charcoal/50 font-sans mt-1.5">Scheduled and open for registration</p>
        </div>
        <div className="bg-heritage-cream-light p-5 rounded-xl border border-heritage-border/80 shadow-[0_4px_15px_rgba(43,33,24,0.04)]">
          <p className="text-heritage-charcoal/60 font-sans text-xs font-semibold uppercase tracking-wider">Total Registrations</p>
          <h3 className="font-serif text-2xl font-bold text-heritage-red mt-1">{summary.total_registrations}</h3>
          <p className="text-[10px] text-heritage-charcoal/50 font-sans mt-1.5">Across all events in this cycle</p>
        </div>
        <div className="bg-heritage-cream-light p-5 rounded-xl border border-heritage-border/80 shadow-[0_4px_15px_rgba(43,33,24,0.04)]">
          <p className="text-heritage-charcoal/60 font-sans text-xs font-semibold uppercase tracking-wider">Completed Events</p>
          <h3 className="font-serif text-2xl font-bold text-heritage-espresso mt-1">{summary.completed_events}</h3>
          <p className="text-[10px] text-heritage-charcoal/50 font-sans mt-1.5">Successfully concluded heritage events</p>
        </div>
      </section>

      <section className="mb-8">
        <div className="bg-heritage-cream-light rounded-xl border border-heritage-border/80 shadow-[0_4px_15px_rgba(43,33,24,0.04)] text-left overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>

            {!selectedEvent ? (
              <motion.div
                key="table"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="p-6 md:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h4 className="font-serif text-2xl font-semibold text-heritage-espresso">Manage Events</h4>
                    <p className="text-xs text-heritage-charcoal/60 mt-1 font-sans">
                      View, edit, and delete events. Click a row to see its registered attendees.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0 font-sans text-xs">
                    <input
                      type="text"
                      placeholder="Search by title, type, venue…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-heritage-cream border border-heritage-border/60 text-heritage-espresso text-xs rounded font-sans px-3.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-heritage-bronze w-52"
                    />
                    <div className="flex items-center gap-1.5">
                      {["all", "published", "cancelled", "completed"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all duration-150 border ${
                            statusFilter === s
                              ? "bg-heritage-red text-white border-heritage-red"
                              : "border-heritage-border/60 text-heritage-charcoal/70 hover:bg-heritage-cream hover:text-heritage-red"
                          }`}
                        >
                          {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-heritage-border/40 text-heritage-charcoal/60 uppercase font-semibold tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3 w-32">Type</th>
                        <th className="py-2.5 px-3">Time &amp; Venue</th>
                        <th className="py-2.5 px-3 w-20 text-center">Reg.</th>
                        <th className="py-2.5 px-3 w-24">Status</th>
                        <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-heritage-border/20 text-heritage-espresso font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="py-10 text-center text-heritage-charcoal/50 font-sans text-sm">
                            Loading events…
                          </td>
                        </tr>
                      ) : pageEvents.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-10 text-center text-heritage-charcoal/50 font-sans text-sm">
                            No events match your search or filter.
                          </td>
                        </tr>
                      ) : (
                        pageEvents.map((event) => (
                          <tr
                            key={event.id}
                            onClick={() => setSelectedId(event.id)}
                            className="hover:bg-heritage-cream/30 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-[10px] text-heritage-red uppercase">
                                {formatDate(event.event_date)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-sm font-semibold">{event.title}</td>
                            <td className="py-3 px-3 w-32">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${categoryColor(event.event_type)}`}>
                                {formatEventType(event.event_type)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-heritage-charcoal/70 max-w-[180px]">
                              <span className="block text-[11px] truncate">
                                {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
                              </span>
                              <span className="block text-[10px] text-heritage-charcoal/50 truncate" title={event.venue || ""}>
                                {event.venue || "Venue TBD"}
                              </span>
                            </td>
                            <td className="py-3 px-3 w-20 text-center">
                              <span className="font-semibold text-sm">{event.registration_count}</span>
                            </td>
                            <td className="py-3 px-3 w-24">
                              <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider font-mono ${statusBadge(event.status)}`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 w-28" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                {isUpcoming(event) ? (
                                  <>
                                    <button
                                      onClick={() => navigate("/admin/events/create", { state: { event } })}
                                      className="p-1.5 border border-heritage-border/60 text-heritage-charcoal hover:text-heritage-red hover:bg-heritage-cream rounded-md transition-all cursor-pointer shadow-sm active:scale-90"
                                      title="Edit Event"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteEvent(event)}
                                      className="p-1.5 border border-heritage-border/60 text-heritage-charcoal hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-md transition-all cursor-pointer shadow-sm active:scale-90"
                                      title="Delete Event"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-heritage-charcoal/40 font-sans">Locked</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6 border-t border-heritage-border/30 pt-4 font-sans text-xs select-none text-heritage-charcoal/70 font-medium">
                  <span>
                    Page {currentPage} of {totalPages} &middot; {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 border border-heritage-border/60 hover:bg-heritage-cream rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 cursor-pointer font-medium"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 border border-heritage-border/60 hover:bg-heritage-cream rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 cursor-pointer font-medium"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

            ) : (

              <motion.div
                key={`attendees-${selectedEvent.id}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="p-6 md:p-8"
              >
                <div className="mb-6">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1.5 font-sans text-xs font-semibold text-heritage-charcoal/60 hover:text-heritage-red transition-colors cursor-pointer mb-4"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Events
                  </button>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-heritage-red mb-1">
                    {formatDate(selectedEvent.event_date)} · {formatTime(selectedEvent.start_time)}
                  </p>
                  <h4 className="font-serif text-2xl font-semibold text-heritage-espresso">
                    {selectedEvent.title}
                  </h4>
                  <p className="font-sans text-xs text-heritage-charcoal/60 mt-1">
                    {selectedEvent.venue || "Venue TBD"}
                  </p>
                </div>

                <div className="mb-4 pb-4 border-b border-heritage-border/30">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-heritage-charcoal/60">
                    Participant List
                  </p>
                  <h5 className="font-serif text-lg text-heritage-espresso mt-0.5">
                    Registered Attendees{" "}
                    <span className="font-sans text-sm font-normal text-heritage-charcoal/60">
                      ({registrants ? registrants.total_registrations : "…"})
                    </span>
                  </h5>
                </div>

                {registrantsLoading ? (
                  <p className="text-sm font-sans text-heritage-charcoal/60 py-6 text-center">Loading attendees…</p>
                ) : registrants && registrants.registrants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-heritage-border/40 text-heritage-charcoal/60 uppercase font-semibold tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 w-32">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-heritage-border/20 text-heritage-espresso">
                        {registrants.registrants.map((person) => (
                          <tr key={person.registration_id} className="hover:bg-heritage-cream/30 transition-colors">
                            <td className="py-3 px-3 font-semibold text-sm whitespace-nowrap">
                              {person.full_name}
                            </td>
                            <td className="py-3 px-3 text-heritage-charcoal/70">{person.email}</td>
                            <td className="py-3 px-3 text-heritage-charcoal/70 whitespace-nowrap">
                              {person.phone || "—"}
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider font-mono bg-heritage-cream text-heritage-charcoal border-heritage-border/60">
                                {person.registration_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg bg-heritage-cream/60 border border-heritage-border/40 p-5 text-sm font-sans text-heritage-charcoal/60 leading-6">
                    No one has registered for this event yet. Registrations submitted through the public event page will appear here.
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </section>

    </main>
  );
}
