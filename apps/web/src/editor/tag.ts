import { InputRule, Mark, mergeAttributes } from '@tiptap/core'

const TAG_PATTERN = /(?:^|\s)(#[\p{L}\p{N}_/-]+)\s$/u

export const Tag = Mark.create({
  name: 'tag',

  inclusive: false,

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
})

function normalizeTagPath(value: string) {
  return value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}
