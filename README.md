# WibesMQ

MQ broker based on good wibes only
A lightweight, event-driven message broker implemented in TypeScript.

## Overview

WibesMQ is a simple yet powerful message queue system that enables asynchronous communication between different parts of your application. It facilitates decoupling of components through an event-driven architecture using topics and subscriptions.

## Features

- **Topic-based Messaging**: Publish and subscribe to messages on specific topics
- **Event-driven Architecture**: Simple pub/sub model for asynchronous communication
- **TypeScript Support**: Fully typed for better developer experience
- **Lightweight**: Minimal dependencies and small footprint
- **Flexible Message Format**: Support for JSON message payloads
- **Connection Management**: Simple connection setup for publishers and subscribers

## Installation

TBD
```bash
npm install wibes-mq
```

## Basic Usage

### Publishing Messages

```typescript
import { Client } from 'wibes-mq';

// Create a client
const client = new Client({ url: 'wibesmq://localhost:1234' });

// Connect to the server
await client.connect();

// Publish a message to a topic
await client.enqueue('my-topic', { data: 'Hello, World!' });
```

### Subscribing to Messages

```typescript
import { Client } from 'wibes-mq';

// Create a client
const client = new Client({ url: 'wibesmq://localhost:1234' });

// Connect to the server
await client.connect();

// Subscribe to a topic
client.consume('my-topic', (message) => {
  console.log('Received message:', message);
});
```

## Running the Server

To run the WibesMQ server:

```bash
npm start
```

## Configuration

You can configure the server using environment variables:

```
PORT=1234 npm start
```

## Development

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/fr0stylo/WibesMQ.git
   cd WibesMQ
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
