# MindDock Desktop

This package is the native macOS shell for the existing React app in `apps/web`.

## Requirements

- Node.js and npm
- Rust toolchain from <https://rustup.rs>
- Xcode Command Line Tools on macOS

## Development

```bash
cd apps/desktop
npm install
npm run dev
```

The Tauri dev command starts the web app from `apps/web` on port `1420` and opens it inside a native window.

## Build

```bash
cd apps/desktop
npm run build
```

The macOS bundle output is written under:

```text
apps/desktop/src-tauri/target/release/bundle/
```

Unsigned local builds are useful for testing. Public releases should be signed and notarized through the GitHub Actions workflow.
