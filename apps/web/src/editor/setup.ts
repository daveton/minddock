import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { HeadingControls } from './headingControls'
import { Tag } from './tag'
import { TaskItem } from './taskItem'

export function createEditor(element: HTMLElement) {
  return new Editor({
    element,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }), TaskItem, Tag, HeadingControls],
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
