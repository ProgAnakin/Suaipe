import { motion } from "framer-motion";
import type { DayCount } from "../types";

interface SevenDayChartProps {
  dayCounts: DayCount[];
  maxDay: number;
  isFiltered: boolean;
}

export const SevenDayChart = ({ dayCounts, maxDay, isFiltered }: SevenDayChartProps) => (
  <motion.div
    className="rounded-2xl border border-border bg-card p-6 shadow-card"
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
  >
    <h2 className="mb-1 font-bold text-foreground">📅 Last 7 days (UTC)</h2>
    {isFiltered && (
      <p className="mb-4 text-[10px] text-muted-foreground">
        Counts use the current filters; dates and hours are shown in UTC.
      </p>
    )}
    <div className="flex h-28 items-end justify-between gap-2 mt-4">
      {dayCounts.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-bold text-primary">{d.count > 0 ? d.count : ""}</span>
          <div className="w-full rounded-t-lg bg-muted" style={{ height: "80px" }}>
            <motion.div
              className="w-full rounded-t-lg gradient-primary"
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / maxDay) * 80}px` }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ marginTop: `${80 - (d.count / maxDay) * 80}px` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

interface HourlyDistributionProps {
  hourlyCounts: number[];
  maxHourly: number;
  peakHour: number;
}

export const HourlyDistribution = ({ hourlyCounts, maxHourly, peakHour }: HourlyDistributionProps) => (
  <motion.div
    className="rounded-2xl border border-border bg-card p-6 shadow-card"
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
  >
    <h2 className="mb-1 font-bold text-foreground">🕐 Peak hours</h2>
    <p className="mb-4 text-[11px] text-muted-foreground">
      Session distribution by hour of day · peak at <strong className="text-foreground">{peakHour}:00</strong>
    </p>
    <div className="flex h-20 items-end gap-[3px]">
      {hourlyCounts.map((count, h) => (
        <div key={h} className="flex flex-1 flex-col items-center gap-0.5">
          <div className="w-full rounded-t" style={{ height: "64px", position: "relative" }}>
            <motion.div
              className={`absolute bottom-0 w-full rounded-t ${h === peakHour ? "gradient-primary" : "bg-primary/40"}`}
              initial={{ height: 0 }}
              animate={{ height: `${(count / maxHourly) * 64}px` }}
              transition={{ duration: 0.5, delay: 0.33 + h * 0.01 }}
            />
          </div>
          {h % 6 === 0 && <span className="text-[8px] text-muted-foreground">{h}h</span>}
        </div>
      ))}
    </div>
  </motion.div>
);
