# Kiosque

A multi-vendor fashion marketplace for clothing, shoes, perfumes, bags, and accessories.

## Stack

- Runtime: Node.js + TypeScript
- Framework: Express
- Database: PostgreSQL 16
- ORM: Prisma
- Cache and queue: Redis 7 + BullMQ
- Pattern: MVC, modular monolith

## Status

Phase 1 — Foundation. Planning complete, scaffolding in progress.

## Documentation

See the docs folder for planning artifacts:

- docs/index.html — overview and decisions
- docs/01-data-model.html — 25 tables across 10 domains
- docs/03-api-contract.html — 62 endpoints
- docs/04-project-phases.html — 11-phase build plan

## Folder structure

src/server.ts — entry point
src/app.ts — express app builder
src/config/ — env, db, redis, logger
src/modules/ — one folder per business domain
src/common/ — cross-cutting middleware, errors, utils
src/infrastructure/ — outbox, queues, ledger, integrations
src/routes/ — mounts module routes

## Setup

Coming in Phase 1.
