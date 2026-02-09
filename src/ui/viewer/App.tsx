import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { LeftSidebar, ViewType } from './components/LeftSidebar';
import { ProjectsView } from './components/ProjectsView';
import { KanbanView } from './components/KanbanView';
import { ClaudeDesktopView } from './components/ClaudeDesktopView';
import { ContextSettingsModal } from './components/ContextSettingsModal';
import { LogsDrawer } from './components/LogsModal';
import { PMOverview } from './components/pm/PMOverview';
import { BugsView } from './components/pm/BugsView';
import { TodosView } from './components/pm/TodosView';
import { IdeasView } from './components/pm/IdeasView';
import { LearningsView } from './components/pm/LearningsView';
import { TagsView } from './components/pm/TagsView';
import { CurrentStateView } from './components/pm/CurrentStateView';
import { ClaudeMdManager } from './components/claudemd/ClaudeMdManager';
import { LoopManager } from './components/loop/LoopManager';
import { TeamDashboard } from './components/teams/TeamDashboard';
import { useSSE } from './hooks/useSSE';
import { useSettings } from './hooks/useSettings';
import { useStats } from './hooks/useStats';
import { usePagination } from './hooks/usePagination';
import { useTheme } from './hooks/useTheme';
import { Observation, Summary, UserPrompt } from './types';

import { mergeAndDeduplicateByProject } from './utils/data';

export function App() {
  const [currentFilter, setCurrentFilter] = useState('');
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [paginatedObservations, setPaginatedObservations] = useState<Observation[]>([]);
  const [paginatedSummaries, setPaginatedSummaries] = useState<Summary[]>([]);
  const [paginatedPrompts, setPaginatedPrompts] = useState<UserPrompt[]>([]);

  // Sidebar + view state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('ub-sidebar-open');
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });
  const [currentView, setCurrentView] = useState<ViewType>('projects');
  const [pmProject, setPmProject] = useState('');

  const { observations, summaries, prompts, projects, isProcessing, queueDepth, isConnected } = useSSE();
  const { settings, saveSettings, isSaving, saveStatus } = useSettings();
  const { stats, refreshStats } = useStats();
  useTheme();
  const pagination = usePagination(currentFilter);

  // Auto-select first project when projects load and no project is selected
  useEffect(() => {
    if (!pmProject && projects.length > 0) {
      setPmProject(projects[0]);
    }
  }, [projects, pmProject]);

  // When filtering by project: ONLY use paginated data (API-filtered)
  // When showing all projects: merge SSE live data with paginated data
  const allObservations = useMemo(() => {
    if (currentFilter) {
      return paginatedObservations;
    }
    return mergeAndDeduplicateByProject(observations, paginatedObservations);
  }, [observations, paginatedObservations, currentFilter]);

  const allSummaries = useMemo(() => {
    if (currentFilter) {
      return paginatedSummaries;
    }
    return mergeAndDeduplicateByProject(summaries, paginatedSummaries);
  }, [summaries, paginatedSummaries, currentFilter]);

  const allPrompts = useMemo(() => {
    if (currentFilter) {
      return paginatedPrompts;
    }
    return mergeAndDeduplicateByProject(prompts, paginatedPrompts);
  }, [prompts, paginatedPrompts, currentFilter]);

  // Toggle context preview modal
  const toggleContextPreview = useCallback(() => {
    setContextPreviewOpen(prev => !prev);
  }, []);

  // Toggle logs modal
  const toggleLogsModal = useCallback(() => {
    setLogsModalOpen(prev => !prev);
  }, []);

  // Handle loading more data
  const handleLoadMore = useCallback(async () => {
    try {
      const [newObservations, newSummaries, newPrompts] = await Promise.all([
        pagination.observations.loadMore(),
        pagination.summaries.loadMore(),
        pagination.prompts.loadMore()
      ]);

      if (newObservations.length > 0) {
        setPaginatedObservations(prev => [...prev, ...newObservations]);
      }
      if (newSummaries.length > 0) {
        setPaginatedSummaries(prev => [...prev, ...newSummaries]);
      }
      if (newPrompts.length > 0) {
        setPaginatedPrompts(prev => [...prev, ...newPrompts]);
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    }
  }, [currentFilter, pagination.observations, pagination.summaries, pagination.prompts]);

  // Reset paginated data and load first page when filter changes
  useEffect(() => {
    setPaginatedObservations([]);
    setPaginatedSummaries([]);
    setPaginatedPrompts([]);
    handleLoadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter]);

  // Handle project card click: set filter and switch to feed
  const handleSelectProject = useCallback((project: string) => {
    setCurrentFilter(project);
    setCurrentView('feed');
  }, []);

  // Handle view change from sidebar
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev: boolean) => !prev);
  }, []);

  // Render current view content
  const renderContent = () => {
    switch (currentView) {
      case 'projects':
        return <ProjectsView onSelectProject={handleSelectProject} />;
      case 'claude-desktop':
        return <ClaudeDesktopView projects={projects} />;
      case 'pm-overview':
        return <PMOverview currentProject={pmProject} projects={projects} onNavigate={handleViewChange} onProjectChange={setPmProject} />;
      case 'pm-bugs':
        return <BugsView currentProject={pmProject} />;
      case 'pm-todos':
        return <TodosView currentProject={pmProject} />;
      case 'pm-ideas':
        return <IdeasView currentProject={pmProject} />;
      case 'pm-learnings':
        return <LearningsView currentProject={pmProject} />;
      case 'pm-tags':
        return <TagsView />;
      case 'kanban':
        return <KanbanView currentProject={pmProject} projects={projects} />;
      case 'current-state':
        return <CurrentStateView currentProject={pmProject} />;
      case 'claude-md':
        return <ClaudeMdManager currentProject={pmProject} projects={projects} onProjectChange={setPmProject} />;
      case 'loop':
        return <LoopManager currentProject={pmProject} projects={projects} onProjectChange={setPmProject} />;
      case 'teams':
        return <TeamDashboard currentProject={pmProject} projects={projects} onProjectChange={setPmProject} />;
      case 'feed':
      default:
        return (
          <Feed
            observations={allObservations}
            summaries={allSummaries}
            prompts={allPrompts}
            onLoadMore={handleLoadMore}
            isLoading={pagination.observations.isLoading || pagination.summaries.isLoading || pagination.prompts.isLoading}
            hasMore={pagination.observations.hasMore || pagination.summaries.hasMore || pagination.prompts.hasMore}
            projects={projects}
            currentFilter={currentFilter}
            onFilterChange={setCurrentFilter}
          />
        );
    }
  };

  return (
    <>
      <LeftSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      <div className={`main-content-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Header
          isConnected={isConnected}
          isProcessing={isProcessing}
          queueDepth={queueDepth}
          onContextPreviewToggle={toggleContextPreview}
        />

        {renderContent()}
      </div>

      <ContextSettingsModal
        isOpen={contextPreviewOpen}
        onClose={toggleContextPreview}
        settings={settings}
        onSave={saveSettings}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />

      <button
        className="console-toggle-btn"
        onClick={toggleLogsModal}
        title="Toggle Terminal"
      >
        <span className="terminal-prefix">&gt;_</span>
        <span>Terminal</span>
        <span className="terminal-cursor"></span>
      </button>

      <LogsDrawer
        isOpen={logsModalOpen}
        onClose={toggleLogsModal}
      />
    </>
  );
}
