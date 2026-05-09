/// <reference types="vite/client" />

interface Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
  }) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemFileHandle {
  name: string
  createWritable: () => Promise<FileSystemWritableFileStream>
  queryPermission?: (descriptor?: { mode?: FileSystemPermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: FileSystemPermissionMode }) => Promise<PermissionState>
}

interface FileSystemDirectoryHandle {
  name: string
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>
  queryPermission?: (descriptor?: { mode?: FileSystemPermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: FileSystemPermissionMode }) => Promise<PermissionState>
}

interface FileSystemWritableFileStream extends WritableStream {
  write: (data: BlobPart) => Promise<void>
  close: () => Promise<void>
}
