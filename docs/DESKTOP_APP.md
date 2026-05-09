# Desktop App

MindDock 的桌面路线是 Tauri first：继续复用 `apps/web` 的 React / TipTap 界面，但把桌面能力放进 `apps/desktop`。

## 目标架构

```text
apps/web
  React + TipTap
  IndexedDBRepository

apps/desktop
  Tauri shell
  SQLiteRepository
  Markdown folder projection
  macOS bundle and release pipeline
```

Web 端继续使用 IndexedDB。Desktop 端应该通过同一组 Repository 接口切到 SQLite，并把 Markdown 文件夹作为可迁移、可备份、可被外部工具读取的 projection。

## Phase 1 Desktop

- Tauri app shell，输出 `.app` 和 `.dmg`。
- 原生窗口承载现有 React app。
- 预留 Tauri command 边界，后续接 SQLite、文件夹选择、文件监听和系统菜单。
- GitHub Actions 通过 tag 构建 macOS release。

## Phase 2 Desktop

- 新增 `SQLiteRepository`，实现现有 `AtomicSnapshotStorageProvider`。
- 用 SQLite 存储 notes、snapshots、operations、blocks、workspace state。
- 用迁移脚本管理 schema version。
- Markdown folder projection 写入 `~/Documents/MindDock` 或用户选择目录。
- 文件监听只更新 projection 或导入队列，不直接覆盖实时编辑器状态。

## Release

本地构建：

```bash
cd apps/desktop
npm install
npm run build
```

发布构建：

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 会构建 macOS app，并创建 GitHub Release。公开分发前需要配置 Apple Developer 签名和 notarization secrets。

## Signing Secrets

后续正式发布需要在 GitHub repository secrets 中配置：

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
