import React, { useState, useEffect } from 'react';

interface PlansViewProps {
  currentProject: string;
}

interface PlanItem {
  id: string;
  filename: string;
  title: string;
  path: string;
  source: 'global' | 'project';
  sizeBytes: number;
  lineCount: number;
  modifiedAt: number;
  preview: string;
}

interface PlanDetail extends PlanItem {
  content: string;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatRelative(epoch: number): string {
  const diff = Date.now() - epoch;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(epoch);
}

export function PlansView({ currentProject }: PlansViewProps) {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/plans${qs}`)
      .then(r => r.json())
      .then(data => setPlans(data.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const handleSelectPlan = async (plan: PlanItem) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const resp = await fetch(`/api/plans/${plan.id}`);
      const data = await resp.json();
      setSelectedPlan(data.plan);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading plans...</div>;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Plans
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>({plans.length})</span>
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search plans..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
          background: 'var(--bg-secondary, #1a1a2e)',
          color: 'inherit',
          marginBottom: '1rem',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {plans.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
          {search ? 'No plans match your search.' : 'No plan files found in ~/.claude/plans/'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {plans.map(plan => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <div key={plan.id}>
                <div
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #333)',
                    borderLeft: `3px solid ${isSelected ? '#6366f1' : '#3b82f6'}`,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>
                      {plan.title}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: plan.source === 'project' ? '#1e3a5f' : '#1e2a3f',
                      color: plan.source === 'project' ? '#60a5fa' : '#7a8a9a',
                    }}>
                      {plan.source}
                    </span>
                    <span style={{ opacity: 0.4, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {plan.lineCount}L
                    </span>
                    <span style={{ opacity: 0.4, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {formatRelative(plan.modifiedAt)}
                    </span>
                  </div>

                  {!isSelected && plan.preview && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '0.75rem',
                      opacity: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {plan.preview}
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {isSelected && selectedPlan && (
                  <div style={{
                    marginTop: '2px',
                    padding: '16px',
                    borderRadius: '0 0 8px 8px',
                    border: '1px solid var(--border-color, #333)',
                    borderTop: 'none',
                    backgroundColor: 'var(--bg-secondary, #12121f)',
                    maxHeight: '600px',
                    overflowY: 'auto',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: '12px', paddingBottom: '8px',
                      borderBottom: '1px solid var(--border-color, #333)',
                      fontSize: '0.7rem', opacity: 0.5,
                    }}>
                      <span>{selectedPlan.path}</span>
                      <span style={{ marginLeft: 'auto' }}>{formatDate(selectedPlan.modifiedAt)}</span>
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      wordBreak: 'break-word',
                    }}>
                      {selectedPlan.content}
                    </div>
                  </div>
                )}

                {isSelected && loadingDetail && (
                  <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    Loading plan...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
