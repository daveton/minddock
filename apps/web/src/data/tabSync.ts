// Multi-tab conflict resolution using BroadcastChannel

export interface TabMessage {
  type: 'NOTE_UPDATE' | 'NOTE_CONFLICT';
  noteId: string;
  timestamp: number;
  content?: any;
  conflictData?: {
    localTimestamp: number;
    remoteTimestamp: number;
    localContent: any;
    remoteContent: any;
  };
}

class TabSyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private onConflictCallback?: (conflict: TabMessage['conflictData']) => void;

  constructor() {
    this.tabId = this.generateTabId();
    this.initChannel();
  }

  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initChannel() {
    try {
      this.channel = new BroadcastChannel('minddock-notes');
      this.channel.onmessage = this.handleMessage.bind(this);
      console.log(`[TAB_SYNC] Initialized tab ${this.tabId}`);
    } catch (error) {
      console.warn('[TAB_SYNC] BroadcastChannel not supported:', error);
    }
  }

  private handleMessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data;
    
    // Ignore messages from the same tab
    if (this.isOwnMessage(message)) {
      return;
    }

    console.log(`[TAB_SYNC] Received message from another tab:`, message);

    switch (message.type) {
      case 'NOTE_UPDATE':
        this.handleNoteUpdate(message);
        break;
      case 'NOTE_CONFLICT':
        this.handleNoteConflict(message);
        break;
    }
  };

  private isOwnMessage(message: TabMessage): boolean {
    // Simple check to avoid echo
    return false; // In real implementation, you'd track sent messages
  }

  private handleNoteUpdate(message: TabMessage) {
    // This is handled by the main app state
    console.log(`[TAB_SYNC] Note ${message.noteId} updated in another tab`);
  }

  private handleNoteConflict(message: TabMessage) {
    if (message.conflictData && this.onConflictCallback) {
      this.onConflictCallback(message.conflictData);
    }
  }

  public broadcastNoteUpdate(noteId: string, content: any, timestamp: number) {
    if (!this.channel) return;

    const message: TabMessage = {
      type: 'NOTE_UPDATE',
      noteId,
      timestamp,
      content,
    };

    this.channel.postMessage(message);
    console.log(`[TAB_SYNC] Broadcasted note update for ${noteId}`);
  }

  public broadcastNoteConflict(
    noteId: string,
    localTimestamp: number,
    remoteTimestamp: number,
    localContent: any,
    remoteContent: any
  ) {
    if (!this.channel) return;

    const message: TabMessage = {
      type: 'NOTE_CONFLICT',
      noteId,
      timestamp: Math.max(localTimestamp, remoteTimestamp),
      conflictData: {
        localTimestamp,
        remoteTimestamp,
        localContent,
        remoteContent,
      },
    };

    this.channel.postMessage(message);
    console.log(`[TAB_SYNC] Broadcasted conflict for note ${noteId}`);
  }

  public setConflictCallback(callback: (conflict: TabMessage['conflictData']) => void) {
    this.onConflictCallback = callback;
  }

  public getTabId(): string {
    return this.tabId;
  }

  public close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

// Singleton instance
let tabSyncManager: TabSyncManager | null = null;

export function getTabSyncManager(): TabSyncManager {
  if (!tabSyncManager) {
    tabSyncManager = new TabSyncManager();
  }
  return tabSyncManager;
}

export function resolveConflict(
  localContent: any,
  localTimestamp: number,
  remoteContent: any,
  remoteTimestamp: number
): { content: any; timestamp: number; resolvedBy: 'local' | 'remote' } {
  // Last-write-wins strategy
  if (remoteTimestamp > localTimestamp) {
    return {
      content: remoteContent,
      timestamp: remoteTimestamp,
      resolvedBy: 'remote',
    };
  } else {
    return {
      content: localContent,
      timestamp: localTimestamp,
      resolvedBy: 'local',
    };
  }
}
