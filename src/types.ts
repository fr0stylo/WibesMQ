export enum MessageType {
  rcp,
  event,
}

export type MessageFrame<M = { event?: string }, T = string> = {
  messageID: string;
  type: MessageType;
  metadata: M;
  data: T;
};
