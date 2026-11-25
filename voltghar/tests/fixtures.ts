import { randomUUID } from "node:crypto";
import { one, run, transaction } from "../server/db.ts";
import { hashPassword } from "../server/domain.ts";
if (process.env.NODE_ENV === "production")
  throw new Error("Fixtures are disabled in production.");
if(process.env.DATABASE_PATH !== "./data/browser-test.db") throw new Error("Fixtures require the isolated browser-test database.");
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 10)
  throw new Error("Set SEED_PASSWORD (at least 10 characters).");
transaction(() => {
  for (const role of ["driver", "host", "admin"]) {
    const email = `${role}@voltghar.local`;
    if (!one("SELECT id FROM users WHERE email=?", email))
      run(
        "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
        randomUUID(),
        role === "driver"
          ? "Aarav Sharma"
          : role === "host"
            ? "Meera Kapoor"
            : "Network Admin",
        email,
        hashPassword(password),
        role,
      );
  }
  const host = one("SELECT id FROM users WHERE role='host' LIMIT 1"),
    driver = one("SELECT id FROM users WHERE role='driver' LIMIT 1");
  if (!one("SELECT id FROM vehicles WHERE user_id=?", driver.id))
    run(
      "INSERT INTO vehicles VALUES(?,?,?,?,?)",
      randomUUID(),
      driver.id,
      "Tata Nexon EV",
      "Type 2",
      7.2,
    );
  const items = [
    ["The Green Courtyard", "Indiranagar", 12.97, 77.64, 7.4, 900, 1, 6, 23],
    ["Sunlit Garden Garage", "Koramangala", 12.94, 77.62, 7.4, 800, 1, 6, 23],
    ["Neighborhood Plug", "HSR Layout", 12.91, 77.65, 11, 1100, 0, 6, 23],
    ["The Solar Porch", "Jayanagar", 12.93, 77.58, 7.4, 850, 1, 8, 20],
    ["Park & Power", "Whitefield", 12.97, 77.75, 22, 1400, 0, 7, 22],
    ["Canopy Charge", "JP Nagar", 12.9, 77.59, 3.3, 700, 1, 7, 21],
  ];
  for (const [name, area, lat, lng, kw, price, solar, open, close] of items) {
    if (!one("SELECT id FROM chargers WHERE name=?", name))
      run(
        "INSERT INTO chargers(id,host_id,name,area,address,lat,lng,connector,kw,price,solar,open_hour,close_hour,instructions,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        randomUUID(),
        host.id,
        name,
        area,
        "Sample address — fixture only, not a real charging location",
        lat,
        lng,
        "Type 2",
        kw,
        price,
        solar,
        open,
        close,
        "Sample listing. Use the virtual charger to test the reservation flow.",
        "approved",
      );
  }
});
console.log(
  "Local fixtures ready. Accounts: driver@voltghar.local, host@voltghar.local, admin@voltghar.local. Password: your SEED_PASSWORD.",
);
