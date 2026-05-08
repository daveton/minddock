import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem } from './taskItem'

export function createEditor(element: HTMLElement) {
  return new Editor({
    element,
    extensions: [StarterKit, TaskItem],
    content: '',
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'minddock-editor',
        spellcheck: 'false',
      },
    },
  })
}
