"use client";

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { APP_TIMEZONE } from "@/lib/date-utils";

function label(now: number) {
  const d = new TZDate(now, APP_TIMEZONE);
  return { date: format(d, "EEEE, dd MMMM yyyy"), time: format(d, "hh:mm a") };
}

/** "Tuesday, 06 October 2026  03:14 PM" — ticks every 15 s in the business timezone. */
export function LiveClock({ initial }: { initial: number }) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const { date, time } = label(now);
  return (
    <span className="tabular whitespace-nowrap text-sm font-medium text-foreground/90">
      {date}
      <span className="ml-2">{time}</span>
    </span>
  );
}
