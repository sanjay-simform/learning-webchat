# Webchat — Scalable Secure Real-time Chat

## What it is

- A production-ready reference backend for real-time chat: end-to-end encrypted messaging, durable delivery, presence, and file sharing built with WebSockets + Redis Streams and Postgres.

## Why it matters

- Minimal server trust: messages & files are E2E encrypted so the server only routes ciphertext.
- Durable, ordered delivery with Redis Streams for reliability across restarts and multiple app instances.

## Key features

- [x] End-to-end encrypted messaging (text + file transfers)
- [x] WebSockets over TLS (wss) with Redis-backed routing (durable streams)
- [x] Delivery acknowledgements (ack)
- [x] Message "seen" receipts
- [x] Typing indicators (real-time)
- [x] Live user online / presence status
- [x] Bloom filter for fast username lookups (auth scaling)
- [x] Cursor-based pagination for chat history
- [x] Infinite scroll + virtualization-friendly APIs
- [x] Live unread-count updates
- [x] New-chat initialization reflected live to participants
- [x] CDN-backed uploads (server does not host files)
- [x] Horizontal scaling: stateless app instances + Redis Streams consumer groups

## How WebSocket + Redis are used (concise)

- WebSockets handle client connections; each message is published to a Redis Stream.
- Redis Streams persist messages, provide ordered delivery, allow consumer groups for multiple app instances, and enable replay/backpressure handling.
- App instances read from streams and publish to connected sockets; Redis ensures durability if an instance fails.
- Advantages: durability, ordered delivery, horizontal scaling without sticky sessions, replay for missed messages, and efficient fan-out across instances.

## Security model (short)

- E2E encryption: clients encrypt/decrypt payloads; server never stores plaintext.
- Transport security: WebSockets run over TLS (wss).
- Auth scaling: bloom filter prevents expensive DB lookups during signup/login throttling.

## Performance estimate & assumptions

- Baseline infra: one t3.large EC2 (2 vCPU, 8 GB RAM) running the Node/Nest app using full 2 vCPUs; RDS Postgres on a separate instance with ~4 GB RAM; external managed Redis (clustered); CDN for uploads.
- Assumptions: average message payload ~1 KB, average rate ~1 message per user per minute, Redis latency <5 ms, CDN offloads file bandwidth and storage.
- Conservative concurrent connections: ~5k — 15k WebSocket clients on a single t3.large for light messaging patterns.
- Typical sustained throughput: ~100–500 messages/sec depending on message rate and encryption CPU cost.
- Monthly Active Users (MAU) estimate: with the above assumptions, a single instance can reasonably support ~100k–300k MAU (bursty distribution and client offline caching reduce load).
- To support higher concurrency or heavier message rates, add app instances, scale Redis, and use autoscaling groups.

## Deployment notes (short)

- Run multiple stateless app instances behind a load balancer.
- Use managed Redis (clustered) for Streams durability and scale.
- Offload file uploads to a CDN — the server only handles encrypted file metadata and CDN references.
- Use separate RDS for Postgres (4 GB RAM recommended here for metadata workloads).

## Improvement checklist

- [ ] Add automated load-testing scripts (k6/tsung) tuned to traffic profile
- [ ] Add metrics, observability, and autoscaling rules (CPU, Redis lag)
- [ ] Implement key-management UX (device keys, rotation, recovery)
- [ ] Multi-region DB + Redis replication for global scale
- [ ] Push notifications (APNs / FCM) for offline delivery
