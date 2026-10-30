/**
 * events.ts — Server-Sent Events for live UI updates (GET /api/events).
 *
 * Events: `media.updated` (a full MediaItem) and `queue.progress` (QueueProgress).
 * The route sits behind requireAuth like the rest of /api; EventSource sends the
 * session cookie automatically because it is same-origin.
 */

import type { Request, Response } from 'express';

const clients = new Set<Response>();

export function eventsHandler(initial: () => Array<{ event: string; data: unknown }>) {
  return (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    clients.add(res);
    for (const { event, data } of initial()) send(res, event, data);

    // Comment lines keep proxies (tailscale serve included) from closing an idle stream.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
  };
}

function send(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function broadcast(event: string, data: unknown) {
  for (const res of clients) send(res, event, data);
}

/** Like broadcast, but skips repeats of the last payload sent for this event. */
const lastPayload = new Map<string, string>();
export function broadcastIfChanged(event: string, data: unknown) {
  const json = JSON.stringify(data);
  if (lastPayload.get(event) === json) return;
  lastPayload.set(event, json);
  broadcast(event, data);
}
