type SaveMarkdownResult = {
  mode: 'file-system' | 'download' | 'cancelled'
}

const markdownHandles = new Map<string, FileSystemFileHandle>()

export async function saveMarkdownFile(noteId: string, markdown: string, title: string): Promise<SaveMarkdownResult> {
  const suggestedName = `${toSafeFileName(title || noteId)}.md`

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

function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
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
