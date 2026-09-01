import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { listPending, listRegions } from '../../api/heritage';
import { ApiError } from '../../api/client';
import { buildSiteIcon } from '../../utils/markerIcon';
import AdminSidebar from '../shared/AdminSidebar';
import './AdminDatabase.css';

const MAHARASHTRA_CENTER = [18.9, 74.6];
const DEFAULT_ZOOM = 7;
const PAGE_SIZE = 10;
const STATUSES = ['all', 'pending_review', 'approved', 'rejected'];

function MapBoundsController({ sites }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length > 0) {
      const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lon]));
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 12 });
    } else {
      map.flyTo(MAHARASHTRA_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  }, [sites, map]);

  return null;
}

function toSite(s) {
  return {
    id: s.id,
    name: s.name || 'Unnamed site',
    region: s.region_name || 'Unregioned',
    type: s.category,
    built: s.construction_period,
    signification: s.historical_significance || s.description || 'No description on file.',
    status: s.status,
    lat: s.latitude,
    lon: s.longitude,
    icon: s.category,
  };
}

export default function AdminDatabase() {
  const [sites, setSites] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [seenCategories, setSeenCategories] = useState([]);

  useEffect(() => {
    listRegions()
      .then(setRegions)
      .catch(() => {}); // filter dropdown degrades to "All Regions" only
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPending({ status, category: category || null, regionId: regionId || null, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        const mapped = data.items.map(toSite);
        setSites(mapped);
        setTotal(data.total);
        setSeenCategories((prev) =>
          Array.from(new Set([...prev, ...mapped.map((s) => s.type).filter(Boolean)])).sort()
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : 'Something went wrong, please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, category, regionId, page]);

  // Filters changing invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [status, category, regionId]);

  // Category options: whatever the selected one is, plus every category seen
  // in loaded pages (mirrors the user side deriving filters from fetched data).
  const categoryOptions = useMemo(
    () => Array.from(new Set([...seenCategories, category].filter(Boolean))).sort(),
    [seenCategories, category]
  );

  const mappableSites = sites.filter((s) => s.lat !== null && s.lat !== undefined && s.lon !== null && s.lon !== undefined);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-db-page p-8 space-y-8 text-left w-full h-full">

        {/* Header Section with Filters */}
        <div className="py-6 border-b border-heritage-border/20 flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-left">
          <div>
            <p className="uppercase tracking-[0.2em] text-[#c28230] text-xs font-bold">
              Admin Panel
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#9c2d19] mt-2">
              Heritage Database
            </h1>
            <p className="mt-3 text-heritage-charcoal/85 text-base leading-relaxed max-w-3xl">
              Browse heritage site submissions, {PAGE_SIZE} per page, sites with a description shown first.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-40 border border-heritage-border bg-white shadow-sm focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze rounded-lg p-2.5 text-xs font-semibold text-heritage-espresso transition cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-40 border border-heritage-border bg-white shadow-sm focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze rounded-lg p-2.5 text-xs font-semibold text-heritage-espresso transition cursor-pointer"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-48 border border-heritage-border bg-white shadow-sm focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze rounded-lg p-2.5 text-xs font-semibold text-heritage-espresso transition cursor-pointer"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-sm font-sans text-heritage-charcoal/60">Loading heritage sites…</div>
        )}

        {/* Main Content Area */}
        <div className="admin-db-content">

          {/* Map View */}
          <MapContainer
            center={MAHARASHTRA_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={false}
            className="admin-db-map-container"
          >
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={18}
            />

            <MapBoundsController sites={mappableSites} />

            {mappableSites.map((site) => (
              <Marker
                key={site.id}
                position={[site.lat, site.lon]}
                icon={buildSiteIcon(site.icon, { active: activeSiteId === site.id })}
                eventHandlers={{
                  click: () => setActiveSiteId(site.id)
                }}
              >
                <Popup>
                  <strong>{site.name}</strong>
                  <br />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem' }}>
                    {site.region} · {site.type}
                  </span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Table View - Restyled to match Volunteer Tables */}
          <div className="bg-transparent border border-heritage-border/30 rounded-2xl p-6 md:p-8 overflow-x-auto shadow-sm">
            <table className="w-full text-left font-serif text-sm border-collapse">
              <thead>
                <tr className="border-b border-heritage-border/40 text-heritage-charcoal/60 uppercase font-semibold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Site Name</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Category / Built</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-heritage-border/20 text-heritage-espresso font-medium">
                {sites.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-12 text-center text-heritage-charcoal/60 font-semibold"
                    >
                      {loading ? 'Loading…' : 'No sites found for the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr
                      key={site.id}
                      className={`hover:bg-heritage-cream/10 transition-colors cursor-pointer ${
                        activeSiteId === site.id ? 'bg-heritage-cream/30 border-l-4 border-heritage-bronze' : ''
                      }`}
                      onClick={() => setActiveSiteId(site.id)}
                    >
                      <td className="py-3.5 px-4 font-semibold text-heritage-espresso">
                        <strong>{site.name}</strong>
                      </td>
                      <td className="py-3.5 px-4 text-heritage-charcoal/80">{site.region}</td>
                      <td className="py-3.5 px-4 text-heritage-charcoal/80">
                        <div>{site.type || '—'}</div>
                        <span className="text-[10px] text-heritage-charcoal/60 font-sans mt-0.5 block">{site.built || ''}</span>
                      </td>
                      <td className="py-3.5 px-4 text-heritage-charcoal/80 capitalize">{site.status?.replace(/_/g, ' ')}</td>
                      <td className="py-3.5 px-4 text-heritage-charcoal/80 max-w-sm leading-relaxed whitespace-normal">
                        {site.signification}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-6 text-xs font-sans text-heritage-charcoal/70">
              <span>Page {page} of {totalPages} · {total} site{total === 1 ? '' : 's'}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-heritage-border rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-heritage-border rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
