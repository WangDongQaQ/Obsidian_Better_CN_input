import { describe, expect, it } from "vitest";
import { birthdaysOn, dateFromDailyNotePath } from "../src/birthdays";

const ics = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "SUMMARY:佳颖的生日",
  "DTSTART;VALUE=DATE:19980705",
  "RRULE:FREQ=YEARLY",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:Alex's birthday",
  "DTSTART;VALUE=DATE:19900705",
  "RRULE:FREQ=YEARLY",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:普通会议",
  "DTSTART;VALUE=DATE:20260705",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\n");

describe("birthday calendar", () => {
  it("finds birthday names for the selected date", () => {
    expect(birthdaysOn(ics, { year: 2026, month: 7, day: 5 })).toEqual([
      "佳颖",
      "Alex",
    ]);
  });

  it("uses the daily note date from the file path", () => {
    expect(
      dateFromDailyNotePath("这是日记/2026-07-05.md", new Date("2020-01-01")),
    ).toEqual({
      year: 2026,
      month: 7,
      day: 5,
    });
  });
});
