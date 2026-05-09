import { Extension } from '@tiptap/core'
import { Plugin, Selection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  findTable,
  moveTableColumn,
  moveTableRow,
  selectedRect,
} from '@tiptap/pm/tables'

type CellTarget = {
  cell: HTMLTableCellElement
  pos: number
}

type TableContext = {
  rowIndex: number
  columnIndex: number
  rowCount: number
  columnCount: number
}

export const TableControls = Extension.create({
  name: 'tableControls',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view: (view) => new TableControlsView(view),
      }),
    ]
  },
})

class TableControlsView {
  private button: HTMLButtonElement
  private menu: HTMLDivElement
  private activeTarget: CellTarget | null = null
  private menuOpen = false
  private removeRootPointerDown: (() => void) | null = null

  constructor(private view: EditorView) {
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'minddock-table-more'
    this.button.textContent = '⋮'
    this.button.setAttribute('aria-label', '表格更多')
    this.button.setAttribute('contenteditable', 'false')

    this.menu = document.createElement('div')
    this.menu.className = 'minddock-table-menu'
    this.menu.setAttribute('contenteditable', 'false')
    this.menu.hidden = true

    this.view.dom.addEventListener('mouseover', this.handleMouseOver)
    this.view.dom.addEventListener('mouseleave', this.handleMouseLeave)
    this.button.addEventListener('mousedown', this.handleButtonMouseDown)
    this.button.addEventListener('click', this.handleButtonClick)
    this.menu.addEventListener('mousedown', this.preventEditorBlur)
    this.menu.addEventListener('click', this.handleMenuClick)
    document.addEventListener('scroll', this.closeMenu, true)
  }

  update() {
    if (!this.activeTarget || !document.body.contains(this.activeTarget.cell)) {
      this.hideButton()
      this.closeMenu()
      return
    }

    this.positionButton()
    this.positionMenu()
  }

  destroy() {
    this.view.dom.removeEventListener('mouseover', this.handleMouseOver)
    this.view.dom.removeEventListener('mouseleave', this.handleMouseLeave)
    this.button.removeEventListener('mousedown', this.handleButtonMouseDown)
    this.button.removeEventListener('click', this.handleButtonClick)
    this.menu.removeEventListener('mousedown', this.preventEditorBlur)
    this.menu.removeEventListener('click', this.handleMenuClick)
    document.removeEventListener('scroll', this.closeMenu, true)
    this.removeRootPointerDown?.()
    this.button.remove()
    this.menu.remove()
  }

  private handleMouseOver = (event: MouseEvent) => {
    const cell = (event.target as Element | null)?.closest('td, th')
    if (!(cell instanceof HTMLTableCellElement) || !this.view.dom.contains(cell)) {
      return
    }

    const pos = this.view.posAtDOM(cell, 0)
    this.activeTarget = { cell, pos }
    this.showButton()
  }

  private handleMouseLeave = (event: MouseEvent) => {
    const relatedTarget = event.relatedTarget as Node | null
    if (
      relatedTarget &&
      (this.button.contains(relatedTarget) || this.menu.contains(relatedTarget))
    ) {
      return
    }

    if (!this.menuOpen) {
      this.hideButton()
    }
  }

  private handleButtonMouseDown = (event: MouseEvent) => {
    event.preventDefault()
  }

