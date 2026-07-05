export interface Birthday {
  name: string;
  month: number;
  day: number;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface IcsEvent {
  summary: string;
  dtstart: string;
  rrule: string;
}

export function birthdaysOn(ics: string, date: CalendarDate): string[] {
  const names = parseBirthdays(ics)
    .filter((birthday) => birthday.month === date.month && birthday.day === date.day)
    .map((birthday) => birthday.name);

  return Array.from(new Set(names)).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

export function dateFromDailyNotePath(path: string, fallback = new Date()): CalendarDate {
  const match = /(?:^|\/)(\d{4})-(\d{2})-(\d{2})(?:\.md)?$/u.exec(path);
  if (!match) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
    };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthdays(ics: string): Birthday[] {
  const events = parseEvents(ics);
  const birthdays: Birthday[] = [];

  for (const event of events) {
    const date = dateFromIcsValue(event.dtstart);
    if (!date || !isBirthdayEvent(event)) {
      continue;
    }

    birthdays.push({
      name: birthdayName(event.summary),
      month: date.month,
      day: date.day,
    });
  }

  return birthdays;
}

function parseEvents(ics: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: IcsEvent | null = null;

  for (const line of unfoldIcs(ics).split(/\r?\n/u)) {
    const { name, value } = parseIcsLine(line);
    if (name === "BEGIN" && value === "VEVENT") {
      current = { summary: "", dtstart: "", rrule: "" };
      continue;
    }

    if (name === "END" && value === "VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    if (name === "SUMMARY") current.summary = decodeIcsText(value);
    if (name === "DTSTART") current.dtstart = value;
    if (name === "RRULE") current.rrule = value;
  }

  return events;
}

function unfoldIcs(ics: string): string {
  return ics.replace(/\r?\n[ \t]/gu, "");
}

function parseIcsLine(line: string): { name: string; value: string } {
  const colon = line.indexOf(":");
  if (colon === -1) return { name: "", value: "" };

  return {
    name: line.slice(0, colon).split(";")[0]?.toUpperCase() ?? "",
    value: line.slice(colon + 1),
  };
}

function dateFromIcsValue(value: string): CalendarDate | null {
  const match = /^(\d{4})(\d{2})(\d{2})/u.exec(value);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function isBirthdayEvent(event: IcsEvent): boolean {
  return /FREQ=YEARLY/iu.test(event.rrule) || /生日|birthday/iu.test(event.summary);
}

function birthdayName(summary: string): string {
  return summary
    .replace(/^\s*Birthday:\s*/iu, "")
    .replace(/\s*(?:的)?生日\s*$/u, "")
    .replace(/\s*(?:'s)?\s*birthday\s*$/iu, "")
    .trim();
}

function decodeIcsText(value: string): string {
  return value
    .replace(/\\n/giu, "\n")
    .replace(/\\,/gu, ",")
    .replace(/\\;/gu, ";")
    .replace(/\\\\/gu, "\\");
}
