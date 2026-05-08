import type { Editor } from '@tiptap/core'
import { saveCurrentNote } from '../data/repository'
import { markKeydown, markEditorUpdate } from '../perf/inputLatency'
import { debounce } from '../utils/debounce'

type BindOptions = {
  onSaving?: () => void
  onSaved?: () => void
  onError?: () => void
  shouldSave?: () => boolean
}

export function bindEditorEvents(editor: Editor, options: BindOptions = {}) {
  const trackInputStart = () => {
    markKeydown()
  }

  const trackInputUpdate = () => {
    markEditorUpdate()
  }

  const debouncedSave = debounce(async () => {
    if (options.shouldSave && !options.shouldSave()) {
      return
    }

    try {
      options.onSaving?.()
      const content = editor.getJSON()
      const result = await saveCurrentNote(content)
      if (!result.success) {
        throw new Error(result.error?.message ?? 'Save failed')
      }
      options.onSaved?.()
    } catch {
      options.onError?.()
    }
  }, 300)

  // Use 'create' event which fires when content changes start
  editor.on('create', trackInputStart)
  editor.on('update', trackInputUpdate)
  editor.on('update', debouncedSave)

  return () => {
    editor.off('create', trackInputStart)
    editor.off('update', trackInputUpdate)
    editor.off('update', debouncedSave)
  }
}
