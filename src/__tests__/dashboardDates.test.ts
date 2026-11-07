import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardMetrics } from '@/components/stats/useDashboardMetrics';
import type { QuizSession } from '@/components/stats/types';
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
describe('report dates at midnight and daylight-saving boundaries',()=>{
 it('uses UTC for today, hourly buckets and the seven-day chart',()=>{
  vi.stubEnv('TZ','Europe/Rome');vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-07T00:10:00Z'));
  const row={email:'synthetic@example.invalid',matched_product_id:'synthetic',product_name:'Historical name',match_percent:80};
  const rows=[{...row,id:'a',created_at:'2026-11-06T23:55:00Z'},{...row,id:'b',created_at:'2026-11-07T00:05:00Z'}] as QuizSession[];
  const {result}=renderHook(()=>useDashboardMetrics(rows));
  expect(result.current.todaySessions).toBe(1);expect(result.current.hourlyCounts[23]).toBe(1);expect(result.current.hourlyCounts[0]).toBe(1);
  expect(result.current.dayCounts.at(-1)).toMatchObject({date:'2026-11-07',count:1});
  expect(result.current.dayCounts.at(-2)).toMatchObject({date:'2026-11-06',count:1});
  expect(result.current.productStats[0]).toMatchObject({name:'Historical name',count:2,percent:100});
 });
});
