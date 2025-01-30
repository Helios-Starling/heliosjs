# @helios-starling/helios

<div align="center">

  [![npm version](https://img.shields.io/npm/v/@helios-starling/helios.svg)](https://www.npmjs.com/package/@helios-starling/helios)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)

</div>

<p align="center">
  <strong>High-performance WebSocket Server with State Recovery and Advanced Connection Management</strong>
</p>

<p align="center">
  <a href="#introduction">Introduction</a> •
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#advanced">Advanced</a>
</p>

## Introduction

Helios is an enterprise-grade WebSocket server implementing the Helios-Starling protocol. It provides sophisticated connection management, state persistence, and recovery mechanisms for building reliable real-time applications.

## Features

### Core Features

- **Advanced Connection Management**
  - Connection pooling and lifecycle management
  - Automatic client recovery after disconnections
  - Connection state persistence
  - Sophisticated error handling

- **State System**
  - Robust state persistence and recovery
  - JWT-based state tokens
  - Customizable state providers
  - Atomic state generation
  - Default state fallbacks

- **Protocol Support**
  - Full Helios-Starling protocol implementation
  - Binary and text message support
  - Structured request/response handling
  - Advanced notification system

- **Security**
  - JWT-based recovery
  - Connection recovery validation
  - State encryption
  - Rate limiting support

- **Performance**
  - Connection pooling
  - Message buffering
  - Request queueing
  - Optimized state handling

## Installation

```bash
npm install @helios-starling/helios
```

## Quick Start

```javascript
import { createServer, createHandlers } from '@helios-starling/helios';

// Create server instance
const server = createServer({
  debug: true,
  disconnectionTTL: 5 * 60 * 1000 // 5 minutes
});

// Register method handlers
server.method('chat:send', async (context) => {
  const { message, room } = context.payload;
  
  // Broadcast to room subscribers
  server.starlings.broadcast(`chat:${room}`, {
    message,
    sender: context.starling.id
  });
  
  context.success({ delivered: true });
});

// Start server with Bun
Bun.serve({
  port: 3000,
  websocket: createHandlers(server)
});
```

## Architecture

### Connection Management

The server uses a sophisticated connection management system via the `StarlingsManager`:

```javascript
// Custom connection handling
server.events.on('starling:new', ({ starling }) => {
  console.log(`New connection: ${starling.id}`);
  
  // Setup custom state providers
  starling.states.register('custom', 
    async () => ({ /* save state */ }),
    async (state) => { /* restore state */ }
  );
});

// Broadcast to specific clients
server.starlings.broadcast('system:update', { 
  type: 'maintenance',
  time: Date.now()
}, starling => starling.data.get('role') === 'admin');
```

### State Management

Helios provides a powerful state management system:

```javascript
// Register custom state provider
server.method('game:save', async (context) => {
  const { gameState } = context.payload;
  
  // Register state handler
  context.starling.states.register('game',
    // Save state
    async () => gameState,
    // Restore state
    async (state) => {
      await restoreGameState(state);
      context.starling.notify('game:restored', { state });
    },
    { 
      required: true,
      validate: (state) => validateGameState(state)
    }
  );
  
  // Generate recovery token
  const token = await context.starling.states.generateToken({
    expiresIn: '24h'
  });
  
  context.success({ token });
});
```

### Advanced Protocol Features

```javascript
// Binary message handling
server.onBinary((context) => {
  const buffer = context.data;
  // Process binary data...
});

// Custom protocol messages
server.onJson((context) => {
  const { type, data } = context.data;
  // Handle custom protocol...
});

// Method timeout handling
server.method('heavy:compute', async (context) => {
  context.notify('progress', { percent: 0 });
  
  for(let i = 0; i < 100; i++) {
    await heavyComputation(i);
    context.notify('progress', { percent: i });
  }
  
  context.success({ complete: true });
}, { timeout: 30000 });
```

## Advanced Usage

### State Recovery System

```javascript
// Advanced state management
server.method('session:initialize', async (context) => {
  const starling = context.starling;
  
  // Register multiple state providers
  starling.states.register('session', 
    async () => ({
      id: generateSessionId(),
      data: await getSessionData(),
      timestamp: Date.now()
    }),
    async (state) => {
      await restoreSession(state);
    },
    { required: true }
  );
  
  starling.states.register('preferences',
    async () => getUserPreferences(),
    async (state) => {
      await applyUserPreferences(state);
    },
    { 
      required: false,
      defaultState: defaultPreferences
    }
  );
  
  // Generate state token with custom claims
  const token = await starling.states.generateToken({
    expiresIn: '1h',
    customClaims: {
      sessionId: context.sessionId,
      permissions: context.permissions
    }
  });
  
  context.success({ token });
});
```

### Advanced Broadcasting

```javascript
// Sophisticated message broadcasting
server.method('notification:broadcast', async (context) => {
  const { message, target } = context.payload;
  
  // Broadcast with filtering
  server.starlings.broadcast('notification:new', message, 
    (starling) => {
      // Complex filtering logic
      const userRole = starling.data.get('role');
      const userGroups = starling.data.get('groups');
      return (
        userRole === target.role &&
        userGroups.some(group => target.groups.includes(group))
      );
    }
  );
  
  context.success({ 
    delivered: server.starlings.connectedCount
  });
});
```

## API Reference

### Server Creation

```typescript
interface HeliosOptions {
  connectionKey?: Uint8Array | string;
  disconnectionTTL?: number;
  debug?: boolean;
}

function createServer(options?: HeliosOptions): Helios;
function createHandlers(server: Helios): WebSocketHandlers;
```

### Helios Class

```typescript
class Helios {
  // Methods
  method(name: string, handler: MethodHandler, options?: MethodOptions): void;
  on(topic: string, handler: TopicHandler, options?: TopicOptions): void;
  onText(callback: (context: TextContext) => void): void;
  onJson(callback: (context: JsonContext) => void): void;
  onBinary(callback: (context: BinaryContext) => void): void;
  
  // Properties
  readonly events: EventEmitter;
  readonly starlings: StarlingsManager;
  readonly methods: MethodsManager;
  readonly topics: TopicsManager;
  
  // Protocol info
  readonly protocolInfo: {
    name: string;
    version: string;
    timestamp: number;
  };
}
```

### Events

| Event | Description | Payload |
|-------|-------------|---------|
| `starling:new` | New connection | `{ starling }` |
| `starling:connected` | Connection established | `{ starling }` |
| `starling:disconnected` | Connection lost | `{ starling, reason }` |
| `starling:recovered` | Connection recovered | `{ starling, token }` |
| `state:registered` | State provider registered | `{ starling, namespace }` |
| `state:restored` | State restored | `{ starling, namespace }` |

## Performance Tuning

Helios can be tuned for optimal performance:

```javascript
const server = createServer({
  // Connection handling
  maxConnections: 10000,
  connectionTimeout: 5000,
  
  // State management
  stateGenerationConcurrency: 100,
  stateTokenTTL: 3600,
  
  // Message handling
  messageBufferSize: 1000,
  maxMessageSize: 1024 * 1024,
  
  // Request processing
  maxConcurrentRequests: 1000,
  requestTimeout: 30000
});
```

## Testing

The server includes comprehensive testing utilities:

```javascript
import { MockStarling, MockWebSocket } from '@helios-starling/helios/testing';

describe('Helios Server', () => {
  let server;
  let mockStarling;
  
  beforeEach(() => {
    server = createServer();
    mockStarling = new MockStarling(server);
  });
  
  it('should handle requests', async () => {
    const response = await mockStarling.request('test:echo', { 
      message: 'hello' 
    });
    expect(response.data.message).toBe('hello');
  });
});
```

## License

MIT © 