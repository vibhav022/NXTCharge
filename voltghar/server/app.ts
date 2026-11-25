import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { randomUUID, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { one, all, run, transaction } from "./db.ts";
import {
  ensure,
  AppError,
  hashPassword,
  verifyPassword,
  digest,
  validateWindow,
  calculateEnergy,
} from "./domain.ts";
export const app = express();
const production = process.env.NODE_ENV === "production";
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://fonts.googleapis.com",
            ],
          },
        }
      : false,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use("/api", (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const allowed = process.env.APP_ORIGIN || "http://localhost:5173";
    if (origin && origin !== allowed)
      return res.status(403).json({ error: "Request origin is not allowed." });
    if (req.get("x-voltghar") !== "1")
      return res
        .status(403)
        .json({ error: "Missing request protection header." });
  }
  next();
});
app.use((req: any, _res, next) => {
  const token = req.cookies.vg_session;
  if (token)
    req.user = one(
      "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
      digest(token),
      Date.now(),
    );
  next();
});
const auth = (req: any, _res: any, next: any) => {
  try {
    ensure(req.user, 401, "Sign in to continue.");
    next();
  } catch (e) {
    next(e);
  }
};
const role =
  (...roles: string[]) =>
  (req: any, _res: any, next: any) => {
    try {
      ensure(req.user, 401, "Sign in to continue.");
      ensure(
        roles.includes(req.user.role),
        403,
        "This action is not available to your account.",
      );
      next();
    } catch (e) {
      next(e);
    }
  };
const audit = (user: string, action: string, target: string) =>
  run(
    "INSERT INTO audit(id,actor_id,action,target_id) VALUES(?,?,?,?)",
    randomUUID(),
    user,
    action,
    target,
  );
const notify = (user: string, message: string) =>
  run(
    "INSERT INTO notifications(id,user_id,message) VALUES(?,?,?)",
    randomUUID(),
    user,
    message,
  );
