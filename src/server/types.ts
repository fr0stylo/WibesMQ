import { Socket } from 'node:net';
import { WriteTransformer } from '../transformer.js';

export type Connection = { socket: Socket; writer: WriteTransformer };
export type ServerProps = Partial<{ port: number }>;
export enum MessageType {
  createQueue,
  subscribe,
  enqueue,
  ack,
  nack,
  error,
}

export type ErrorResponse = {
  error: string;
};

export type CreateQueueRequest = {
  name: string;
};

export type EnqueueRequest = {
  name: string;
  payload: any;
};
export type SubscribeRequest = {
  name: string;
};

export type SubscribeResponse = {};
export type SubscribeMetadata = {
  response: string;
};

export type MessageFrame<T = any, M = any> = {
  messageID: string;
  type: MessageType;
  metadata: M;
  data: T;
};
