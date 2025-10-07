import { format, toZonedTime } from "date-fns-tz";

// .envからタイムゾーン取得、なければLOCAL_TIMEZONE
const LOCAL_TIMEZONE = import.meta.env.VITE_LOCAL_TIMEZONE || "Asia/Tokyo";

/**
 * 2つの日付が日本時間で同じ日か判定
 */
export function isSameDayJST(
  date1: Date | undefined,
  date2?: Date | undefined
): boolean {
  const srcDate = date1
    ? getJSTDate(date1)
    : getJSTDate(new Date(-8640000000000000)); // 有効な最小値
  const compareDate = date2 ? getJSTDate(date2) : getTodayJST();
  return srcDate === compareDate;
}

export function getTodayJST(): string {
  const now = new Date();
  const jstDate = toZonedTime(now, LOCAL_TIMEZONE);
  return format(jstDate, "yyyy-MM-dd", { timeZone: LOCAL_TIMEZONE });
}

export function getJSTDate(date: Date): string {
  const jstDate = toZonedTime(date, LOCAL_TIMEZONE);
  return format(jstDate, "yyyy-MM-dd", { timeZone: LOCAL_TIMEZONE });
}
