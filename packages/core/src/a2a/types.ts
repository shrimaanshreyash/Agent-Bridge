// ── A2A Protocol Types (spec-compliant) ──

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: string[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  authentication: { schemes: string[] };
  skills: A2ASkill[];
}

export interface A2ASkill {
  id: string;
  name: string;
  description: string;
}

export interface A2ATask {
  id: string;
  status: A2ATaskStatus;
  message: A2AMessage;
  result?: A2AMessage;
  error?: A2AError;
  createdAt: string;
  updatedAt: string;
}

export type A2ATaskStatus = 'submitted' | 'working' | 'completed' | 'failed' | 'cancelled';

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
}

export interface A2APart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; data: string };
}

export interface A2AError {
  code: number;
  message: string;
  data?: unknown;
}

// ── JSON-RPC Types ──

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
