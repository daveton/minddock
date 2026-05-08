import { InputRule, Node, mergeAttributes } from '@tiptap/core'

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
