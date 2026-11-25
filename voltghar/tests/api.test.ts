import { test, after } from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_PATH = ":memory:";
process.env.ENABLE_SIMULATOR = "true";
const { app } = await import("../server/app.ts");
const { run, one } = await import("../server/db.ts");
const { hashPassword, calculateEnergy, validateWindow } =
  await import("../server/domain.ts");
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const port = (server.address() as any).port;
after(() => server.close());
const password = "testing-a-secure-password";
async function req(path: string, method = "GET", body?: any, cookie = "") {
  const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Voltghar": "1", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
let driver = "",
  other = "",
  host = "",
  admin = "",
  charger = "",
  vehicle = "",
  booking = "";
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const start = tomorrow + "T10:00:00+05:30",
  end = tomorrow + "T12:00:00+05:30";
test("registration creates accounts but never permits administrator self-registration", async () => {
  let r = await req("/auth/register", "POST", {
    name: "Driver One",
    email: "driver@test.com",
    password,
    role: "driver",
  });
  assert.equal(r.status, 201);
  driver = r.cookie;
  r = await req("/auth/register", "POST", {
    name: "Driver Two",
    email: "other@test.com",
    password,
    role: "driver",
  });
  other = r.cookie;
  r = await req("/auth/register", "POST", {
    name: "Host One",
    email: "host@test.com",
    password,
    role: "host",
  });
  host = r.cookie;
  assert.equal(
    (
      await req("/auth/register", "POST", {
        name: "Evil Admin",
        email: "admin@bad.com",
        password,
        role: "admin",
      })
    ).status,
    400,
  );
  run(
    "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
    "admin",
    "Admin",
    "admin@test.com",
    hashPassword(password),
    "admin",
  );
  admin = (
    await req("/auth/login", "POST", { email: "admin@test.com", password })
  ).cookie;
});
test("unauthenticated and driver accounts cannot access host or admin operations", async () => {
  assert.equal((await req("/host/chargers")).status, 401);
  assert.equal(
    (await req("/admin/chargers", "GET", undefined, driver)).status,
    403,
  );
  assert.equal(
    (await req("/host/chargers", "GET", undefined, driver)).status,
    403,
  );
});
test("new chargers need approval and discovery hides private address and exact coordinates", async () => {
  const r = await req(
    "/host/chargers",
    "POST",
    {
      name: "Garden Charger",
      area: "Test Neighborhood",
      address: "Private house 123, test road",
      lat: 12.971234,
      lng: 77.641234,
      connector: "Type 2",
      kw: 7.4,
      price: 900,
      solar: true,
      open_hour: 6,
      close_hour: 23,
      instructions: "Private gate instructions",
    },
    host,
  );
  assert.equal(r.status, 201);
  charger = r.data.id;
  assert.equal((await req("/chargers")).data.length, 0);
  assert.equal(
    (
      await req(
        `/admin/chargers/${charger}/review`,
        "POST",
        { status: "approved" },
        admin,
      )
    ).status,
    200,
  );
  const publicCharger = (await req("/chargers")).data[0];
  assert.equal(publicCharger.address, undefined);
  assert.equal(publicCharger.instructions, undefined);
  assert.equal(publicCharger.lat, 12.97);
});
test("vehicles are scoped to the current user", async () => {
  const r = await req(
    "/vehicles",
    "POST",
    { name: "Test EV", connector: "Type 2", max_kw: 7.2 },
    driver,
  );
  assert.equal(r.status, 201);
  vehicle = r.data.id;
  assert.equal(
    (await req("/vehicles", "GET", undefined, other)).data.length,
    0,
  );
  assert.equal(
    (
      await req(
        "/bookings",
        "POST",
        {
          charger_id: charger,
          vehicle_id: vehicle,
          start_at: start,
          end_at: end,
        },
        other,
      )
    ).status,
    400,
  );
});
test("simultaneous reservations permit exactly one overlapping booking", async () => {
  const results = await Promise.all([
    req(
      "/bookings",
      "POST",
      {
        charger_id: charger,
        vehicle_id: vehicle,
        start_at: start,
        end_at: end,
      },
      driver,
    ),
    req(
      "/bookings",
      "POST",
      {
        charger_id: charger,
        vehicle_id: vehicle,
        start_at: start,
        end_at: end,
      },
      driver,
    ),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  booking = results.find((r) => r.status === 201)!.data.id;
});
test("booking access details belong to the booker only", async () => {
  const b = (await req("/bookings", "GET", undefined, driver)).data[0];
  assert.equal(b.address, "Private house 123, test road");
  assert.equal(b.access_hash, undefined);
  assert.match(b.access_code, /^\d{6}$/);
  assert.equal(
    (await req("/bookings", "GET", undefined, other)).data.length,
    0,
  );
  assert.equal(
    (await req(`/bookings/${booking}/cancel`, "POST", {}, other)).status,
    403,
  );
  assert.equal(
    (await req("/host/bookings", "GET", undefined, host)).data[0].access_code,
    undefined,
  );
});
test("driver cannot check in and host must respect booked time", async () => {
  assert.equal(
    (
      await req(
        `/host/bookings/${booking}/start`,
        "POST",
        { code: "000000" },
        driver,
      )
    ).status,
    403,
  );
  const b = (await req("/bookings", "GET", undefined, driver)).data[0];
  assert.equal(
    (
      await req(
        `/host/bookings/${booking}/start`,
        "POST",
        { code: b.access_code, reading: 100 },
        host,
      )
    ).status,
    409,
  );
});
test("cancellation frees the slot and cannot be repeated", async () => {
  assert.equal(
    (await req(`/bookings/${booking}/cancel`, "POST", {}, driver)).status,
    200,
  );
  assert.equal(
    (await req(`/bookings/${booking}/cancel`, "POST", {}, driver)).status,
    409,
  );
  const r = await req(
    "/bookings",
    "POST",
    { charger_id: charger, vehicle_id: vehicle, start_at: start, end_at: end },
    driver,
  );
  assert.equal(r.status, 201);
  booking = r.data.id;
});
test("host meter readings and billing persist correctly", async () => {
  run(
    "UPDATE bookings SET start_at=?,end_at=? WHERE id=?",
    new Date(Date.now() - 1000).toISOString(),
    new Date(Date.now() + 3600000).toISOString(),
    booking,
  );
  const code = one(
    "SELECT access_code FROM bookings WHERE id=?",
    booking,
  ).access_code;
  assert.equal(
    (await req(`/host/bookings/${booking}/start`, "POST", { code,reading:100 }, host)).status,
    200,
  );
  assert.equal(
    (await req(`/host/bookings/${booking}/start`, "POST", { code,reading:100 }, host)).status,
    409,
  );
  assert.equal((await req(`/host/bookings/${booking}/finish`,"POST",{reading:99},host)).status,400);
  assert.equal((await req(`/host/bookings/${booking}/finish`,"POST",{reading:103.6},host)).status,200);
  const b=(await req("/bookings","GET",undefined,driver)).data.find((row:any)=>row.id===booking);
  assert.equal(b.status, "completed");
  assert.ok(b.cost_paise >= 3240 && b.cost_paise < 3250);
  const impact = (await req("/impact", "GET", undefined, driver)).data;
  assert.ok(Math.abs(impact.metered_kwh-3.6)<0.001);
  assert.equal(impact.verified_solar_kwh, null);
});
test("schedule respects IST opening hours and duration bounds", () => {
  assert.throws(() =>
    validateWindow(
      tomorrow + "T04:00:00+05:30",
      tomorrow + "T05:00:00+05:30",
      6,
      23,
    ),
  );
  assert.throws(() =>
    validateWindow(start, tomorrow + "T10:10:00+05:30", 6, 23),
  );
  assert.doesNotThrow(() => validateWindow(start, end, 6, 23));
});
test("energy is capped at booking end and never negative", () => {
  assert.equal(
    calculateEnergy(
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
      7,
      Date.parse("2026-01-01T12:00:00Z"),
    ),
    7,
  );
  assert.equal(
    calculateEnergy(
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
      7,
      Date.parse("2026-01-01T09:00:00Z"),
    ),
    0,
  );
});
test("mutation protection rejects cross-origin requests and missing headers", async () => {
  let r = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "X-Voltghar": "1",
      cookie: driver,
    },
  });
  assert.equal(r.status, 403);
  r = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: driver },
  });
  assert.equal(r.status, 403);
});
test("logout invalidates the server-side session", async () => {
  assert.equal((await req("/auth/logout", "POST", {}, driver)).status, 200);
  assert.equal((await req("/bookings", "GET", undefined, driver)).status, 401);
});
