import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { HeadingControls } from './headingControls'
import { TableControls } from './tableControls'
import { Tag } from './tag'
import { TaskItem } from './taskItem'

export function createEditor(element: HTMLElement) {
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      TaskItem,
      Tag,
      Table.configure({
        allowTableNodeSelection: true,
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      HeadingControls,
      TableControls,
    ],
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
