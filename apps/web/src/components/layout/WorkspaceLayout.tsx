import React from 'react';

interface WorkspaceLayoutProps {
  sidebar: React.ReactNode;
  noteList: React.ReactNode;
  editor: React.ReactNode;
  contextPanel?: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  sidebar,
  noteList,
  editor,
  contextPanel
}) => {
  return (
    <div className="h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[var(--sidebar-width)] bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col">
        {sidebar}
      </aside>

      {/* Note List */}
      <section className="w-[var(--notelist-width)] border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col">
        {noteList}
      </section>

      {/* Editor + Context Panel */}
      <main className="flex-1 flex bg-[var(--bg-tertiary)] overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[var(--editor-max-width)] mx-auto px-[var(--editor-padding-x)] py-[var(--editor-padding-y)]">
            {editor}
          </div>
        </div>
        
        {contextPanel && (
          <aside className="w-[var(--contextpanel-width)] border-l border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-5 overflow-auto">
            {contextPanel}
          </aside>
        )}
      </main>
    </div>
  );
};
