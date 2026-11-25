import ChargeHome from "./ChargeHome";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Zap,
  Search,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Sun,
  Plug,
  Clock,
  Leaf,
  LayoutDashboard,
  CalendarDays,
  Home,
  ShieldCheck,
  Bell,
  LogOut,
  Plus,
  X,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Car,
  Map as MapIcon,
  List,
  Activity,
  Wallet,
  Menu,
  User,
} from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./ui.css";
type User = { id: string; name: string; email: string; role: string };
type Charger = {
  id: string;
  name: string;
  area: string;
  connector: string;
  kw: number;
  price: number;
  solar: number;
  open_hour: number;
  close_hour: number;
  lat: number;
  lng: number;
  host_name?: string;
  status?: string;
  enabled?: number;
  address?: string;
};
type Vehicle = { id: string; name: string; connector: string; max_kw: number };
type Booking = {
  id: string;
  charger_name: string;
  area: string;
  status: string;
  start_at: string;
  end_at: string;
  access_code: string;
  vehicle_name: string;
  address?: string;
  instructions?: string;
  energy_kwh?: number;
  cost_paise?: number;
  source?: string;
  rate: number;
  driver_name?: string;
};
async function api<T = any>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api" + url, {
    method,
    headers: { "Content-Type": "application/json", "X-Voltghar": "1" },
    credentials: "same-origin",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
