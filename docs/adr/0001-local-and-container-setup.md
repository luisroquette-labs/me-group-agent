# ADR 0001: Keep local setup usable with native dependencies

## Context

The bot runs TypeScript directly through `tsx` and stores data in SQLite. `better-sqlite3` may need to compile a native module when a prebuilt binary is unavailable. Docker Compose bind mounts `config.yaml` and `.env` from the host; if `.env` does not exist, Docker can create a directory at that path, causing later writes to fail with `EISDIR`.

## Decision

Use the full `node:20-bookworm` image with build tools and install development dependencies because `tsx` is needed at runtime. The setup command creates an empty `.env` file before Docker Compose can mount it. The database initializer creates the parent directory because SQLite does not create directories.

## Consequences

The image is larger, but the bot can start when the SQLite module needs a source build. Local setup can safely precede or follow container use without treating `.env` as a directory.
