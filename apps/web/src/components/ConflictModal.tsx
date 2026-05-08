import React from 'react';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';

interface ConflictData {
  localTimestamp: number;
  remoteTimestamp: number;
  localContent: any;
  remoteContent: any;
}

interface ConflictModalProps {
  conflictData: ConflictData;
  onResolve: (useRemote: boolean) => void;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflictData,
  onResolve,
  onClose,
}) => {
  const { localTimestamp, remoteTimestamp, localContent, remoteContent } = conflictData;
  
  const isRemoteNewer = remoteTimestamp > localTimestamp;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <Typography variant="h3" className="mb-4">笔记冲突</Typography>
        
        <Typography variant="body" className="text-[var(--text-secondary)] mb-6">
          检测到另一个标签页也正在编辑这个笔记。请选择要保留的版本：
        </Typography>

        <div className="space-y-4 mb-6">
          <div className={`p-4 rounded-xl border-2 ${isRemoteNewer ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)]' : 'border-[var(--border-medium)] bg-[var(--bg-secondary)]'}`}>
            <Typography variant="small" weight="semibold" className="mb-2">
              {isRemoteNewer ? '远程版本（更新）' : '本地版本（更新）'}
            </Typography>
            <Typography variant="meta" className="text-[var(--text-tertiary)]">
              {new Date(isRemoteNewer ? remoteTimestamp : localTimestamp).toLocaleString()}
            </Typography>
          </div>
          
          <div className={`p-4 rounded-xl border-2 ${!isRemoteNewer ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)]' : 'border-[var(--border-medium)] bg-[var(--bg-secondary)]'}`}>
            <Typography variant="small" weight="semibold" className="mb-2">
              {!isRemoteNewer ? '本地版本（更新）' : '远程版本（更新）'}
            </Typography>
            <Typography variant="meta" className="text-[var(--text-tertiary)]">
              {new Date(!isRemoteNewer ? remoteTimestamp : localTimestamp).toLocaleString()}
            </Typography>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={() => onResolve(isRemoteNewer)}
            className={isRemoteNewer ? 'bg-[var(--accent-primary)]' : ''}
          >
            使用{isRemoteNewer ? '远程' : '本地'}版本
          </Button>
        </div>
      </Card>
    </div>
  );
};
