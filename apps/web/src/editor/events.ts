import type { Editor } from '@tiptap/core'
import { saveCurrentNote } from '../data/repository'
import { markEditorUpdate } from '../perf/inputLatency'
import { debounce } from '../utils/debounce'

type BindOptions = {
  onSaving?: () => void
  onSaved?: () => void
  onError?: () => void
}

export function bindEditorEvents(editor: Editor, options: BindOptions = {}) {
  const trackInputUpdate = () => {
    markEditorUpdate()
  }

  const debouncedSave = debounce(async () => {
    try {
      options.onSaving?.()
      const content = editor.getJSON()
      await saveCurrentNote(content)
      options.onSaved?.()
    } catch {
      options.onError?.()
    }
  }, 300)

  editor.on('update', trackInputUpdate)
  editor.on('update', debouncedSave)

  return () => {
    editor.off('update', trackInputUpdate)
    editor.off('update', debouncedSave)
  }
}
