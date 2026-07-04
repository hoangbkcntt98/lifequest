export function getTodayInTokyoDateOnly() {
  const now = new Date();

  const tokyoDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${tokyoDateString}T00:00:00.000Z`);
}

export function getDateOnlyInTokyo(date: Date) {
  const tokyoDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return new Date(`${tokyoDateString}T00:00:00.000Z`);
}