const credentials = z.object({
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(10).max(128),
});
const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 30 });
function login(res: any, user: any) {
  const token = randomBytes(32).toString("hex");
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    digest(token),
    user.id,
    Date.now() + 7 * 86400000,
  );
  res.cookie("vg_session", token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 7 * 86400000,
    path: "/",
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
app.use("/api",(req,res,next)=>{
  if(!["GET","HEAD","OPTIONS"].includes(req.method)) res.once("finish",()=>{
    if(res.statusCode<300) for(const send of changes) send();
  });
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    metering: "host_entered",
    payments: "unconfigured",
  }),
);
app.get("/api/me", (req: any, res) => res.json({ user: req.user || null }));
app.post("/api/auth/register", authLimit, (req, res) => {
  const body = credentials
    .extend({
      name: z.string().trim().min(2).max(80),
      role: z.enum(["driver", "host"]),
    })
    .parse(req.body);
  ensure(
    !one("SELECT id FROM users WHERE email=?", body.email),
    409,
    "An account with this email already exists.",
  );
  const id = randomUUID();
  run(
    "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
    id,
    body.name,
    body.email,
    hashPassword(body.password),
    body.role,
  );
  res.status(201).json({ user: login(res, { id, ...body }) });
});
app.post("/api/auth/login", authLimit, (req, res) => {
  const body = credentials.parse(req.body);
  const user = one("SELECT * FROM users WHERE email=?", body.email);
  const dummy = "a".repeat(32) + ":" + "0".repeat(128);
  const valid = verifyPassword(body.password, user?.password || dummy);
  ensure(user && valid, 401, "Email or password is incorrect.");
  res.json({ user: login(res, user) });
});
app.post("/api/auth/logout", (req, res) => {
  if (req.cookies.vg_session)
    run("DELETE FROM sessions WHERE token=?", digest(req.cookies.vg_session));
  res.clearCookie("vg_session", { path: "/" }).json({ ok: true });
});
app.get("/api/chargers", (_req, res) =>
  res.json(
    all(
      `SELECT c.id,c.name,c.area,c.connector,c.kw,c.price,c.solar,c.open_hour,c.close_hour,round(c.lat,2) lat,round(c.lng,2) lng,u.name host_name FROM chargers c JOIN users u ON u.id=c.host_id WHERE c.status='approved' AND c.enabled=1`,
    ),
  ),
);
app.get("/api/chargers/:id/slots", (req, res) =>
  res.json(
    all(
      "SELECT start_at,end_at FROM bookings WHERE charger_id=? AND status IN ('confirmed','charging') AND end_at>?",
      req.params.id,
      new Date().toISOString(),
    ),
  ),
);
app.get("/api/vehicles", auth, (req: any, res) =>
  res.json(all("SELECT * FROM vehicles WHERE user_id=?", req.user.id)),
);
app.post("/api/vehicles", auth, (req: any, res) => {
  const b = z
    .object({
      name: z.string().trim().min(2).max(80),
      connector: z.enum(["Type 2", "CCS2", "Bharat AC"]),
      max_kw: z.number().positive().max(350),
    })
    .parse(req.body);
  const id = randomUUID();
  run(
    "INSERT INTO vehicles VALUES(?,?,?,?,?)",
    id,
    req.user.id,
    b.name,
    b.connector,
    b.max_kw,
  );
  res.status(201).json({ id, ...b });
});
app.get("/api/bookings", auth, (req: any, res) =>
  res.json(
    all(
      `SELECT b.*,c.name charger_name,c.area,c.kw,c.connector,c.open_hour,c.close_hour,v.name vehicle_name,v.max_kw,s.id session_id,s.started_at,s.ended_at,s.energy_kwh,s.cost_paise,s.source,CASE WHEN b.status IN ('confirmed','charging') THEN c.address ELSE NULL END address,CASE WHEN b.status IN ('confirmed','charging') THEN c.instructions ELSE NULL END instructions FROM bookings b JOIN chargers c ON c.id=b.charger_id JOIN vehicles v ON v.id=b.vehicle_id LEFT JOIN charging_sessions s ON s.booking_id=b.id WHERE b.user_id=? ORDER BY b.start_at DESC`,
      req.user.id,
    ).map(({ access_hash, ...b }) => b),
  ),
);
app.post("/api/bookings", auth, (req: any, res) => {
  const b = z
    .object({
      charger_id: z.string(),
      vehicle_id: z.string(),
      start_at: z.iso.datetime({ offset: true }),
      end_at: z.iso.datetime({ offset: true }),
    })
    .parse(req.body);
  const result = transaction(() => {
    const c = one(
      "SELECT * FROM chargers WHERE id=? AND status='approved' AND enabled=1",
      b.charger_id,
    );
    ensure(c, 404, "Charger is unavailable.");
    ensure(
      c.host_id !== req.user.id,
      400,
      "You cannot reserve your own charger.",
    );
    const v = one(
      "SELECT * FROM vehicles WHERE id=? AND user_id=?",
      b.vehicle_id,
      req.user.id,
    );
    ensure(v, 400, "Select your vehicle.");
    ensure(
      v.connector === c.connector,
      400,
      "This charger does not match your vehicle connector.",
    );
    const start = new Date(b.start_at).toISOString(),
      end = new Date(b.end_at).toISOString();
    validateWindow(start, end, c.open_hour, c.close_hour);
    ensure(
      !one(
        "SELECT id FROM bookings WHERE charger_id=? AND status IN ('confirmed','charging') AND start_at<? AND end_at>?",
        c.id,
        end,
        start,
      ),
      409,
      "That time overlaps another reservation.",
    );
    const id = randomUUID(),
      code = String(randomInt(100000, 1000000));
    run(
      "INSERT INTO bookings(id,user_id,charger_id,vehicle_id,start_at,end_at,rate,access_hash,access_code) VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      req.user.id,
      c.id,
      v.id,
      start,
      end,
      c.price,
      digest(code),
      code,
    );
    notify(c.host_id, `New reservation at ${c.name}.`);
    notify(req.user.id, `Your reservation at ${c.name} is confirmed.`);
    audit(req.user.id, "booking.created", id);
    return { id, access_code: code };
  });
  res.status(201).json(result);
});
app.post("/api/bookings/:id/cancel", auth, (req: any, res) => {
  transaction(() => {
    const b = one(
      "SELECT b.*,c.host_id FROM bookings b JOIN chargers c ON c.id=b.charger_id WHERE b.id=?",
      req.params.id,
    );
    ensure(b, 404, "Booking not found.");
    ensure(
      [b.user_id, b.host_id].includes(req.user.id) || req.user.role === "admin",
      403,
      "This reservation belongs to another user.",
    );
    ensure(
      b.status === "confirmed",
      409,
      "Only confirmed bookings can be cancelled.",
    );
    run("UPDATE bookings SET status='cancelled' WHERE id=?", b.id);
    notify(
      b.user_id,
      "Your reservation was cancelled. No payment was collected.",
    );
    notify(b.host_id, "A reservation was cancelled.");
    audit(req.user.id, "booking.cancelled", b.id);
  });
  res.json({ ok: true });
});
const changes = new Set<() => void>();
app.get("/api/updates", (req,res) => {
  res.set({"Content-Type":"text/event-stream","Cache-Control":"no-cache","X-Accel-Buffering":"no"});
  res.flushHeaders();
  const send = () => res.write("data: refresh\n\n");
  changes.add(send);
  const heartbeat = setInterval(() => res.write(": alive\n\n"), 25000);
  req.on("close", () => { clearInterval(heartbeat); changes.delete(send); });
});
app.post("/api/host/bookings/:id/:action",role("host","admin"),authLimit,(req:any,res)=>{
  const reading = z.number().finite().min(0).max(1e9).parse(req.body.reading);
  transaction(()=>{
    const b=one("SELECT b.* FROM bookings b JOIN chargers c ON c.id=b.charger_id WHERE b.id=? AND c.host_id=?",req.params.id,req.user.id);
    ensure(b,404,"Reservation not found.");
    const now=new Date().toISOString();
    if(req.params.action==="start"){
      ensure(b.status==="confirmed" && b.start_at<=now && now<b.end_at,409,"Check in during the reserved time.");
      ensure(!one("SELECT id FROM bookings WHERE charger_id=? AND status='charging'",b.charger_id),409,"Another session is active.");
      ensure(digest(z.string().regex(/^\d{6}$/).parse(req.body.code))===b.access_hash,403,"Incorrect driver arrival code.");
      run("INSERT INTO charging_sessions(id,booking_id,started_at,source) VALUES(?,?,?,'metered')",randomUUID(),b.id,now);
      run("INSERT INTO meter_log(booking_id,opening) VALUES(?,?)",b.id,reading);
      run("UPDATE bookings SET status='charging' WHERE id=?",b.id);
    }else{
      ensure(req.params.action==="finish",404,"Unknown action.");
      ensure(b.status==="charging",409,"Session is not active.");
      const meter=one("SELECT opening FROM meter_log WHERE booking_id=?",b.id);
      ensure(meter && reading>=meter.opening,400,"Closing reading must equal or exceed opening reading.");
      const energy=reading-meter.opening;
      run("UPDATE meter_log SET closing=? WHERE booking_id=?",reading,b.id);
      run("UPDATE charging_sessions SET ended_at=?,energy_kwh=?,cost_paise=? WHERE booking_id=?",now,energy,Math.round(energy*b.rate),b.id);
      run("UPDATE bookings SET status='completed' WHERE id=?",b.id);
    }
    notify(b.user_id,req.params.action==="start"?"Host recorded your arrival.":"Your session statement is available.");
    audit(req.user.id,"meter."+req.params.action,b.id);
  });
  res.json({ok:true});
});
const chargerInput = z
  .object({
    name: z.string().trim().min(3).max(100),
    area: z.string().trim().min(3).max(100),
    address: z.string().trim().min(8).max(300),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    connector: z.enum(["Type 2", "CCS2", "Bharat AC"]),
    kw: z.number().positive().max(350),
    price: z.number().int().min(100).max(10000),
    solar: z.boolean(),
    open_hour: z.number().int().min(0).max(22),
    close_hour: z.number().int().min(1).max(23),
    instructions: z.string().max(500),
  })
  .refine(
    (b) => b.close_hour > b.open_hour,
    "Closing time must follow opening time.",
  );