  private handleButtonClick = () => {
    if (!this.activeTarget) {
      return
    }

    this.focusCell()
    this.menuOpen = !this.menuOpen
    if (this.menuOpen) {
      this.renderMenu()
      this.positionMenu()
      document.body.appendChild(this.menu)
      this.menu.hidden = false
      window.setTimeout(() => {
        const handlePointerDown = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (target && (this.menu.contains(target) || this.button.contains(target))) {
            return
          }

          this.closeMenu()
        }
        document.addEventListener('pointerdown', handlePointerDown)
        this.removeRootPointerDown = () => document.removeEventListener('pointerdown', handlePointerDown)
      })
    } else {
      this.closeMenu()
    }
  }

  private preventEditorBlur = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  private handleMenuClick = (event: MouseEvent) => {
    const button = (event.target as Element | null)?.closest('button[data-action]')
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return
    }

    const action = button.dataset.action
    if (!action) {
      return
    }

    this.runAction(action)
  }

  private showButton() {
    if (!this.button.parentElement) {
      document.body.appendChild(this.button)
    }

    this.button.hidden = false
    this.positionButton()
  }

  private hideButton() {
    if (this.menuOpen) {
      return
    }

    this.button.hidden = true
  }

  private closeMenu = () => {
    this.menuOpen = false
    this.menu.hidden = true
    this.menu.remove()
    this.removeRootPointerDown?.()
    this.removeRootPointerDown = null
    this.hideButton()
  }

  private positionButton() {
    if (!this.activeTarget) {
      return
    }

    const rect = this.activeTarget.cell.getBoundingClientRect()
    this.button.style.left = `${rect.right - 28}px`
    this.button.style.top = `${rect.top + 8}px`
  }

  private positionMenu() {
    if (!this.activeTarget || this.menu.hidden) {
      return
    }

    const rect = this.activeTarget.cell.getBoundingClientRect()
    const menuWidth = 280
    const left = Math.min(rect.right - 12, window.innerWidth - menuWidth - 12)
    const top = Math.min(rect.top + 26, window.innerHeight - this.menu.offsetHeight - 12)

    this.menu.style.left = `${Math.max(12, left)}px`
    this.menu.style.top = `${Math.max(12, top)}px`
  }

  private renderMenu() {
    const context = this.getTableContext()
    const canMoveRowUp = context ? context.rowIndex > 0 : false
    const canMoveRowDown = context ? context.rowIndex < context.rowCount - 1 : false
    const canMoveColumnLeft = context ? context.columnIndex > 0 : false
    const canMoveColumnRight = context ? context.columnIndex < context.columnCount - 1 : false

    this.menu.innerHTML = `
      <div class="minddock-table-menu__group">
        ${menuButton('copy-markdown', '复制表格为', '›')}
        ${menuButton('align-left', '左对齐', '⌘←')}
        ${menuButton('align-center', '居中对齐', '⌘•')}
        ${menuButton('align-right', '右对齐', '⌘→')}
      </div>
      <div class="minddock-table-menu__group">
        ${menuButton('add-row-after', '添加行', '^⌘▼')}
        ${menuButton('add-row-before', '添加行', '^⌘▲')}
        ${menuButton('add-column-after', '添加列', '^⌘▶')}
        ${menuButton('add-column-before', '添加列', '^⌘◀')}
      </div>
      <div class="minddock-table-menu__group">
        ${menuButton('move-row-up', '上移一行', '⌥⌘▲', !canMoveRowUp)}
        ${menuButton('move-row-down', '下移一行', '⌥⌘▼', !canMoveRowDown)}
        ${menuButton('move-column-left', '向左移动列', '⌥⌘◀', !canMoveColumnLeft)}
        ${menuButton('move-column-right', '向右移动列', '⌥⌘▶', !canMoveColumnRight)}
      </div>
      <div class="minddock-table-menu__group">
        ${menuButton('delete-row', '删除行', '^⌘⌫')}
        ${menuButton('delete-column', '删除列', '^⇧⌘⌫')}
        ${menuButton('delete-table', '删除表格', '⌘⌫')}
      </div>
    `
  }

  private runAction(action: string) {
    this.focusCell()

    switch (action) {
      case 'copy-markdown':
        void this.copyTableMarkdown()
        break
      case 'align-left':
        this.view.dispatch(this.view.state.tr.setSelection(this.view.state.selection).setMeta('addToHistory', true))
        this.runCommand((state, dispatch) => setCellAlignment(state, dispatch, 'left'))
        break
      case 'align-center':
        this.runCommand((state, dispatch) => setCellAlignment(state, dispatch, 'center'))
        break
      case 'align-right':
        this.runCommand((state, dispatch) => setCellAlignment(state, dispatch, 'right'))
        break
      case 'add-row-after':
        this.runCommand(addRowAfter)
        break
      case 'add-row-before':
        this.runCommand(addRowBefore)
        break
      case 'add-column-after':
        this.runCommand(addColumnAfter)
        break
      case 'add-column-before':
        this.runCommand(addColumnBefore)
        break
      case 'move-row-up':
        this.moveRow(-1)
        break
      case 'move-row-down':
        this.moveRow(1)
        break
      case 'move-column-left':
        this.moveColumn(-1)
        break
      case 'move-column-right':
        this.moveColumn(1)
        break
      case 'delete-row':
        this.runCommand(deleteRow)
        break
      case 'delete-column':
        this.runCommand(deleteColumn)
        break
      case 'delete-table':
        this.runCommand(deleteTable)
        break
    }

    this.closeMenu()
  }

  private runCommand(command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean) {
    command(this.view.state, this.view.dispatch)
    this.view.focus()
  }

  private moveRow(delta: -1 | 1) {
    const context = this.getTableContext()
    if (!context) {
      return
    }

    this.runCommand(moveTableRow({
      from: context.rowIndex,
      to: context.rowIndex + delta,
      select: true,
    }))
  }

  private moveColumn(delta: -1 | 1) {
    const context = this.getTableContext()
    if (!context) {
      return
    }

    this.runCommand(moveTableColumn({
      from: context.columnIndex,
      to: context.columnIndex + delta,
      select: true,
    }))
  }

  private focusCell() {
    if (!this.activeTarget) {
      return
    }

    this.view.focus()
    this.view.dispatch(this.view.state.tr.setSelection(
      Selection.near(this.view.state.doc.resolve(this.activeTarget.pos + 1)),
    ))
  }

  private getTableContext(): TableContext | null {
    try {
      const rect = selectedRect(this.view.state)
      return {
        rowIndex: rect.top,
        columnIndex: rect.left,
        rowCount: rect.map.height,
        columnCount: rect.map.width,
      }
    } catch {
      return null
    }
  }

  private async copyTableMarkdown() {
    const table = findTable(this.view.state.selection.$from)
    if (!table) {
      return
    }

    const markdown = table.node.content.content
      .map((row, rowIndex) => {
        const cells = row.content.content.map((cell) => collectText(cell).replace(/\|/g, '\\|'))
        const line = `| ${cells.join(' | ')} |`
        if (rowIndex !== 0) {
          return line
        }

        return `${line}\n| ${cells.map(() => '---').join(' | ')} |`
      })
      .join('\n')

    await navigator.clipboard?.writeText(markdown)
  }
}

function setCellAlignment(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  align: 'left' | 'center' | 'right',
) {
  const rect = selectedRect(state)
  const tr = state.tr
  rect.map.cellsInRect(rect).forEach((cellPos) => {
    const pos = rect.tableStart + cellPos
    tr.setNodeMarkup(pos, undefined, {
      ...rect.table.nodeAt(cellPos)?.attrs,
      style: `text-align: ${align}`,
    })
  })
  dispatch?.(tr)
  return true
}

function menuButton(action: string, label: string, shortcut: string, disabled = false) {
  return `
    <button type="button" data-action="${action}" ${disabled ? 'disabled' : ''}>
      <span>${label}</span>
      <kbd>${shortcut}</kbd>
    </button>
  `
}

type TextishNode = {
  text?: string
  content?: {
    content?: readonly TextishNode[]
  }
}

function collectText(node: TextishNode): string {
  if (node.text) {
    return node.text
  }

  return node.content?.content?.map((child) => collectText(child)).join('') ?? ''
}
