import { useMemo } from "react";
import { DAY_LABELS, productName, type DayCount, type ProductStat, type QuizSession } from "./types";

interface MatchBracket {
  label: string;
  min: number;
  max: number;
  color: string;
  count: number;
}

/**
 * Derives every chart / KPI value the dashboard renders from the raw
 * sessions list. All branches are memoised so an unrelated render
 * (e.g. opening the filter panel) doesn't recompute the lot.
 */
export const useDashboardMetrics = (filteredSessions: QuizSession[]) => {
  const total = filteredSessions.length;

  const kpis = useMemo(() => {
    const uniqueEmails = new Set(filteredSessions.map((s) => s.email.toLowerCase())).size;
    const avgMatch = total
      ? Math.round(filteredSessions.reduce((sum, s) => sum + s.match_percent, 0) / total)
      : 0;
    const todaySessions = filteredSessions.filter(
      (s) => new Date(s.created_at).toDateString() === new Date().toDateString(),
    ).length;
    return { uniqueEmails, avgMatch, todaySessions };
  }, [filteredSessions, total]);

  const productStats = useMemo<ProductStat[]>(() => {
    const counts: Record<string, number> = {};
    const matchSums: Record<string, number> = {};
    const names: Record<string, string> = {}; // sessions arrive newest first: the first name seen is the latest
    filteredSessions.forEach((s) => {
      if (!names[s.matched_product_id] && s.product_name?.trim()) names[s.matched_product_id] = s.product_name.trim();
      counts[s.matched_product_id] = (counts[s.matched_product_id] ?? 0) + 1;
      matchSums[s.matched_product_id] = (matchSums[s.matched_product_id] ?? 0) + s.match_percent;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        id,
        name: names[id] ?? productName(id),
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
        avgMatch: Math.round((matchSums[id] ?? 0) / count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions, total]);

  const extras = useMemo(() => {
    const emailSentCount = filteredSessions.filter((s) => s.email_sent === true).length;
    const emailDeliveryRate = total ? Math.round((emailSentCount / total) * 100) : 0;
    const codesGenerated = filteredSessions.filter((s) => s.discount_code != null).length;
    const codesUsed = filteredSessions.filter((s) => s.code_redeemed === true).length;

    const hourlyCounts: number[] = Array.from({ length: 24 }, (_, h) =>
      filteredSessions.filter((s) => new Date(s.created_at).getHours() === h).length,
    );
    const maxHourly = Math.max(...hourlyCounts, 1);
    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));

    const matchBrackets: MatchBracket[] = [
      { label: "45–60%", min: 45, max: 60, color: "bg-blue-500" },
      { label: "61–75%", min: 61, max: 75, color: "bg-yellow-500" },
      { label: "76–90%", min: 76, max: 90, color: "bg-orange-500" },
      { label: "91–98%", min: 91, max: 98, color: "bg-green-500" },
    ].map((b) => ({
      ...b,
      count: filteredSessions.filter((s) => s.match_percent >= b.min && s.match_percent <= b.max).length,
    }));
    const maxBracket = Math.max(...matchBrackets.map((b) => b.count), 1);

    const emailFreq: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      emailFreq[s.email.toLowerCase()] = (emailFreq[s.email.toLowerCase()] ?? 0) + 1;
    });
    const returningCount = Object.values(emailFreq).filter((n) => n > 1).length;

    // The 7-day chart always shows real days regardless of the active
    // filter — the comment in the UI tells the user why.
    const dayCounts: DayCount[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const date = d.toISOString().slice(0, 10);
      return {
        day: DAY_LABELS[d.getDay()],
        date,
        count: filteredSessions.filter((s) => s.created_at.slice(0, 10) === date).length,
      };
    });
    const maxDay = Math.max(...dayCounts.map((d) => d.count), 1);

    return {
      emailSentCount, emailDeliveryRate,
      codesGenerated, codesUsed,
      hourlyCounts, peakHour, maxHourly,
      matchBrackets, maxBracket,
      returningCount,
      dayCounts, maxDay,
    };
  }, [filteredSessions, total]);

  return { total, ...kpis, productStats, ...extras };
};
