import React, { useState, useEffect } from 'react';
import { ProjectFilter } from '../shared/ProjectFilter';

interface TeamMember {
  name: string;
  agentId: string;
  agentType: string;
}

interface Team {
  name: string;
  members: TeamMember[];
  taskCount: number;
  completedTasks: number;
}

interface TeamDashboardProps {
  currentProject: string;
  projects: string[];
  onProjectChange: (project: string) => void;
}

function formatPercent(completed: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((completed / total) * 100)}%`;
}

const AGENT_TYPE_COLORS: Record<string, string> = {
  lead: '#f59e0b',
  worker: '#6366f1',
  reviewer: '#10b981',
  researcher: '#ec4899',
};

export function TeamDashboard({ currentProject, projects, onProjectChange }: TeamDashboardProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/teams')
      .then(r => {
        if (!r.ok) throw new Error('Teams API not available');
        return r.json();
      })
      .then((data: any) => setTeams(data.teams || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading teams...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 600 }}>
          Agent Teams
        </h2>
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          opacity: 0.5,
          fontSize: '0.9rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          Could not load teams data. The Teams API may not be configured yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Agent Teams
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '8px' }}>
            ({teams.length})
          </span>
        </h2>
        <ProjectFilter value={currentProject} onChange={onProjectChange} projects={projects} />
      </div>

      {teams.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #333)',
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '8px' }}>
            No agent teams found
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.4 }}>
            Teams appear when Claude Code Agent Teams are used. Team configs are stored in ~/.claude/teams/
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {teams.map(team => {
            const isExpanded = expandedTeam === team.name;
            const progressPct = team.taskCount > 0
              ? (team.completedTasks / team.taskCount) * 100
              : 0;

            return (
              <div
                key={team.name}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #333)',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedTeam(isExpanded ? null : team.name)}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: team.taskCount > 0 && team.completedTasks < team.taskCount
                      ? '#f59e0b'
                      : team.completedTasks === team.taskCount && team.taskCount > 0
                        ? '#10b981'
                        : '#64748b',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>
                    {team.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    {team.completedTasks}/{team.taskCount} tasks
                  </span>
                </div>

                {/* Progress bar */}
                {team.taskCount > 0 && (
                  <div style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: 'var(--border-color, #333)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        borderRadius: '2px',
                        background: progressPct === 100 ? '#10b981' : '#6366f1',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, minWidth: '28px', textAlign: 'right' }}>
                      {formatPercent(team.completedTasks, team.taskCount)}
                    </span>
                  </div>
                )}

                {/* Expanded: member list */}
                {isExpanded && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color, #333)',
                  }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '8px' }}>
                      Members
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {team.members.map(member => (
                        <div
                          key={member.agentId || member.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #333)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: AGENT_TYPE_COLORS[member.agentType] || '#6366f1',
                            flexShrink: 0,
                          }} />
                          <span style={{ flex: 1, fontWeight: 500 }}>
                            {member.name}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: AGENT_TYPE_COLORS[member.agentType] || '#6366f1',
                            color: '#fff',
                            opacity: 0.8,
                          }}>
                            {member.agentType || 'agent'}
                          </span>
                          {member.agentId && (
                            <span style={{ fontSize: '0.65rem', opacity: 0.3, fontFamily: 'monospace' }}>
                              {member.agentId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {team.members.length === 0 && (
                      <div style={{ fontSize: '0.8rem', opacity: 0.4, padding: '4px 0' }}>
                        No members configured
                      </div>
                    )}
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
