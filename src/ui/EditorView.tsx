import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { bindEditorEvents } from '../editor/events'
import { createEditor } from '../editor/setup'
import { ensureDefaultNote } from '../data/repository'

export default function EditorView() {
  const editorRef = useRef<Editor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const saveBadgeRef = useRef<HTMLSpanElement>(null)
  const networkBadgeRef = useRef<HTMLSpanElement>(null)
  const updatedAtRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const editor = createEditor(containerRef.current)
    editorRef.current = editor

    const setStatus = (label: string, tone: 'idle' | 'live' | 'error') => {
      if (!saveBadgeRef.current) {
        return
      }

      saveBadgeRef.current.textContent = label
      saveBadgeRef.current.dataset.tone = tone
    }

    const updateTimestamp = () => {
      if (!updatedAtRef.current) {
        return
      }

      updatedAtRef.current.textContent = `Last local write ${new Date().toLocaleTimeString()}`
    }

    const unbind = bindEditorEvents(editor, {
      onSaving: () => setStatus('Saving locally', 'live'),
      onSaved: () => {
        setStatus('Saved', 'idle')
        updateTimestamp()
      },
      onError: () => setStatus('Save failed', 'error'),
    })

    const init = async () => {
      const note = await ensureDefaultNote()
      editor.commands.setContent(note.content)
      updateTimestamp()
    }

    const syncNetworkState = () => {
      if (!networkBadgeRef.current) {
        return
      }

      const online = window.navigator.onLine
      networkBadgeRef.current.textContent = online ? 'Offline-first / online' : 'Offline editing'
      networkBadgeRef.current.dataset.tone = online ? 'idle' : 'live'
    }

    void init()
    syncNetworkState()

    window.addEventListener('online', syncNetworkState)
    window.addEventListener('offline', syncNetworkState)

    return () => {
      window.removeEventListener('online', syncNetworkState)
      window.removeEventListener('offline', syncNetworkState)
      unbind()
      editor.destroy()
    }
  }, [])

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">MindDock</p>
          <h1>Local-first writing, without friction.</h1>
          <p className="lede">
            A minimal editor shell built to prove one thing first: the writing
            path stays fast, local, and recoverable.
          </p>
        </div>

        <div className="principles-card">
          <p className="section-label">Core constraints</p>
          <ul>
            <li>Input p95 under 16ms</li>
            <li>No network work on the typing path</li>
            <li>IndexedDB as the reliable local layer</li>
            <li>Save feedback must stay visible</li>
          </ul>
        </div>

        <div className="roadmap-card">
          <p className="section-label">Phase focus</p>
          <ol>
            <li>Editor + local persistence</li>
            <li>Tags + search off the hot path</li>
            <li>Sync as an enhancement layer</li>
          </ol>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="section-label">Minimal runnable skeleton</p>
            <h2>Zero re-render editor surface</h2>
          </div>

          <div className="status-row">
            <span ref={saveBadgeRef} className="status-pill" data-tone="idle">
              Saved
            </span>
            <span ref={networkBadgeRef} className="status-pill" data-tone="idle">
              Offline-first / online
            </span>
          </div>
        </header>

        <section className="editor-card">
          <div className="note-meta">
            <p className="note-title">note-1</p>
            <p ref={updatedAtRef} className="note-updated">
              Last local write --
            </p>
          </div>
          <div ref={containerRef} className="editor-host" />
        </section>
      </main>
    </div>
  )
}
