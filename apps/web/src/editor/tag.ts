import { InputRule, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

const TAG_PATTERN = /(?:^|\s)(#[\p{L}\p{N}_/-]+)\s$/u

export const Tag = Mark.create({
  name: 'tag',

  inclusive: true,

  addAttributes() {
    return {
      path: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-path') ?? '',
        renderHTML: (attributes) => ({
          'data-path': attributes.path,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tag"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'tag',
        class: 'minddock-tag',
      }),
      0,
    ]
  },

  addInputRules() {
    return [
      new InputRule({
        find: TAG_PATTERN,
        handler: ({ state, range, match }) => {
          const rawTag = match[1]
          if (!rawTag) {
            return
          }

          const path = normalizeTagPath(rawTag.slice(1))
          if (!path) {
            return
          }

          const leadingOffset = match[0].startsWith('#') ? 0 : 1
          const tagStart = range.from + leadingOffset
          const tagEnd = tagStart + rawTag.length
          const transaction = state.tr
            .addMark(tagStart, tagEnd, this.type.create({ path }))
            .insertText(' ', range.to, range.to)
            .removeStoredMark(this.type)

          this.editor.view.dispatch(transaction)
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null
          }

          let transaction = newState.tr
          let changed = false

          newState.doc.descendants((node, pos) => {
            if (!node.isText) {
              return true
            }

            const tagMark = node.marks.find((mark) => mark.type === this.type)
            if (!tagMark) {
              return true
            }

            const text = node.text ?? ''
            const path = parseRenderedTag(text)
            const from = pos
            const to = pos + node.nodeSize

            if (!path) {
              transaction = transaction.removeMark(from, to, this.type)
              changed = true
              return true
            }

            if (tagMark.attrs.path !== path) {
              transaction = transaction
                .removeMark(from, to, this.type)
                .addMark(from, to, this.type.create({ path }))
              changed = true
            }

            return true
          })

          return changed ? transaction : null
        },
      }),
    ]
  },
})

function normalizeTagPath(value: string) {
  return value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

function parseRenderedTag(value: string) {
  const text = value.trim()
  if (!text.startsWith('#')) {
    return ''
  }

  return normalizeTagPath(text.slice(1))
}