const date = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
function App() {
  const [user, setUser] = useState<User | null>(null),
    [page, setPage] = useState("discover"),
    [chargers, setChargers] = useState<Charger[]>([]),
    [vehicles, setVehicles] = useState<Vehicle[]>([]),
    [bookings, setBookings] = useState<Booking[]>([]),
    [hostChargers, setHostChargers] = useState<Charger[]>([]),
    [hostBookings, setHostBookings] = useState<Booking[]>([]),
    [adminChargers, setAdminChargers] = useState<Charger[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [notifications, setNotifications] = useState<any[]>([]),
    [impact, setImpact] = useState<any>(null);
  const [modal, setModal] = useState<
    "login" | "register" | "vehicle" | "charger" | null
  >(null),
    [selected, setSelected] = useState<Charger | null>(null),
    [query, setQuery] = useState(""),
    [solarOnly, setSolarOnly] = useState(false),
    [maxPrice, setMaxPrice] = useState(2500),
    [view, setView] = useState("list"),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [navOpen, setNavOpen] = useState(false);
  const [slots, setSlots] = useState<any[]>([]),
    [slotError, setSlotError] = useState("");
  const [authMode, setAuthMode] = useState("driver");
  const [authRole, setAuthRole] = useState<"user" | "admin">("user");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [arrival, setArrival] = useState(""),
    [departure, setDeparture] = useState(""),
    [chosenVehicle, setChosenVehicle] = useState("");
  const reservationHours =
    Math.max(
      0,
      (Date.parse(departure + ":00+05:30") -
        Date.parse(arrival + ":00+05:30")) /
      3600000,
    ) || 0;
  const compatibleVehicle =
    vehicles.find((v) => v.id === chosenVehicle) ||
    vehicles.find((v) => v.connector === selected?.connector);
  const estimatedKwh = selected
    ? reservationHours *
    Math.min(selected.kw, compatibleVehicle?.max_kw || selected.kw)
    : 0;
  async function refresh(u = user) {
    setChargers(await api("/chargers"));
    if (u) {
      const [v, b, n, i] = await Promise.all([
        api("/vehicles"),
        api("/bookings"),
        api("/notifications"),
        api("/impact"),
      ]);
      setVehicles(v);
      setBookings(b);
      setNotifications(n);
      setImpact(i);
      if (u.role === "host" || u.role === "admin") {
        const [c, h] = await Promise.all([
          api("/host/chargers"),
          api("/host/bookings"),
        ]);
        setHostChargers(c);
        setHostBookings(h);
      }
      if (u.role === "admin") {
        setAdminChargers(await api("/admin/chargers"));
        setAudit(await api("/admin/audit"));
      }
    }
  }
  useEffect(() => {
    (async () => {
      try {
        const { user: u } = await api("/me");
        setUser(u);
        await refresh(u);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  useEffect(() => {
    const events = new EventSource("/api/updates");
    let timer: ReturnType<typeof setTimeout>;
    const update = () => { clearTimeout(timer); timer = setTimeout(() => refresh(user).catch(() => { }), 300); };
    events.onmessage = update;
    events.onopen = update;
    return () => { clearTimeout(timer); events.close(); };
  }, [user]);
  useEffect(() => {
    if (!modal && !selected) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,[href]",
        ) || [],
      );
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        setSelected(null);
        setError("");
      }
      if (e.key === "Tab") {
        const nodes = focusables(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal, selected]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    setSlots([]);
    setSlotError("");
    if (selected) {
      let active = true;
      api("/chargers/" + selected.id + "/slots")
        .then((x) => {
          if (active) setSlots(x);
        })
        .catch((e) => {
          if (active) setSlotError(e.message);
        });
      return () => {
        active = false;
      };
    }
  }, [selected]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function go(p: string) {
    setError("");
    setPage(p);
    setNavOpen(false);
    if (!user && p !== "discover") setModal("login");
  }
  function openBooking(c: Charger) {
    setError("");
    if (!user) {
      setModal("login");
      return;
    }
    setArrival("");
    setDeparture("");
    setChosenVehicle("");
    setSelected(c);
  }
  function openModal(m: typeof modal, role: "user" | "admin" = "user") {
    setError("");
    setAuthRole(role);
    if (role === "admin") {
      setLoginEmail("admin@nxtcharge.com");
      setLoginPassword("AdminPassword123!");
    } else {
      setLoginEmail("");
      setLoginPassword("");
    }
    setModal(m);
  }
  const filtered = chargers.filter(
    (c) =>
      (c.name + " " + c.area).toLowerCase().includes(query.toLowerCase()) &&
      (!solarOnly || c.solar) &&
      c.price <= maxPrice,
  );
  const nav = [
    ["discover", "Discover chargers", Search],
    ["bookings", "My bookings", CalendarDays],
    ["garage", "My garage", Car],
    ["impact", "Energy insights", Leaf],
  ] as const;
  const current =
    bookings.find((b) => b.status === "charging") ||
    bookings.find(
      (b) => b.status === "confirmed" && Date.parse(b.end_at) > Date.now(),
    );
  const title = (
    {
      discover: "Discover",
      bookings: "My bookings",
      garage: "My garage",
      impact: "Energy insights",
      host: "Host workspace",
      admin: "Network operations",
      notifications: "Notifications",
    } as Record<string, string>
  )[page];
  const formData = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return Object.fromEntries(new FormData(e.currentTarget));
  };
  return (
    <div className={"app " + (page === "discover" ? "discovery" : "")}>
      <aside className={"sidebar " + (navOpen ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("discover");
          }}
        >
          <span className="brand-icon">
            <Zap size={22} fill="currentColor" />
          </span>
          NXTCharge<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR NEIGHBORHOOD NETWORK</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              {label}
              {id === "discover" && (
                <span className="nav-count">{chargers.length}</span>
              )}
            </button>
          ))}
          {user && ["host", "admin"].includes(user.role) && (
            <>
              <div className="nav-divider" />
              <button
                className={page === "host" ? "active" : ""}
                onClick={() => go("host")}
              >
                <Home size={19} />
                Host workspace
              </button>
            </>
          )}
          {user?.role === "admin" && (
            <button
              className={page === "admin" ? "active" : ""}
              onClick={() => go("admin")}
            >
              <ShieldCheck size={19} />
              Administration
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="host-promo">
            <span className="promo-icon">
              <Plug size={22} />
            </span>
            <h3>
              A little space.
              <br />A bigger change.
            </h3>
            <p>Put your charger to work for your neighborhood.</p>
            <button
              onClick={() =>
                user
                  ? user.role === "driver"
                    ? setToast(
                      "Create a separate host account to register charging locations.",
                    )
                    : go("host")
                  : (setAuthMode("host"), openModal("register"))
              }
            >
              Become a host <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="network-status">
            <span /> Community powered. Solar aware.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="header-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setNavOpen(!navOpen)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={14} /> <strong>{title}</strong>
            </span>
          </div>
          <div className="header-right">
            <span className="city">
              <MapPin size={15} /> India
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => go("notifications")}
            >
              <Bell size={19} />
              {notifications.length > 0 && <i />}
            </button>
            {user ? (
              <button
                className="profile"
                title="Sign out"
                onClick={() =>
                  act(async () => {
                    await api("/auth/logout", "POST");
                    setUser(null);
                    setBookings([]);
                    setVehicles([]);
                    setNotifications([]);
                    setPage("discover");
                    setToast("Signed out.");
                  })
                }
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  {user.name.split(" ")[0]}
                  <small>{user.role}</small>
                </span>
                <LogOut size={15} />
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="button small secondary admin-nav-btn"
                  onClick={() => openModal("login", "admin")}
                  title="Administrator Portal"
                >
                  <ShieldCheck size={14} /> Admin
                </button>
                <button
                  className="button small"
                  onClick={() => openModal("login", "user")}
                >
                  Sign in <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </header>
        <main>
          {error && !modal && !selected && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {page === "discover" && (
            <>
              <ChargeHome onHosts={value => { setQuery(value); setSolarOnly(false); setMaxPrice(10000); }} />
              <section id="explore">
                <div className="section-heading">
                  <div>
                    <h2>Book a neighborhood charger</h2>
                    <p>Reserve a time with an approved NXTCharge host.</p>
                  </div>
                  <div className="view-toggle">
                    <button
                      aria-label="List view"
                      className={view === "list" ? "selected" : ""}
                      onClick={() => setView("list")}
                    >
                      <List size={16} /> List
                    </button>
                    <button
                      aria-label="Map view"
                      className={view === "map" ? "selected" : ""}
                      onClick={() => setView("map")}
                    >
                      <MapIcon size={16} /> Map
                    </button>
                  </div>
                </div>
                <div className="filters">
                  <label className="search-box">
                    <Search size={19} />
                    <input
                      aria-label="Search neighborhood"
                      placeholder="Search a neighborhood or charger"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <button
                    className={"filter-button " + (solarOnly ? "chosen" : "")}
                    onClick={() => setSolarOnly(!solarOnly)}
                  >
                    <Sun size={17} /> Solar hosts{" "}
                    {solarOnly && <Check size={15} />}
                  </button>
                  <label className="filter-price">
                    <SlidersHorizontal size={16} />
                    <select
                      aria-label="Maximum price"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                    >
                      <option value={2500}>Any price</option>
                      <option value={900}>Up to ₹9/kWh</option>
                      <option value={1200}>Up to ₹12/kWh</option>
                    </select>
                  </label>
                </div>
                <div className="results-label">
                  <span>
                    {filtered.length} charging spots{" "}
                    <span className="muted">listed</span>
                  </span>
                  <span>Prices per kWh</span>
                </div>
                {!loaded ? (
                  <div className="empty">Loading your neighborhood…</div>
                ) : !filtered.length ? (
                  <Empty
                    icon={Search}
                    title={chargers.length ? "No matching hosts" : "No host listings yet"}
                    text={chargers.length ? "Try another neighborhood or clear the filters." : "Approved host locations will appear here."} action={() => { if (chargers.length) { setQuery(""); setSolarOnly(false); setMaxPrice(10000); } else if (user?.role === "admin" || user?.role === "host") openModal("charger"); else { setAuthMode("host"); openModal("register"); } }} actionText={chargers.length ? "Clear filters" : "List a charger"}
                  />
                ) : view === "list" ? (
                  <div className="charger-grid">
                    {filtered.map((c, i) => (
                      <article className="charger-card" key={c.id}>
                        <div className={"charger-cover scene-" + (i % 3)}>
                          <div className="cover-scene">
                            <div className="mini-house">
                              <div className="mini-window" />
                              <div className="mini-door" />
                            </div>
                            <div className="mini-tree" />
                            <div className="mini-charger">
                              <Zap size={15} />
                            </div>
                            <div className="mini-road" />
                          </div>
                          <span className="cover-badge tag">
                            {c.solar ? (
                              <>
                                <Sun size={13} /> Solar host
                              </>
                            ) : (
                              <>
                                <Plug size={13} /> Neighborhood host
                              </>
                            )}
                          </span>
                          <span className="cover-power meta-chip">{c.kw} kW</span>
                        </div>
                        <div className="charger-content">
                          <div className="card-title-row">
                            <h3>{c.name}</h3>
                            <span
                              className="tag tag--available charger-status"
                              title="Listed for reservations"
                            />
                          </div>
                          <p className="location">
                            <MapPin size={14} />
                            {c.area}
                          </p>
                          <div className="charger-specs">
                            <span>
                              <Plug size={14} />
                              {c.connector}
                            </span>
                            <span>
                              <Clock size={14} />
                              {String(c.open_hour).padStart(2, "0")}:00–
                              {c.close_hour}:00
                            </span>
                          </div>
                          <div className="card-footer">
                            <div>
                              <strong>{money(c.price)}</strong>
                              <span> / kWh</span>
                            </div>
                            <button onClick={() => openBooking(c)}>
                              View & book <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="map-wrap">
                    <MapContainer
                      center={[filtered[0].lat, filtered[0].lng]}
                      zoom={12}
                      scrollWheelZoom={false}
                      style={{ height: 470, width: "100%" }}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {filtered.map((c) => (
                        <CircleMarker
                          key={c.id}
                          center={[c.lat, c.lng]}
                          radius={13}
                          pathOptions={{
                            color: "#fff",
                            weight: 3,
                            fillColor: "#131311",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>
                            <strong>{c.name}</strong>
                            <p>
                              {c.area} · {money(c.price)}/kWh
                            </p>
                            <button
                              className="button small"
                              onClick={() => openBooking(c)}
                            >
                              View & book
                            </button>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                    <p>
                      Approximate neighborhood locations. Exact addresses are
                      available after booking.
                    </p>
                  </div>
                )}

              </section>
            </>
          )}
          {page === "bookings" && (
            <>
              <PageHeading
                eyebrow="A LITTLE PLANNING. A SMOOTHER DRIVE."
                title="Your charging, organized."
                text="Upcoming reservations, active sessions and your charging history."
              />
              {current && (
                <div className="upcoming agenda-item">
                  <span className="metric-icon metric-icon--soft">
                    <Zap size={24} />
                  </span>
                  <div>
                    <small>
                      {current.status === "charging"
                        ? "ACTIVE SESSION"
                        : "YOUR NEXT RESERVATION"}
                    </small>
                    <h3>{current.charger_name}</h3>
                    <p>{date(current.start_at)} IST</p>
                  </div>
                  <span className="pill meta-chip">{current.status}</span>
                </div>
              )}
              {!user ? (
                <SignIn onClick={() => openModal("login")} />
              ) : bookings.length === 0 ? (
                <Empty
                  icon={CalendarDays}
                  title="Your next charge starts here"
                  text="Find a neighborhood charger and reserve a time that suits you."
                  action={() => go("discover")}
                  actionText="Discover chargers"
                />
              ) : (
                <div className="booking-list group-head">
                  {bookings.map((b) => (
                    <article className="booking-card card-section" key={b.id}>
                      <div className="booking-top agenda-item__content">
                        <div>
                          <span className={"status " + b.status}>
                            {b.status}
                          </span>
                          <h3>{b.charger_name}</h3>
                          <p>
                            {b.vehicle_name} · {b.area}
                          </p>
                        </div>
                        <span className="booking-reference">
                          #{b.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="booking-details agenda-item">
                        <div>
                          <small>ARRIVAL · IST</small>
                          <strong>{date(b.start_at)}</strong>
                        </div>
                        <div>
                          <small>DEPARTURE · IST</small>
                          <strong>{date(b.end_at)}</strong>
                        </div>
                        <div>
                          <small>LOCKED RATE</small>
                          <strong>{money(b.rate)}/kWh</strong>
                        </div>
                      </div>
                      {b.address && (
                        <p className="address">
                          <MapPin size={16} />
                          {b.address}
                        </p>
                      )}
                      {b.instructions && (
                        <p className="muted">{b.instructions}</p>
                      )}
                      {b.source && (
                        <div className="session-data">
                          <span>
                            <Activity size={17} />
                            {(b.energy_kwh || 0).toFixed(3)} kWh
                          </span>
                          <span>
                            Calculated charge {money(b.cost_paise || 0)}
                          </span>
                          <span className="pill meta-chip">{b.source} · unpaid</span>
                        </div>
                      )}
                      <div className="booking-actions">
                        {b.status === "confirmed" && (
                          <>
                            <span className="access-code tile tile--ink">
                              Arrival code <strong>{b.access_code}</strong>
                            </span>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                act(async () => {
                                  await api(`/bookings/${b.id}/cancel`, "POST");
                                  await refresh();
                                  setToast("Reservation cancelled.");
                                })
                              }
                            >
                              Cancel booking
                            </button>
                            <small>Give your arrival code to the host at check-in.</small>
                          </>
                        )}
                        {b.status === "completed" && (
                          <small>
                            Session record saved. Payment integration is not
                            connected.
                          </small>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "garage" && (
            <>
              <PageHeading
                eyebrow="READY FOR THE ROAD"
                title="Your electric garage."
                text="Save your vehicle’s connector and AC charging limit for compatible bookings."
                action={() =>
                  user ? openModal("vehicle") : openModal("login")
                }
                actionText="Add vehicle"
              />
              {!user ? (
                <SignIn onClick={() => openModal("login")} />
              ) : vehicles.length ? (
                <div className="charger-grid">
                  {vehicles.map((v) => (
                    <div className="vehicle-card" key={v.id}>
                      <Car size={56} strokeWidth={1.3} />
                      <h2>{v.name}</h2>
                      <p>
                        {v.connector} · {v.max_kw} kW maximum AC power
                      </p>
                      <span className="pill meta-chip">Saved vehicle</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Car}
                  title="Make room for your EV"
                  text="Add a vehicle before reserving your first charger."
                  action={() => openModal("vehicle")}
                  actionText="Add vehicle"
                />
              )}
            </>
          )}
          {page === "impact" && (
            <>
              <PageHeading
                eyebrow="UNDERSTAND EVERY KILOWATT-HOUR"
                title="Good energy. Clear evidence."
                text="Your charging data, from meter readings recorded by your hosts."
              />
              {!user ? (
                <SignIn onClick={() => openModal("login")} />
              ) : (
                <>
                  <div className="stats-grid">
                    <Stat
                      icon={Zap}
                      label="Metered energy"
                      value={`${(impact?.metered_kwh || 0).toFixed(2)} kWh`}
                      detail="From host-entered meter readings"
                    />

                    <Stat
                      icon={CalendarDays}
                      label="Charging sessions"
                      value={impact?.sessions || 0}
                      detail="All recorded sessions"
                    />
                  </div>
                  <div className="insight-panel tile">
                    <div className="insight-symbol">
                      <Sun size={52} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        SOLAR AWARE, EVIDENCE FIRST
                      </span>
                      <h2>A greener charge starts with better data.</h2>
                      <p>
                        Rooftop solar is currently reported by hosts. Verified
                        solar contribution and avoided emissions will appear
                        once inverter, meter and emissions-factor data are
                        connected.
                      </p>
                      <div className="insight-values">
                        <div>
                          <strong>—</strong>
                          <span>Verified solar kWh</span>
                        </div>
                        <div>
                          <strong>—</strong>
                          <span>Estimated avoided CO₂</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="info-panel">
                    <h3>How your session energy is calculated</h3>
                    <p>
                      Your host records the charger meter at arrival and departure. The difference in kWh times your reserved rate gives the session cost.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
          {page === "host" && (
            <>
              <PageHeading
                eyebrow="YOUR SPACE. YOUR SCHEDULE."
                title="Welcome to your host workspace."
                text="Manage your charging locations and the neighbors who use them."
                action={() => openModal("charger")}
                actionText="Add charging point"
              />
              {user && ["host", "admin"].includes(user.role) ? (
                <>
                  <div className="stats-grid">
                    <Stat
                      icon={Plug}
                      label="Your charging points"
                      value={hostChargers.length}
                      detail={`${hostChargers.filter((c) => c.status === "approved").length} approved listings`}
                    />
                    <Stat
                      icon={CalendarDays}
                      label="Reservations"
                      value={hostBookings.length}
                      detail={`${hostBookings.filter((b) => b.status === "confirmed").length} confirmed`}
                    />
                    <Stat
                      icon={Wallet}
                      label="Calculated session value"
                      value={money(
                        hostBookings.reduce(
                          (a, b) => a + (b.cost_paise || 0),
                          0,
                        ),
                      )}
                      detail="Calculated from completed meter records"
                    />
                  </div>
                  <div className="section-heading">
                    <h2>Your charging points</h2>
                  </div>
                  {hostChargers.length ? (
                    <div className="table-wrap card-section">
                      <table>
                        <thead>
                          <tr>
                            <th>Charging point</th>
                            <th>Power / rate</th>
                            <th>Hours · IST</th>
                            <th>Review</th>
                            <th>Availability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hostChargers.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <strong>{c.name}</strong>
                                <small>{c.area}</small>
                              </td>
                              <td>
                                {c.kw} kW · {money(c.price)}/kWh
                              </td>
                              <td>
                                {c.open_hour}:00–{c.close_hour}:00
                              </td>
                              <td>
                                <span className={"status " + c.status}>
                                  {c.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={
                                    "button small " +
                                    (!c.enabled ? "secondary tag--paused" : "tag--available")
                                  }
                                  disabled={busy}
                                  onClick={() =>
                                    act(async () => {
                                      await api(
                                        "/host/chargers/" + c.id,
                                        "PATCH",
                                        { enabled: !c.enabled },
                                      );
                                      await refresh();
                                      setToast(
                                        "Availability updated. Existing bookings are retained.",
                                      );
                                    })
                                  }
                                >
                                  {c.enabled ? "Accepting bookings" : "Paused"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      icon={Plug}
                      title="Your first charging point"
                      text="Add a location and submit it for administrator review."
                    />
                  )}
                  <div className="section-heading">
                    <h2>Reservations</h2>
                  </div>
                  <HostBookings
                    bookings={hostBookings}
                    record={(b, reading, code) => act(async () => {
                      await api("/host/bookings/" + b.id + "/" + (b.status === "charging" ? "finish" : "start"), "POST", { reading, code });
                      await refresh();
                      setToast("Meter reading saved.");
                    })}
                    busy={busy}
                    cancel={(id) =>
                      act(async () => {
                        await api(`/bookings/${id}/cancel`, "POST");
                        await refresh();
                      })
                    }
                  />
                </>
              ) : (
                <SignIn onClick={() => openModal("login")} />
              )}
            </>
          )}
          {page === "admin" && user?.role === "admin" && (
            <>
              <PageHeading
                eyebrow="KEEP THE NETWORK RUNNING"
                title="Network operations."
                text="Review charging-point applications and track platform activity."
              />
              <div className="stats-grid">
                <Stat
                  icon={Plug}
                  label="Total listings"
                  value={adminChargers.length}
                  detail="Across all hosts"
                />
                <Stat
                  icon={Clock}
                  label="Awaiting review"
                  value={
                    adminChargers.filter((c) => c.status === "pending").length
                  }
                  detail="Verify equipment and property access"
                />
                <Stat
                  icon={ShieldCheck}
                  label="Approved listings"
                  value={
                    adminChargers.filter((c) => c.status === "approved").length
                  }
                  detail="Visible when accepting bookings"
                />
              </div>
              <div className="section-heading">
                <h2>Charger review queue</h2>
              </div>
              <div className="table-wrap card-section">
                <table>
                  <thead>
                    <tr>
                      <th>Charging point</th>
                      <th>Host</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminChargers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <strong>{c.name}</strong>
                            <small style={{ color: "var(--ink-secondary)" }}>
                              {c.area} · {c.address}
                            </small>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "3px" }}>
                              <span style={{ fontSize: "11px", padding: "2px 7px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px" }}>{c.kw} kW</span>
                              <span style={{ fontSize: "11px", padding: "2px 7px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px" }}>{c.connector}</span>
                              <span style={{ fontSize: "11px", padding: "2px 7px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px" }}>{money(c.price)}/kWh</span>
                              {Boolean(c.solar) && (
                                <span style={{ fontSize: "11px", padding: "2px 7px", background: "#fef9c3", color: "#854d0e", border: "1px solid #fef08a", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Sun size={12} /> Solar
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{c.host_name}</strong>
                        </td>
                        <td>
                          <span className={"status " + c.status}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            {c.status !== "approved" && (
                              <button
                                className="button small"
                                style={{ background: "#059669", color: "#ffffff", borderColor: "#059669", fontWeight: 600 }}
                                disabled={busy}
                                onClick={() =>
                                  act(async () => {
                                    await api(
                                      `/admin/chargers/${c.id}/review`,
                                      "POST",
                                      { status: "approved" },
                                    );
                                    await refresh();
                                    setToast(`${c.name} approved! Now live on the public network.`);
                                  })
                                }
                              >
                                Approve
                              </button>
                            )}
                            {c.status !== "rejected" && (
                              <button
                                className="button small secondary"
                                disabled={busy}
                                onClick={() =>
                                  act(async () => {
                                    await api(
                                      `/admin/chargers/${c.id}/review`,
                                      "POST",
                                      { status: "rejected" },
                                    );
                                    await refresh();
                                    setToast(`${c.name} rejected.`);
                                  })
                                }
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adminChargers.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "var(--ink-secondary)" }}>
                          No host charging points in the queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="section-heading">
                <h2>Audit trail</h2>
              </div>
              <div className="activity-list card-section group-head">
                {audit.length ? (
                  audit.map((a) => (
                    <div key={a.id}>
                      <ShieldCheck size={18} />
                      <div>
                        <strong>{a.action}</strong>
                        <p>
                          {a.actor_name} · {a.target_id.slice(0, 8)}
                        </p>
                      </div>
                      <small>{a.created_at} UTC</small>
                    </div>
                  ))
                ) : (
                  <p className="muted">Platform actions will appear here.</p>
                )}
              </div>
            </>
          )}
          {page === "notifications" && (
            <>
              <PageHeading
                eyebrow="IN THE LOOP"
                title="Your network updates."
                text="Booking confirmations, cancellations and listing decisions."
              />
              {user ? (
                <div className="activity-list card-section group-head">
                  {notifications.length ? (
                    notifications.map((n) => (
                      <div key={n.id}>
                        <Bell size={20} />
                        <div>
                          <strong>{n.message}</strong>
                          <p>{n.created_at} UTC</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty
                      icon={Bell}
                      title="All quiet for now"
                      text="Updates will appear as you use NXTCharge."
                    />
                  )}
                </div>
              ) : (
                <SignIn onClick={() => openModal("login")} />
              )}
            </>
          )}
          <footer>
            <span className="footer-brand">
              <Zap size={14} /> NXTCHARGE
            </span>
            <span>Every driveway. A possibility.</span>
            <span>
              Made for a greener neighborhood <Leaf size={13} />
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {(modal || selected) && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setModal(null);
              setSelected(null);
              setError("");
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected ? "Reserve charger" : modal || "Form"}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => {
                setModal(null);
                setSelected(null);
                setError("");
              }}
            >
              <X size={22} />
            </button>
            {(modal === "login" || modal === "register") && (
              <>
                <div className="auth-role-tabs">
                  <button
                    type="button"
                    className={"auth-role-tab " + (authRole === "user" ? "active" : "")}
                    onClick={() => {
                      setAuthRole("user");
                      setLoginEmail("");
                      setLoginPassword("");
                      setError("");
                    }}
                  >
                    <User size={15} /> Driver & Host
                  </button>
                  <button
                    type="button"
                    className={"auth-role-tab " + (authRole === "admin" ? "active" : "")}
                    onClick={() => {
                      setAuthRole("admin");
                      if (modal === "register") setModal("login");
                      setLoginEmail("admin@nxtcharge.com");
                      setLoginPassword("AdminPassword123!");
                      setError("");
                    }}
                  >
                    <ShieldCheck size={15} /> Network Admin
                  </button>
                </div>

                <span className="modal-icon">
                  {authRole === "admin" ? <ShieldCheck size={25} /> : <Zap size={25} />}
                </span>
                <div className="eyebrow">
                  {authRole === "admin"
                    ? "NETWORK OPERATIONS & APPROVALS"
                    : "WELCOME TO THE NEIGHBORHOOD"}
                </div>
                <h2>
                  {authRole === "admin"
                    ? "Administrator Portal."
                    : modal === "login"
                      ? "Good to have you back."
                      : "Your next chapter starts here."}
                </h2>
                <p>
                  {authRole === "admin"
                    ? "Sign in to review and approve host charging stations."
                    : modal === "login"
                      ? "Sign in to manage your charging journey."
                      : "Create your NXTCharge account."}
                </p>

                {authRole === "admin" && (
                  <div className="admin-notice-pill">
                    <ShieldCheck size={16} />
                    <span>
                      Operator credentials prefilled. One-click access to review and approve host stations.
                    </span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    const d = formData(e);
                    act(async () => {
                      const { user: u } = await api(
                        "/auth/" + (modal === "login" ? "login" : "register"),
                        "POST",
                        d,
                      );
                      setUser(u);
                      await refresh(u);
                      if (u.role === "admin") {
                        setPage("admin");
                      } else if (u.role === "host") {
                        setPage("host");
                      }
                      setModal(null);
                      setToast(
                        u.role === "admin"
                          ? "Welcome, Administrator. Review queue ready."
                          : `Welcome, ${u.name.split(" ")[0]}.`
                      );
                    });
                  }}
                >
                  {modal === "register" && authRole === "user" && (
                    <>
                      <label>
                        Full name
                        <input
                          name="name"
                          minLength={2}
                          required
                          autoComplete="name"
                        />
                      </label>
                      <label>
                        I’m here to
                        <select
                          name="role"
                          value={authMode}
                          onChange={(e) => setAuthMode(e.target.value)}
                        >
                          <option value="driver">Find and book charging</option>
                          <option value="host">Host a charging point</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={authRole === "admin" ? "admin@nxtcharge.com" : "you@example.com"}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      minLength={10}
                      maxLength={128}
                      autoComplete={
                        modal === "login" ? "current-password" : "new-password"
                      }
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="At least 10 characters"
                    />
                  </label>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="button full" disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : authRole === "admin"
                        ? "Sign in as Administrator"
                        : modal === "login"
                          ? "Sign in"
                          : "Create account"}
                    <ArrowRight size={17} />
                  </button>

                  {authRole === "user" && modal === "login" && (
                    <>
                      <div className="auth-or-divider">
                        <span>OR</span>
                      </div>
                      <button
                        type="button"
                        className="button full secondary admin-quick-btn"
                        disabled={busy}
                        onClick={() => {
                          act(async () => {
                            const { user: u } = await api("/auth/login", "POST", {
                              email: "admin@nxtcharge.com",
                              password: "AdminPassword123!",
                            });
                            setUser(u);
                            await refresh(u);
                            setPage("admin");
                            setModal(null);
                            setToast("Signed in as Administrator. Review queue ready.");
                          });
                        }}
                      >
                        <ShieldCheck size={16} /> Sign in as Administrator
                      </button>
                    </>
                  )}
                </form>
                <p className="form-switch">
                  {modal === "login" ? "New to NXTCharge?" : "Already a member?"}{" "}
                  <button
                    onClick={() =>
                      openModal(modal === "login" ? "register" : "login", authRole)
                    }
                  >
                    {modal === "login" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </>
            )}
            {modal === "vehicle" && (
              <>
                <span className="modal-icon">
                  <Car size={25} />
                </span>
                <h2>Add your electric vehicle</h2>
                <p>Use the vehicle’s AC charging specification.</p>
                <form
                  onSubmit={(e) => {
                    const d = formData(e);
                    act(async () => {
                      await api("/vehicles", "POST", {
                        ...d,
                        max_kw: Number(d.max_kw),
                      });
                      await refresh();
                      setModal(null);
                      setToast("Vehicle added to your garage.");
                    });
                  }}
                >
                  <label>
                    Vehicle name
                    <input
                      name="name"
                      required
                      minLength={2}
                      placeholder="e.g. Tata Nexon EV"
                    />
                  </label>
                  <label>
                    Connector
                    <select name="connector">
                      <option>Type 2</option>
                      <option>CCS2</option>
                      <option>Bharat AC</option>
                    </select>
                  </label>
                  <label>
                    Maximum charging power (kW)
                    <input
                      name="max_kw"
                      type="number"
                      min="0.1"
                      max="350"
                      step="0.1"
                      defaultValue="7.2"
                      required
                    />
                  </label>
                  {error && <p className="error">{error}</p>}
                  <button disabled={busy} className="button full">
                    Save vehicle
                  </button>
                </form>
              </>
            )}
            {modal === "charger" && (
              <>
                <span className="modal-icon">
                  <Plug size={25} />
                </span>
                <h2>Welcome a new charging spot.</h2>
                <p>Your listing will be reviewed before becoming public.</p>
                <form
                  onSubmit={(e) => {
                    const d = formData(e);
                    act(async () => {
                      await api("/host/chargers", "POST", {
                        ...d,
                        lat: Number(d.lat),
                        lng: Number(d.lng),
                        kw: Number(d.kw),
                        price: Math.round(Number(d.price) * 100),
                        open_hour: Number(d.open_hour),
                        close_hour: Number(d.close_hour),
                        solar: d.solar === "on",
                      });
                      await refresh();
                      setModal(null);
                      setToast("Charging point submitted for review.");
                    });
                  }}
                >
                  <label>
                    Charging point name
                    <input
                      name="name"
                      minLength={3}
                      required
                      placeholder="e.g. The Garden Garage"
                    />
                  </label>
                  <label>
                    Neighborhood
                    <input
                      name="area"
                      minLength={3}
                      required
                      placeholder="Indiranagar, Bengaluru"
                    />
                  </label>
                  <label>
                    Private street address
                    <input name="address" minLength={8} required />
                    <small>
                      Only shared with drivers with active reservations.
                    </small>
                  </label>
                  <button className="button secondary" type="button" onClick={event => {
                    const form = event.currentTarget.form;
                    if (!navigator.geolocation) { setError("Enter the charger coordinates manually."); return; }
                    navigator.geolocation.getCurrentPosition(({ coords }) => {
                      if (!form) return;
                      (form.elements.namedItem("lat") as HTMLInputElement).value = coords.latitude.toFixed(6);
                      (form.elements.namedItem("lng") as HTMLInputElement).value = coords.longitude.toFixed(6);
                      setError(""); setToast("Coordinates filled. Confirm this is your charger location.");
                    }, () => setError("Location unavailable. Enter the coordinates manually."), { enableHighAccuracy: true, timeout: 12000 });
                  }}><MapPin size={16} />Use my position at the charger</button>
                  <div className="form-grid">
                    <label>
                      Latitude
                      <input
                        name="lat"
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        required
                        placeholder="Latitude of your charger"
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        name="lng"
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        required
                        placeholder="Longitude of your charger"
                      />
                    </label>
                    <label>
                      Connector
                      <select name="connector">
                        <option>Type 2</option>
                        <option>CCS2</option>
                        <option>Bharat AC</option>
                      </select>
                    </label>
                    <label>
                      Power (kW)
                      <input
                        name="kw"
                        type="number"
                        min="0.1"
                        max="350"
                        step="0.1"
                        defaultValue="7.4"
                        required
                      />
                    </label>
                    <label>
                      Price (₹/kWh)
                      <input
                        name="price"
                        type="number"
                        min="1"
                        max="100"
                        step="0.01"
                        defaultValue="9"
                        required
                      />
                    </label>
                    <label className="checkbox">
                      <input name="solar" type="checkbox" />
                      <span>Rooftop solar installed</span>
                    </label>
                    <label>
                      Opening hour · IST
                      <input
                        name="open_hour"
                        type="number"
                        min="0"
                        max="22"
                        defaultValue="8"
                        required
                      />
                    </label>
                    <label>
                      Closing hour · IST
                      <input
                        name="close_hour"
                        type="number"
                        min="1"
                        max="23"
                        defaultValue="20"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Arrival instructions
                    <textarea
                      name="instructions"
                      maxLength={500}
                      placeholder="Parking, access and cable information"
                    />
                  </label>
                  {error && <p className="error">{error}</p>}
                  <button disabled={busy} className="button full">
                    Submit for review <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}
            {selected && (
              <>
                <span className="modal-icon">
                  <Plug size={25} />
                </span>
                <div className="eyebrow">YOUR NEIGHBORHOOD CHARGING SPOT</div>
                <h2>{selected.name}</h2>
                <p>
                  <MapPin size={14} /> {selected.area}
                </p>
                <div className="reservation-specs">
                  <span>
                    {selected.kw} kW · {selected.connector}
                  </span>
                  <strong>{money(selected.price)}/kWh</strong>
                </div>
                {selected.solar === 1 && (
                  <p className="solar-note">
                    <Sun size={17} /> Host-reported solar. Session solar share
                    is not verified.
                  </p>
                )}
                {vehicles.filter((v) => v.connector === selected.connector)
                  .length === 0 ? (
                  <>
                    <p>
                      Add a vehicle with a compatible {selected.connector}{" "}
                      connector to reserve this charger.
                    </p>
                    <button
                      className="button full"
                      onClick={() => {
                        setSelected(null);
                        openModal("vehicle");
                      }}
                    >
                      Add compatible vehicle
                    </button>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      const d = formData(e);
                      act(async () => {
                        await api("/bookings", "POST", {
                          charger_id: selected.id,
                          vehicle_id: d.vehicle_id,
                          start_at: new Date(
                            d.start_at + ":00+05:30",
                          ).toISOString(),
                          end_at: new Date(
                            d.end_at + ":00+05:30",
                          ).toISOString(),
                        });
                        await refresh();
                        setSelected(null);
                        setPage("bookings");
                        setToast("Your charging spot is reserved.");
                      });
                    }}
                  >
                    <label>
                      Your vehicle
                      <select
                        name="vehicle_id"
                        value={compatibleVehicle?.id || ""}
                        onChange={(e) => setChosenVehicle(e.target.value)}
                      >
                        {vehicles
                          .filter((v) => v.connector === selected.connector)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} · {v.max_kw} kW
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Arrival · India Standard Time
                      <input
                        name="start_at"
                        type="datetime-local"
                        value={arrival}
                        onChange={(e) => setArrival(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Departure · India Standard Time
                      <input
                        name="end_at"
                        type="datetime-local"
                        value={departure}
                        onChange={(e) => setDeparture(e.target.value)}
                        required
                      />
                    </label>
                    <p className="muted">
                      Available daily {selected.open_hour}:00–
                      {selected.close_hour}:00 IST. Reserve 30 minutes to 8
                      hours, up to 30 days ahead.
                    </p>
                    {slotError && <p className="error">{slotError}</p>}
                    {slots.length > 0 && (
                      <div className="reserved-slots group-head">
                        <strong>Already reserved</strong>
                        {slots.slice(0, 8).map((s, i) => (
                          <small key={i}>
                            {date(s.start_at)} → {date(s.end_at)} IST
                          </small>
                        ))}
                      </div>
                    )}
                    <div className="info-panel compact">
                      <strong>
                        {estimatedKwh > 0
                          ? `Estimated maximum: ${money(estimatedKwh * selected.price)} · ${estimatedKwh.toFixed(1)} kWh`
                          : "Transparent session pricing"}
                      </strong>
                      <p>
                        Energy × {money(selected.price)}/kWh. Your rate is
                        locked when you book. No payment will be collected in
                        the website.
                      </p>
                    </div>
                    {error && (
                      <p className="error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button full" disabled={busy}>
                      {busy ? "Reserving…" : "Reserve charging spot"}
                      <ArrowRight size={17} />
                    </button>
                    <small className="privacy-note">
                      <ShieldCheck size={13} /> Exact access details are shared
                      after confirmation.
                    </small>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function PageHeading({ eyebrow, title, text, action, actionText }: any) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action && (
        <button className="button" onClick={action}>
          <Plus size={17} />
          {actionText}
        </button>
      )}
    </div>
  );
}
function Empty({ icon: Icon, title, text, action, actionText }: any) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={32} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button" onClick={action}>
          {actionText}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function SignIn({ onClick }: any) {
  return (
    <Empty
      icon={ShieldCheck}
      title="A space of your own"
      text="Sign in to view your account and manage your charging."
      action={onClick}
      actionText="Sign in"
    />
  );
}
function Stat({ icon: Icon, label, value, detail }: any) {
  return (
    <div className="stat tile">
      <div className="stat-label">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
function HostBookings({
  record,
  bookings,
  busy,
  cancel,
}: {
  record: (b: Booking, reading: number, code?: string) => void;
  bookings: Booking[];
  busy: boolean;
  cancel: (id: string) => void;
}) {
  return bookings.length ? (
    <div className="table-wrap card-section">
      <table>
        <thead>
          <tr>
            <th>Driver / location</th>
            <th>Arrival · IST</th>
            <th>Status</th>
            <th>Session value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.driver_name}</strong>
                <small>{b.charger_name}</small>
              </td>
              <td>{date(b.start_at)}</td>
              <td>
                <span className={"status " + b.status}>{b.status}</span>
              </td>
              <td>
                {money(b.cost_paise || 0)}
                <small>{b.source || "Not started"}</small>
              </td>
              <td>
                {["confirmed", "charging"].includes(b.status) && <button className="button small" disabled={busy} onClick={() => {
                  const code = b.status === "confirmed" ? window.prompt("Driver arrival code") : undefined;
                  if (code === null) return;
                  const value = window.prompt("Enter the charger's cumulative meter reading (kWh)");
                  if (value?.trim()) record(b, Number(value), code);
                }}>{b.status === "confirmed" ? "Check in" : "Finish session"}</button>}
                {b.status === "confirmed" && (
                  <button
                    className="button small secondary"
                    disabled={busy}
                    onClick={() => cancel(b.id)}
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      icon={CalendarDays}
      title="Ready for your first reservation"
      text="Confirmed bookings will appear here."
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
