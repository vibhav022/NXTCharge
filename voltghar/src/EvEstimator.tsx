import { useState } from "react";
import { BatteryCharging, Clock, IndianRupee, Leaf, Zap } from "lucide-react";

const EV_PRESETS = [
  { id: "nexon", name: "Tata Nexon EV", battery: 40.5, maxDc: 50, efficiency: 135 },
  { id: "punch", name: "Tata Punch EV", battery: 35.0, maxDc: 50, efficiency: 125 },
  { id: "mgzs", name: "MG ZS EV", battery: 50.3, maxDc: 80, efficiency: 140 },
  { id: "xuv400", name: "Mahindra XUV400", battery: 39.4, maxDc: 50, efficiency: 130 },
  { id: "byd", name: "BYD Atto 3", battery: 60.5, maxDc: 80, efficiency: 145 },
  { id: "ioniq5", name: "Hyundai Ioniq 5", battery: 72.6, maxDc: 150, efficiency: 155 },
];

export default function EvEstimator({ onFindFastHubs }: { onFindFastHubs: () => void }) {
  const [selectedEv, setSelectedEv] = useState(EV_PRESETS[0]);
  const [startPct, setStartPct] = useState(20);
  const [targetPct, setTargetPct] = useState(80);
  const [chargerType, setChargerType] = useState<"dc" | "ac">("dc");

  // Calculations
  const deltaPct = Math.max(0, targetPct - startPct);
  const energyKwh = (selectedEv.battery * deltaPct) / 100;

  // Effective charging speed
  const chargingSpeedKw =
    chargerType === "dc"
      ? Math.min(selectedEv.maxDc, 60) * 0.88 // taper factor
      : 7.2;

  const chargeTimeMinutes = Math.max(5, Math.round((energyKwh / chargingSpeedKw) * 60));
  const rangeAddedKm = Math.round((energyKwh * 1000) / selectedEv.efficiency);
  const estimatedCostInr = Math.round(energyKwh * (chargerType === "dc" ? 16.5 : 12.0));
  const co2SavedKg = Math.round(rangeAddedKm * 0.138);

  return (
    <section className="estimator-section" aria-label="EV Range and Charge Estimator">
      <div className="estimator-card">
        <div className="estimator-head">
          <div className="estimator-title-group">
            <span className="estimator-badge">
              <Zap size={13} className="sparkle-icon" /> SMART EV CALCULATOR
            </span>
            <h2>Live Charge & Range Estimator</h2>
            <p>Calculate charging duration, added range, and cost for Indian EV models</p>
          </div>
          <div className="ev-selector-wrapper" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label htmlFor="ev-select" style={{ fontSize: "13px", fontWeight: 700, color: "#09090B", fontFamily: "var(--font-display)" }}>
              Select your EV
            </label>
            <select
              id="ev-select"
              value={selectedEv.id}
              onChange={(e) => {
                const found = EV_PRESETS.find((v) => v.id === e.target.value);
                if (found) setSelectedEv(found);
              }}
              className="ev-select-dropdown"
            >
              {EV_PRESETS.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.battery} kWh)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="estimator-body">
          {/* Controls Column */}
          <div className="estimator-controls">
            <div className="control-group">
              <div className="control-label-row">
                <span>Start Battery: <strong>{startPct}%</strong></span>
                <span>Target: <strong>{targetPct}%</strong></span>
              </div>
              <div className="dual-slider-track">
                <input
                  type="range"
                  min="5"
                  max={targetPct - 5}
                  value={startPct}
                  onChange={(e) => setStartPct(Number(e.target.value))}
                  className="ev-slider start-slider"
                  aria-label="Starting battery percentage"
                />
                <input
                  type="range"
                  min={startPct + 5}
                  max="100"
                  value={targetPct}
                  onChange={(e) => setTargetPct(Number(e.target.value))}
                  className="ev-slider target-slider"
                  aria-label="Target battery percentage"
                />
              </div>
              <div className="quick-presets-row">
                <button
                  type="button"
                  className={startPct === 20 && targetPct === 80 ? "preset-btn active" : "preset-btn"}
                  onClick={() => {
                    setStartPct(20);
                    setTargetPct(80);
                  }}
                >
                  <Zap size={13} />
                  <span>Fast Top-up (20% → 80%)</span>
                </button>
                <button
                  type="button"
                  className={startPct === 10 && targetPct === 100 ? "preset-btn active" : "preset-btn"}
                  onClick={() => {
                    setStartPct(10);
                    setTargetPct(100);
                  }}
                >
                  <BatteryCharging size={13} />
                  <span>Full Highway (10% → 100%)</span>
                </button>
              </div>
            </div>

            <div className="control-group">
              <span className="control-sublabel">Charging Station Output</span>
              <div className="charger-toggle-group">
                <button
                  type="button"
                  className={chargerType === "dc" ? "toggle-btn active" : "toggle-btn"}
                  onClick={() => setChargerType("dc")}
                >
                  <Zap size={15} />
                  <span>DC Fast Charger (60 kW)</span>
                </button>
                <button
                  type="button"
                  className={chargerType === "ac" ? "toggle-btn active" : "toggle-btn"}
                  onClick={() => setChargerType("ac")}
                >
                  <BatteryCharging size={15} />
                  <span>Home/Host AC (7.4 kW)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="estimator-metrics-grid">
            <div className="metric-box metric-box--highlight">
              <div className="metric-box-head">
                <Clock size={16} className="metric-box-icon" />
                <span>Time to {targetPct}%</span>
              </div>
              <strong className="metric-box-value">
                {chargeTimeMinutes >= 60
                  ? `${Math.floor(chargeTimeMinutes / 60)}h ${chargeTimeMinutes % 60}m`
                  : `${chargeTimeMinutes} mins`}
              </strong>
              <small className="metric-box-sub">
                {chargerType === "dc" ? "High-speed DC fast lane" : "Standard AC charging"}
              </small>
            </div>

            <div className="metric-box">
              <div className="metric-box-head">
                <Zap size={16} className="metric-box-icon metric-box-icon--lime" />
                <span>Range Added</span>
              </div>
              <strong className="metric-box-value">+{rangeAddedKm} km</strong>
              <small className="metric-box-sub">{energyKwh.toFixed(1)} kWh delivered</small>
            </div>

            <div className="metric-box">
              <div className="metric-box-head">
                <IndianRupee size={16} className="metric-box-icon" />
                <span>Est. Cost</span>
              </div>
              <strong className="metric-box-value">₹{estimatedCostInr}</strong>
              <small className="metric-box-sub">Avg. ₹{chargerType === "dc" ? "16.5" : "12"}/kWh</small>
            </div>

            <div className="metric-box">
              <div className="metric-box-head">
                <Leaf size={16} className="metric-box-icon metric-box-icon--emerald" />
                <span>CO₂ Offset</span>
              </div>
              <strong className="metric-box-value">~{co2SavedKg} kg</strong>
              <small className="metric-box-sub">vs. petrol SUV</small>
            </div>
          </div>
        </div>

        <div className="estimator-footer">
          <div className="estimator-footer-info">
            <span>Vehicle: <strong>{selectedEv.name}</strong> · Max DC input: <strong>{selectedEv.maxDc} kW</strong></span>
          </div>
          <button
            type="button"
            className="find-matching-btn"
            onClick={onFindFastHubs}
          >
            <span>Explore 60kW DC Fast Hubs</span>
            <Zap size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
