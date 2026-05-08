import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export const TaskItem = Node.create({
  name: 'taskItem',

  group: 'block',

  content: 'inline*',

  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-checked') === 'true',
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="taskItem"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'taskItem', class: 'minddock-task-item' }),
      ['span', { class: 'minddock-task-box', contenteditable: 'false' }],
      ['span', { class: 'minddock-task-content' }, 0],
    ]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^-\[( |x|X)\]\s$/,
        handler: ({ chain, range, match }) => {
          const checked = match[1]?.toLowerCase() === 'x'

          chain()
            .deleteRange(range)
            .setNode(this.name, { checked })
            .run()
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick: (view, _pos, event) => {
            const target = event.target as HTMLElement | null

            if (!target?.closest('.minddock-task-box')) {
              return false
            }

            const taskElement = target.closest('.minddock-task-item')

            if (!taskElement) {
              return false
            }

            const taskPos = view.posAtDOM(taskElement, 0)
            const taskNode = view.state.doc.nodeAt(taskPos)

            if (taskNode?.type.name !== this.name) {
              return false
            }

            view.dispatch(
              view.state.tr.setNodeMarkup(taskPos, undefined, {
                ...taskNode.attrs,
                checked: !taskNode.attrs.checked,
              }),
            )

            return true
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor
        const { $from } = state.selection
        const node = $from.parent

        if (node.type.name !== 'paragraph') {
          return false
        }

        const match = node.textContent.match(/^-\[( |x|X)\]$/)

        if (!match) {
          return false
        }

        const checked = match[1]?.toLowerCase() === 'x'
        const start = $from.start()
        const end = $from.end()
        const taskNode = this.type.create({ checked })
        const transaction = state.tr.replaceWith(start - 1, end + 1, taskNode)

        view.dispatch(transaction.scrollIntoView())
        return true
      },
    }
  },
})
