declare module 'ws' {
  import { Server as HttpServer } from 'http';

  export class WebSocket {
    static readonly OPEN: number;
    readonly readyState: number;
    send(data: string): void;
    on(event: 'message', listener: (data: unknown) => void): this;
    on(event: 'close', listener: () => void): this;
  }

  export class WebSocketServer {
    readonly clients: Set<WebSocket>;
    constructor(options: { server: HttpServer; path?: string });
    on(event: 'connection', listener: (ws: WebSocket) => void): this;
  }
}
