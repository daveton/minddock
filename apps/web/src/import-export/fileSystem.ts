type SaveMarkdownResult = {
  mode: 'directory' | 'file-system' | 'download' | 'cancelled'
  path?: string
}

const markdownHandles = new Map<string, FileSystemFileHandle>()
let markdownDirectoryHandle: FileSystemDirectoryHandle | null = null

export function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export function getMarkdownDirectoryName() {
  return markdownDirectoryHandle?.name ?? null
}

export function getMarkdownDirectoryPath(fileName?: string) {
  if (!markdownDirectoryHandle) {
    return null
  }

  return [markdownDirectoryHandle.name, fileName].filter(Boolean).join('/')
}

export async function chooseMarkdownDirectory() {
  if (!supportsDirectoryPicker() || !window.showDirectoryPicker) {
    return { mode: 'unsupported' as const }
  }

  try {
    const handle = await window.showDirectoryPicker()
    const permission = await ensureHandlePermission(handle)

    if (!permission) {
      return { mode: 'denied' as const }
    }

    markdownDirectoryHandle = handle
    return { mode: 'selected' as const, name: handle.name }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { mode: 'cancelled' as const }
    }

    throw error
  }
}

export function clearMarkdownDirectory() {
  markdownDirectoryHandle = null
}

export async function saveMarkdownFile(noteId: string, markdown: string, title: string): Promise<SaveMarkdownResult> {
  const suggestedName = `${toSafeFileName(title || noteId)}.md`

  if (markdownDirectoryHandle) {
    return saveMarkdownToSelectedDirectory(markdown, suggestedName)
  }

  if (supportsFileSystemAccess()) {
    const existingHandle = markdownHandles.get(noteId)
    const handle = existingHandle ?? (await pickMarkdownSaveHandle(suggestedName))

    if (!handle) {
      return { mode: 'cancelled' }
    }

    markdownHandles.set(noteId, handle)
    await writeFileHandle(handle, markdown)
    return { mode: 'file-system' }
  }

  downloadMarkdown(suggestedName, markdown)
  return { mode: 'download' }
}

export async function saveMarkdownToSelectedDirectory(markdown: string, fileName: string): Promise<SaveMarkdownResult> {
  if (!markdownDirectoryHandle) {
    return { mode: 'cancelled' }
  }

  const permission = await ensureHandlePermission(markdownDirectoryHandle)

  if (!permission) {
    return { mode: 'cancelled' }
  }

  const safeName = `${toSafeFileName(fileName.replace(/\.md$/i, ''))}.md`
  const handle = await markdownDirectoryHandle.getFileHandle(safeName, { create: true })
  await writeFileHandle(handle, markdown)

  return { mode: 'directory', path: getMarkdownDirectoryPath(safeName) ?? safeName }
}

export function getMarkdownFileName(noteId: string, title: string) {
  return `${toSafeFileName(title || noteId)}.md`
}

function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

async function ensureHandlePermission(handle: FileSystemDirectoryHandle | FileSystemFileHandle) {
  const descriptor = { mode: 'readwrite' as const }

  if ((await handle.queryPermission?.(descriptor)) === 'granted') {
    return true
  }

  return (await handle.requestPermission?.(descriptor)) === 'granted'
}

async function pickMarkdownSaveHandle(suggestedName: string) {
  const picker = window.showSaveFilePicker
  if (!picker) {
    return null
  }

  try {
    return await picker({
      suggestedName,
      types: [
        {
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md'],
            'text/plain': ['.md'],
          },
        },
      ],
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }

    throw error
  }
}

async function writeFileHandle(handle: FileSystemFileHandle, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

function downloadMarkdown(fileName: string, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.click()

  URL.revokeObjectURL(url)
}

function toSafeFileName(value: string) {
  const safe = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)

  return safe || 'note'
}
