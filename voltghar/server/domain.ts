import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(hash, "hex"),
  );
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new AppError(status, message);
}
export function validateWindow(
  start: string,
  end: string,
  open: number,
  close: number,
  now = Date.now(),
) {
  const s = new Date(start),
    e = new Date(end);
  const duration = e.getTime() - s.getTime();
  ensure(
    Number.isFinite(s.getTime()) && Number.isFinite(e.getTime()),
    400,
    "Choose valid dates.",
  );
  ensure(
    s.getTime() >= now - 60000 && s.getTime() < now + 30 * 86400000,
    400,
    "Book within the next 30 days.",
  );
  ensure(
    duration >= 30 * 60000 && duration <= 8 * 3600000,
    400,
    "Reserve between 30 minutes and 8 hours.",
  );
  const localS = new Date(s.getTime() + 330 * 60000),
    localE = new Date(e.getTime() + 330 * 60000);
  ensure(
    localS.toISOString().slice(0, 10) === localE.toISOString().slice(0, 10),
    400,
    "A booking must finish on the same local date.",
  );
  const sh = localS.getUTCHours() + localS.getUTCMinutes() / 60,
    eh = localE.getUTCHours() + localE.getUTCMinutes() / 60;
  ensure(
    sh >= open && eh <= close,
    400,
    `This charger is available ${open}:00–${close}:00 IST.`,
  );
}
export function calculateEnergy(
  startedAt: string,
  endAt: string,
  power: number,
  now = Date.now(),
) {
  return (
    (Math.max(0, Math.min(now, Date.parse(endAt)) - Date.parse(startedAt)) /
      3600000) *
    power
  );
}
