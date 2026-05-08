import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { bindEditorEvents } from '../editor/events'
import { createEditor } from '../editor/setup'
import {
  createNote,
  ensureDefaultNote,
  listNotes,
  loadNote,
  saveNoteById,
  setCurrentNote,
} from '../data/repository'
import type { NoteSummary } from '../data/memory'
import {
  exportInputLatencySamples,
  getInputLatencyStats,
  markKeydown,
  resetInputLatencySamples,
} from '../perf/inputLatency'

export default function EditorView() {
  const editorRef = useRef<Editor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const saveBadgeRef = useRef<HTMLSpanElement>(null)
  const networkBadgeRef = useRef<HTMLSpanElement>(null)
  const updatedAtRef = useRef<HTMLParagraphElement>(null)
  const activeNoteIdRef = useRef<string>('note-1')
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [activeNoteId, setActiveNoteId] = useState('note-1')
  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null)

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

    const refreshNotes = async (nextActiveId?: string) => {
      const allNotes = await listNotes()
      setNotes(allNotes)

      if (nextActiveId) {
        activeNoteIdRef.current = nextActiveId
        setActiveNoteId(nextActiveId)
      }
    }

    const unbind = bindEditorEvents(editor, {
      onSaving: () => {
        setSaveErrorDetail(null)
        setStatus('Saving locally', 'live')
      },
      onSaved: async () => {
        setSaveErrorDetail(null)
        setStatus('Saved', 'idle')
        updateTimestamp()
        await refreshNotes(activeNoteIdRef.current)
      },
      onError: () => {
        setStatus('Save failed', 'error')
        setSaveErrorDetail(
          'Latest changes are still in memory, but the last local write did not complete.',
        )
      },
    })

    const init = async () => {
      const note = await ensureDefaultNote()
      activeNoteIdRef.current = note.id
      setActiveNoteId(note.id)
      editor.commands.setContent(note.content)
      updateTimestamp()
      await refreshNotes(note.id)
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

    const trackInputKeydown = (event: KeyboardEvent) => {
      const target = event.target as Element | null
      if (!target || !containerRef.current?.contains(target)) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.length !== 1 && event.key !== 'Backspace' && event.key !== 'Enter') {
        return
      }

      markKeydown()
    }

    window.addEventListener('online', syncNetworkState)
    window.addEventListener('offline', syncNetworkState)
    window.addEventListener('keydown', trackInputKeydown, { capture: true })

    return () => {
      window.removeEventListener('online', syncNetworkState)
      window.removeEventListener('offline', syncNetworkState)
      window.removeEventListener('keydown', trackInputKeydown, true)
      unbind()
      editor.destroy()
    }
  }, [])

  const handlePrintInputPerf = () => {
    const stats = getInputLatencyStats()
    console.table(stats)
    console.log('input_latency_samples', exportInputLatencySamples())
  }

  const handleResetInputPerf = () => {
    resetInputLatencySamples()
    console.info('input_latency_samples reset')
  }

  const flushActiveNote = async () => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const noteId = activeNoteIdRef.current
    await saveNoteById(noteId, editor.getJSON())
  }

  const handleCreateNote = async () => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    try {
      if (activeNoteIdRef.current) {
        await flushActiveNote()
      }

      const note = await createNote()
      setCurrentNote(note.id)
      activeNoteIdRef.current = note.id
      setActiveNoteId(note.id)
      setSaveErrorDetail(null)
      editor.commands.setContent(note.content)
      if (updatedAtRef.current) {
        updatedAtRef.current.textContent = `Last local write ${new Date(
          note.updatedAt,
        ).toLocaleTimeString()}`
      }
      setNotes(await listNotes())
    } catch {
      if (saveBadgeRef.current) {
        saveBadgeRef.current.textContent = 'Save failed'
        saveBadgeRef.current.dataset.tone = 'error'
      }
      setSaveErrorDetail(
        'The current note could not be written locally before creating a new note.',
      )
    }
  }

  const handleSwitchNote = async (noteId: string) => {
    const editor = editorRef.current
    if (!editor || noteId === activeNoteIdRef.current) {
      return
    }

    try {
      if (saveBadgeRef.current) {
        saveBadgeRef.current.textContent = 'Saving before switch'
        saveBadgeRef.current.dataset.tone = 'live'
      }

      await flushActiveNote()
      const nextNote = await loadNote(noteId)
      if (!nextNote) {
        setSaveErrorDetail('The selected note could not be loaded from local storage.')
        return
      }

      setCurrentNote(noteId)
      activeNoteIdRef.current = noteId
      setActiveNoteId(noteId)
      setSaveErrorDetail(null)
      editor.commands.setContent(nextNote.content)

      if (updatedAtRef.current) {
        updatedAtRef.current.textContent = `Last local write ${new Date(
          nextNote.updatedAt,
        ).toLocaleTimeString()}`
      }

      if (saveBadgeRef.current) {
        saveBadgeRef.current.textContent = 'Saved'
        saveBadgeRef.current.dataset.tone = 'idle'
      }
      setNotes(await listNotes())
    } catch {
      if (saveBadgeRef.current) {
        saveBadgeRef.current.textContent = 'Save failed'
        saveBadgeRef.current.dataset.tone = 'error'
      }
      setSaveErrorDetail(
        'Switch was stopped because the current note could not be written locally.',
      )
    }
  }

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

        <div className="notes-card">
          <div className="notes-card-header">
            <p className="section-label">Notes</p>
            <button type="button" className="note-action" onClick={handleCreateNote}>
              New
            </button>
          </div>
          <div className="notes-list">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                className="note-row"
                data-active={note.id === activeNoteId}
                onClick={() => {
                  void handleSwitchNote(note.id)
                }}
              >
                <span>{note.id}</span>
                <span>{new Date(note.updatedAt).toLocaleTimeString()}</span>
              </button>
            ))}
          </div>
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
            <p className="note-title">{activeNoteId}</p>
            <button type="button" className="note-action" onClick={handlePrintInputPerf}>
              Print input perf
            </button>
            <button type="button" className="note-action" onClick={handleResetInputPerf}>
              Reset input perf
            </button>
            <p ref={updatedAtRef} className="note-updated">
              Last local write --
            </p>
          </div>
          {saveErrorDetail ? (
            <div className="inline-alert" role="status" aria-live="polite">
              {saveErrorDetail}
            </div>
          ) : null}
          <div ref={containerRef} className="editor-host" />
        </section>
      </main>
    </div>
  )
}
