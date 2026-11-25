import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Home,
  MapPin,
  Navigation,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from "lucide-react";
import Directory from "./Directory";
import BentoStats from "./BentoStats";
import EvEstimator from "./EvEstimator";
import stations from "./stations.json";
import "./home.css";

type Props = { onHosts: (query: string) => void };

export default function ChargeHome({ onHosts }: Props) {
  const [mode, setMode] = useState<"station" | "host">("station");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState({ query: "", nearby: false, seq: 0 });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);

  // Autocomplete matching
  const suggestions = useMemo(() => {
    if (!input.trim() || input.length < 2) return [];
    const q = input.toLowerCase().trim();
    return stations
      .filter((s) => (s.name + " " + s.city + " " + s.address).toLowerCase().includes(q))
      .slice(0, 5);
  }, [input]);

  function find(query: string, nearby = false, filter?: string) {
    setInput(query);
    setIsFocused(false);
    if (filter !== undefined) setActiveFilter(filter);
    
    if (mode === "host") {
      onHosts(query.trim());
      document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSearch((prev) => ({ query: query.trim(), nearby, seq: prev.seq + 1 }));
    setOpen(true);
    requestAnimationFrame(() =>
      results.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      })
    );
  }

  return (
    <>
      <section className="trip-home">
        <div className="trip-copy">
          <div className="hero-eyebrow">
            <span className="live-radar-dot" />
            <span>Pan-India EV Charging Network</span>
          </div>

          <h1 className="hero-title">
            Where do you<br />
            want to <span className="hero-title-gradient">charge?</span>
          </h1>

          <p className="hero-subtitle">
            Find fast public EV stations along your highway route or reserve verified neighborhood spots with local hosts.
          </p>

          <div className="search-card">
            {/* Uber / Rapido segmented mode toggle */}
            <div className="trip-modes" role="tablist" aria-label="Charging options">
              <button
                type="button"
                role="tab"
                aria-pressed={mode === "station"}
                className={mode === "station" ? "mode-tab active" : "mode-tab"}
                onClick={() => setMode("station")}
              >
                <PlugZap size={16} />
                <span>Public stations</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-pressed={mode === "host"}
                className={mode === "host" ? "mode-tab active" : "mode-tab"}
                onClick={() => setMode("host")}
              >
                <Home size={15} />
                <span>Book a host</span>
              </button>
            </div>

            {/* Uber "Where to" search bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                find(input);
              }}
              className="trip-search-form"
            >
              <div className="search-field-container">
                <div className="search-field">
                  <MapPin size={19} className="search-field-pin" />
                  <input
                    aria-label="Search location"
                    placeholder={
                      mode === "station"
                        ? "City, station or highway..."
                        : "Neighborhood (e.g. Indiranagar)..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  />
                  {input && (
                    <button
                      type="button"
                      className="search-field-clear"
                      onClick={() => setInput("")}
                      aria-label="Clear input"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                {/* Rich Autocomplete Dropdown (Uber Destination UX) */}
                {isFocused && suggestions.length > 0 && (
                  <div className="autocomplete-dropdown" role="listbox">
                    <div className="autocomplete-header">Matching charging locations</div>
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="autocomplete-item"
                        onMouseDown={() => find(s.name)}
                      >
                        <div className="autocomplete-icon-wrap">
                          <Zap size={15} />
                        </div>
                        <div className="autocomplete-details">
                          <strong>{s.name}</strong>
                          <small>{s.address ? `${s.address}, ` : ""}{s.city}</small>
                        </div>
                        <div className="autocomplete-badges">
                          <span className="auto-plug-pill">60kW DC</span>
                          <span className="auto-status-pill">● Available</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="search-submit-button">
                <span>{mode === "station" ? "Find stations" : "Find hosts"}</span>
                <ArrowRight size={17} />
              </button>
            </form>

            {/* Quick Actions Row — Clean, systematic destination shortcuts */}
            <div className="search-quick-row">
              {mode === "station" && (
                <button
                  type="button"
                  className="gps-button"
                  onClick={() => find("", true)}
                >
                  <Navigation size={13} className="gps-icon" />
                  <span>Current location</span>
                </button>
              )}
              <div className="popular-cities">
                <span className="popular-label">Popular:</span>
                {["Bengaluru", "Delhi NCR", "Noida", "Mysuru"].map((city) => (
                  <button
                    key={city}
                    type="button"
                    className="city-pill-btn"
                    onClick={() => find(city === "Delhi NCR" ? "New Delhi" : city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side visual showcase — Pure high-res real EV photograph, NO overlays */}
        <div className="trip-photo-card">
          <img
            src="/images/hero-charging-hub.jpg"
            alt="Porsche Taycan charging at an architectural solar canopy station"
            fetchPriority="high"
          />
        </div>
      </section>

      <BentoStats />

      {/* Interactive EV Range & Charge Estimator */}
      <EvEstimator onFindFastHubs={() => find("Charging", false, "dc-fast")} />

      {/* City explore row */}
      <div className="city-explore-section">
        <div className="city-explore-header">
          <div>
            <h2>Explore charging by city</h2>
            <p>100+ mapped stations with live route planning</p>
          </div>
        </div>
        <div className="city-grid">
          {[
            { name: "Bengaluru", count: "34 Hubs" },
            { name: "New Delhi", count: "28 Hubs" },
            { name: "Noida", count: "18 Hubs" },
            { name: "Mysuru", count: "12 Hubs" },
          ].map((item) => (
            <button
              key={item.name}
              className="city-grid-card"
              onClick={() => {
                setMode("station");
                setInput(item.name);
                setSearch((prev) => ({
                  query: item.name,
                  nearby: false,
                  seq: prev.seq + 1,
                }));
                setOpen(true);
                requestAnimationFrame(() => results.current?.scrollIntoView());
              }}
            >
              <div className="city-grid-left">
                <span className="city-grid-icon">
                  <MapPin size={15} />
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.count}</small>
                </div>
              </div>
              <ArrowUpRight size={15} className="city-grid-arrow" />
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Station Explorer & Relocated Filter Toolbar */}
      <section ref={results} className="station-explorer-section">
        <div className="directory-filter-header">
          <div className="directory-filter-title">
            <span className="directory-eyebrow">
              <SlidersHorizontal size={13} />
              <span>STATION DIRECTORY & FILTERS</span>
            </span>
            <h3>Pan-India Charging Hubs</h3>
            <p>102 verified stations mapped across Indian highways & urban centers</p>
          </div>

          {/* Precision Vector Filter Bar — Lucide SVG Icons, Zero Emojis */}
          <div className="directory-filter-bar" role="group" aria-label="Filter charging stations">
            {[
              { id: "all", label: "All Hubs", icon: SlidersHorizontal, query: "", count: "102" },
              { id: "dc-fast", label: "Fast DC (≥50 kW)", icon: Zap, iconClass: "icon-zap", query: "Charging", count: "42" },
              { id: "solar", label: "Solar Powered", icon: Sun, iconClass: "icon-sun", query: "Solar", count: "18" },
              { id: "highway", label: "Highway Corridors", icon: Clock, iconClass: "icon-clock", query: "Highway", count: "31" },
              { id: "verified", label: "Verified Networks", icon: ShieldCheck, iconClass: "icon-shield", query: "Charge", count: "56" },
            ].map((f) => {
              const Icon = f.icon;
              const isSelected = activeFilter === f.id || (activeFilter === null && f.id === "all");
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`dir-filter-pill ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    if (f.id === "all") {
                      setActiveFilter(null);
                      find("");
                    } else if (activeFilter === f.id) {
                      setActiveFilter(null);
                      find("");
                    } else {
                      setActiveFilter(f.id);
                      find(f.query, false, f.id);
                    }
                  }}
                >
                  <Icon size={14} className={`dir-filter-icon ${f.iconClass || ""}`} />
                  <span className="dir-filter-text">{f.label}</span>
                  {isSelected && <Check size={12} className="dir-filter-check" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="trip-directory">
          {open && (
            <Directory
              key={search.seq}
              initialQuery={search.query}
              nearby={search.nearby}
            />
          )}
        </div>
      </section>
    </>
  );
}