app.get("/api/host/chargers", role("host", "admin"), (req: any, res) =>
  res.json(
    all(
      "SELECT * FROM chargers WHERE host_id=? ORDER BY created_at DESC",
      req.user.id,
    ),
  ),
);
app.post("/api/host/chargers", role("host", "admin"), (req: any, res) => {
  const b = chargerInput.parse(req.body),
    id = randomUUID();
  run(
    "INSERT INTO chargers(id,host_id,name,area,address,lat,lng,connector,kw,price,solar,open_hour,close_hour,instructions) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    id,
    req.user.id,
    b.name,
    b.area,
    b.address,
    b.lat,
    b.lng,
    b.connector,
    b.kw,
    b.price,
    Number(b.solar),
    b.open_hour,
    b.close_hour,
    b.instructions,
  );
  audit(req.user.id, "charger.submitted", id);
  res.status(201).json({ id });
});
app.patch("/api/host/chargers/:id", role("host", "admin"), (req: any, res) => {
  const b = z.object({ enabled: z.boolean() }).parse(req.body);
  ensure(
    one(
      "SELECT id FROM chargers WHERE id=? AND host_id=?",
      req.params.id,
      req.user.id,
    ),
    404,
    "Charger not found.",
  );
  run(
    "UPDATE chargers SET enabled=? WHERE id=?",
    Number(b.enabled),
    req.params.id,
  );
  audit(req.user.id, "charger.availability_changed", req.params.id);
  res.json({ ok: true });
});
app.get("/api/host/bookings", role("host", "admin"), (req: any, res) =>
  res.json(
    all(
      "SELECT b.id,b.start_at,b.end_at,b.status,c.name charger_name,u.name driver_name,s.energy_kwh,s.cost_paise,s.source FROM bookings b JOIN chargers c ON c.id=b.charger_id JOIN users u ON u.id=b.user_id LEFT JOIN charging_sessions s ON s.booking_id=b.id WHERE c.host_id=? ORDER BY b.start_at DESC",
      req.user.id,
    ),
  ),
);
app.get("/api/admin/chargers", role("admin"), (_req, res) =>
  res.json(
    all(
      "SELECT c.*,u.name host_name FROM chargers c JOIN users u ON u.id=c.host_id ORDER BY c.created_at DESC",
    ),
  ),
);
app.post("/api/admin/chargers/:id/review", role("admin"), (req: any, res) => {
  const { status } = z
    .object({ status: z.enum(["approved", "rejected"]) })
    .parse(req.body);
  const c = one("SELECT * FROM chargers WHERE id=?", req.params.id);
  ensure(c, 404, "Charger not found.");
  run("UPDATE chargers SET status=? WHERE id=?", status, c.id);
  audit(req.user.id, `charger.${status}`, c.id);
  notify(c.host_id, `${c.name} was ${status}.`);
  res.json({ ok: true });
});
app.get("/api/admin/audit", role("admin"), (_req, res) =>
  res.json(
    all(
      "SELECT a.*,u.name actor_name FROM audit a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100",
    ),
  ),
);
app.get("/api/notifications", auth, (req: any, res) =>
  res.json(
    all(
      "SELECT id,message,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
      req.user.id,
    ),
  ),
);
app.get("/api/impact", auth, (req: any, res) => {
  const rows = all(
    "SELECT s.* FROM charging_sessions s JOIN bookings b ON b.id=s.booking_id WHERE b.user_id=?",
    req.user.id,
  );
  res.json({
    sessions: rows.length,
    simulated_kwh: rows
      .filter((r) => r.source === "simulated")
      .reduce((a, r) => a + r.energy_kwh, 0),
    metered_kwh: rows
      .filter((r) => r.source === "metered")
      .reduce((a, r) => a + r.energy_kwh, 0),
    verified_solar_kwh: null,
    avoided_emissions_kg: null,
  });
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API endpoint not found." }),
);
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({ error: err.issues[0].message });
  if (String(err.message).includes("slot_conflict"))
    return res.status(409).json({ error: "That slot has just been reserved." });
  if (!(err instanceof AppError)) console.error(err);
  res
    .status(err instanceof AppError ? err.status : 500)
    .json({
      error:
        err instanceof AppError
          ? err.message
          : "An unexpected error occurred. Please try again.",
    });
});
