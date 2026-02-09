import React, { useState, useEffect, useCallback } from 'react';
import { SessionMetrics } from './SessionMetrics';
import { ToolUsageChart } from './ToolUsageChart';
import { ErrorPatterns } from './ErrorPatterns';
import { ActivityHeatmap } from './ActivityHeatmap';

interface AnalyticsViewProps {
  currentProject: string;
  projects: string[];
  onProjectChange: (project: string) => void;
}

type DateRange = '7' | '30' | '90' | '365';

interface ToolData {
  name: string;
  count: number;
  percentage: number;
}

interface ErrorData {
  type: string;
  count: number;
  trend: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface EfficiencyData {
  totalSessions: number;
  totalObservations: number;
  avgSessionDuration: number;
  avgObservationsPerSession: number;
}

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
];

export function AnalyticsView({ currentProject, projects, onProjectChange }: AnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [loading, setLoading] = useState(true);

  const [tools, setTools] = useState<ToolData[]>([]);
  const [activityDays, setActivityDays] = useState<DailyData[]>([]);
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [errorDaily, setErrorDaily] = useState<DailyData[]>([]);
  const [efficiency, setEfficiency] = useState<EfficiencyData>({
    totalSessions: 0,
    totalObservations: 0,
    avgSessionDuration: 0,
    avgObservationsPerSession: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const projectParam = currentProject ? `project=${encodeURIComponent(currentProject)}&` : '';

    try {
      const [toolRes, activityRes, errorRes, effRes] = await Promise.all([
        fetch(`/api/analytics/tool-usage?${projectParam}days=${dateRange}`),
        fetch(`/api/analytics/activity?${projectParam}days=365`),
        fetch(`/api/analytics/errors?${projectParam}days=${dateRange}`),
        fetch(`/api/analytics/efficiency?${projectParam ? projectParam.slice(0, -1) : ''}`),
      ]);

      const [toolData, actData, errData, effData] = await Promise.all([
        toolRes.json(),
        activityRes.json(),
        errorRes.json(),
        effRes.json(),
      ]);

      setTools(toolData.tools || []);
      setActivityDays(actData.days || []);
      setErrors(errData.errors || []);
      setErrorDaily(errData.daily || []);
      setEfficiency({
        totalSessions: effData.totalSessions || 0,
        totalObservations: effData.totalObservations || 0,
        avgSessionDuration: effData.avgSessionDuration || 0,
        avgObservationsPerSession: effData.avgObservationsPerSession || 0,
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px' }}>
      {/* Header with filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Analytics Dashboard
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Project filter */}
          <select
            value={currentProject}
            onChange={e => onProjectChange(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary, #27272a)',
              color: 'var(--text-primary, #fafafa)',
              border: '1px solid var(--border-primary, #3f3f46)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Date range selector */}
          <div style={{
            display: 'flex',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid var(--border-primary, #3f3f46)',
          }}>
            {rangeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                style={{
                  backgroundColor: dateRange === opt.value
                    ? 'var(--accent, #8b5cf6)'
                    : 'var(--bg-secondary, #27272a)',
                  color: dateRange === opt.value
                    ? '#fff'
                    : 'var(--text-secondary, #a1a1aa)',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  fontWeight: dateRange === opt.value ? 600 : 400,
                  transition: 'background-color 0.15s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
          Loading analytics...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Row 1: Session Metrics */}
          <SessionMetrics
            totalSessions={efficiency.totalSessions}
            totalObservations={efficiency.totalObservations}
            avgSessionDuration={efficiency.avgSessionDuration}
            avgObservationsPerSession={efficiency.avgObservationsPerSession}
          />

          {/* Row 2: Tool Usage + Error Patterns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '16px',
          }}>
            <div style={{
              backgroundColor: 'var(--bg-secondary, #27272a)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--border-primary, #3f3f46)',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text-primary, #fafafa)',
              }}>
                Tool Usage
              </div>
              <ToolUsageChart tools={tools} />
            </div>

            <div style={{
              backgroundColor: 'var(--bg-secondary, #27272a)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--border-primary, #3f3f46)',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--text-primary, #fafafa)',
              }}>
                Error Patterns
              </div>
              <ErrorPatterns errors={errors} daily={errorDaily} />
            </div>
          </div>

          {/* Row 3: Activity Heatmap */}
          <div style={{
            backgroundColor: 'var(--bg-secondary, #27272a)',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid var(--border-primary, #3f3f46)',
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--text-primary, #fafafa)',
            }}>
              Activity (Past Year)
            </div>
            <ActivityHeatmap days={activityDays} />
          </div>
        </div>
      )}
    </div>
  );
}
