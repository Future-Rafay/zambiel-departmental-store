export function zurichDateToUtc(date: string, minute: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || minute < 0 || minute >= 24 * 60) throw new Error("INVALID_LOCAL_TIME");
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Math.floor(minute / 60), minute % 60);
  let result = new Date(target);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Zurich",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(result).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    result = new Date(result.getTime() + target - represented);
  }

  return result;
}

export function formatZurichDateTimeLocal(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
