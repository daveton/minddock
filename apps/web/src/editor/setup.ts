import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

export function createEditor(element: HTMLElement) {
  return new Editor({
    element,
    extensions: [StarterKit],
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
