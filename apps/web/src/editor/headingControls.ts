import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

type HeadingMenuState = {
  collapsed: Set<number>
}

const headingControlsKey = new PluginKey<HeadingMenuState>('headingControls')

const headingLabels = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题']

function closeMenu() {
  document.querySelector('.minddock-heading-menu')?.remove()
}

function isHeadingNode(nodeName: string) {
  return nodeName === 'heading'
}

export const HeadingControls = Extension.create({
  name: 'headingControls',

  addProseMirrorPlugins() {
    return [
      new Plugin<HeadingMenuState>({
        key: headingControlsKey,
        state: {
          init: () => ({ collapsed: new Set() }),
          apply(transaction, previous) {
            const mapped = new Set<number>()
            previous.collapsed.forEach((pos) => {
              const mappedPos = transaction.mapping.map(pos, -1)
              const node = transaction.doc.nodeAt(mappedPos)

              if (node && isHeadingNode(node.type.name)) {
                mapped.add(mappedPos)
              }
            })

            const meta = transaction.getMeta(headingControlsKey) as
              | { type: 'toggle'; pos: number }
              | { type: 'expand'; pos: number }
              | { type: 'expandAll' }
              | undefined

            if (!meta) {
              return { collapsed: mapped }
            }

            if (meta.type === 'expandAll') {
              return { collapsed: new Set() }
            }

            if (meta.type === 'toggle') {
              if (mapped.has(meta.pos)) {
                mapped.delete(meta.pos)
              } else {
                mapped.add(meta.pos)
              }
            }

            if (meta.type === 'expand') {
              mapped.delete(meta.pos)
            }

            return { collapsed: mapped }
          },
        },
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            const pluginState = headingControlsKey.getState(state)
            const collapsed = pluginState?.collapsed ?? new Set<number>()
            let hiddenUntilLevel = 0

            state.doc.descendants((node, pos) => {
              if (isHeadingNode(node.type.name)) {
                const level = node.attrs.level as number

                if (hiddenUntilLevel && level <= hiddenUntilLevel) {
                  hiddenUntilLevel = 0
                }

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const button = document.createElement('button')
                      button.type = 'button'
                      button.className = 'minddock-heading-trigger'
                      button.dataset.headingPos = String(pos)
                      button.setAttribute('aria-label', '标题设置')
                      button.setAttribute('contenteditable', 'false')
                      button.innerHTML =
                        '<span></span><span></span><span></span><strong>' + level + '</strong>'
                      return button
                    },
                    { side: -1, key: `heading-control-${pos}` },
                  ),
                )

                if (collapsed.has(pos)) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: 'minddock-heading-collapsed',
                    }),
                  )
                  hiddenUntilLevel = level
                  return false
                }

                return true
              }

              if (hiddenUntilLevel && node.isBlock) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: 'minddock-block-hidden',
                  }),
                )
              }

              return true
            })

            return DecorationSet.create(state.doc, decorations)
          },
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement | null
              const trigger = target?.closest('.minddock-heading-trigger') as HTMLButtonElement | null

              if (!trigger) {
                if (!target?.closest('.minddock-heading-menu')) {
                  closeMenu()
                }
                return false
              }

              event.preventDefault()
              event.stopPropagation()
              closeMenu()

              const pos = Number(trigger.dataset.headingPos)
              const node = view.state.doc.nodeAt(pos)

              if (!node || !isHeadingNode(node.type.name)) {
                return true
              }

              const currentLevel = node.attrs.level as number
              const menu = document.createElement('div')
              const collapsed = headingControlsKey.getState(view.state)?.collapsed.has(pos)

              menu.className = 'minddock-heading-menu'
              menu.setAttribute('contenteditable', 'false')
              menu.innerHTML = `
                <div class="minddock-heading-menu__group">
                  ${headingLabels
                    .map(
                      (label, index) => `
                        <button type="button" data-level="${index + 1}">
                          <span>${currentLevel === index + 1 ? '✓' : ''}</span>
                          <strong>${label}</strong>
                          <kbd>⌘ ${index + 1}</kbd>
                        </button>
                      `,
                    )
                    .join('')}
                </div>
                <div class="minddock-heading-menu__group">
                  <button type="button" data-action="toggle">
                    <span></span><strong>${collapsed ? '展开' : '折叠'}</strong>
                  </button>
                  <button type="button" data-action="expand-all">
                    <span></span><strong>展开所有标题</strong>
                  </button>
                </div>
                <div class="minddock-heading-menu__group">
                  <button type="button" data-action="copy-link">
                    <span></span><strong>拷贝笔记标题链接</strong>
                  </button>
                </div>
              `

              const rect = trigger.getBoundingClientRect()
              menu.style.left = `${Math.min(rect.left, window.innerWidth - 390)}px`
              menu.style.top = `${rect.bottom + 8}px`

              menu.addEventListener('click', (menuEvent) => {
                const menuTarget = menuEvent.target as HTMLElement | null
                const item = menuTarget?.closest('button') as HTMLButtonElement | null

                if (!item) {
                  return
                }

                const level = item.dataset.level
                const action = item.dataset.action

                if (level) {
                  view.dispatch(
                    view.state.tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      level: Number(level),
                    }),
                  )
                }

                if (action === 'toggle') {
                  view.dispatch(view.state.tr.setMeta(headingControlsKey, { type: 'toggle', pos }))
                }

                if (action === 'expand-all') {
                  view.dispatch(view.state.tr.setMeta(headingControlsKey, { type: 'expandAll' }))
                }

                if (action === 'copy-link') {
                  void navigator.clipboard?.writeText(`${window.location.href}#heading-${pos}`)
                }

                view.focus()
                closeMenu()
              })

              document.body.appendChild(menu)
              return true
            },
            keydown: (_view, event) => {
              if (event.key === 'Escape') {
                closeMenu()
              }

              return false
            },
          },
        },
        view() {
          return {
            destroy: closeMenu,
          }
        },
      }),
    ]
  },
})
