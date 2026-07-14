// dayOfWeek follows JS Date#getDay(): 0 = Sunday ... 6 = Saturday.
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export type DaySchedule = {
  dayOfWeek: DayOfWeek;
  isDayOff: boolean;
  startTime: string;
  endTime: string;
};

const DEFAULT_START = "10:00";
const DEFAULT_END = "19:00";

export function defaultSchedule(): DaySchedule[] {
  return DAYS_OF_WEEK.map((dayOfWeek) => ({
    dayOfWeek,
    isDayOff: dayOfWeek === 0, // Sunday off by default; fully editable
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
  }));
}
