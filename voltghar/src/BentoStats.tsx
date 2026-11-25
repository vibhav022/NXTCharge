import { Zap, MapPin, Activity, TrendingUp } from "lucide-react";
import stations from "./stations.json";

const cityCount = new Set(stations.map(({ city }) => city)).size;
const availability = 68;

export default function BentoStats() {
  return (
    <section className="home-stats" aria-label="Charging directory statistics">
      <article className="stat-card">
        <div className="stat-card-head">
          <span className="stat-card-label">
            <Zap size={14} className="stat-icon stat-icon--amber" /> Stations
          </span>
          <span className="stat-chip stat-chip--live">
            <span className="live-dot" /> Live Hubs
          </span>
        </div>
        <div className="stat-card-body">
          <strong className="stat-number">{stations.length}</strong>
          <div className="stat-meta-pills">
            <span className="meta-subtag">72 Fast DC</span>
            <span className="meta-subtag-dot">·</span>
            <span className="meta-subtag">30 Type-2 AC</span>
          </div>
          <p className="stat-desc">Mapped public fast chargers across India</p>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-card-head">
          <span className="stat-card-label">
            <MapPin size={14} className="stat-icon stat-icon--blue" /> Coverage
          </span>
          <span className="stat-chip stat-chip--gray">Pan-India</span>
        </div>
        <div className="stat-card-body">
          <strong className="stat-number">{cityCount}</strong>
          <div className="stat-meta-pills">
            <span className="meta-subtag">24 States</span>
            <span className="meta-subtag-dot">·</span>
            <span className="meta-subtag">Expressways</span>
          </div>
          <p className="stat-desc">Major cities & highway corridors connected</p>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-card-head">
          <span className="stat-card-label">
            <Activity size={14} className="stat-icon stat-icon--emerald" /> Availability
          </span>
          <span className="stat-chip stat-chip--emerald">Real-time</span>
        </div>
        <div className="stat-card-body stat-card-body--center">
          <div className="stat-ring-container">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="33" className="stat-ring-track" />
              <circle
                cx="40"
                cy="40"
                r="33"
                pathLength="100"
                strokeDasharray={`${availability} 100`}
                transform="rotate(-90 40 40)"
                className="stat-ring-fill"
              />
            </svg>
            <strong className="stat-ring-val">{availability}%</strong>
          </div>
          <p className="stat-desc">Ports ready for instant plug-in</p>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-card-head">
          <span className="stat-card-label">
            <TrendingUp size={14} className="stat-icon stat-icon--emerald" /> Velocity
          </span>
          <span className="stat-chip stat-chip--growth">↑ 24%</span>
        </div>
        <div className="stat-card-body">
          <div className="stat-chart-container">
            <svg viewBox="0 0 150 48" aria-hidden="true" className="stat-sparkline">
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon points="2,42 24,34 45,37 68,23 90,26 112,14 130,17 148,4 148,46 2,46" fill="url(#sparkGradient)" />
              <polyline points="2,42 24,34 45,37 68,23 90,26 112,14 130,17 148,4" />
            </svg>
          </div>
          <p className="stat-desc">Weekly charging session surge</p>
        </div>
      </article>
    </section>
  );
}
