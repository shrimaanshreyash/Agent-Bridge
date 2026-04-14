import { A2AClient } from '../a2a/client.js';

export interface WorkflowStep {
  agent: string;
  input: unknown;
  output?: string;
  condition?: string;
}

export interface WorkflowDef {
  description?: string;
  steps: WorkflowStep[];
}

export class WorkflowExecutor {
  private a2aClient = new A2AClient();
  private agentUrls: Map<string, string>;

  constructor(agentUrls: Map<string, string>) {
    this.agentUrls = agentUrls;
  }

  async run(workflow: WorkflowDef, initialInput: Record<string, unknown>): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { input: initialInput };

    for (const step of workflow.steps) {
      if (step.condition && !this.evaluateCondition(step.condition, context)) continue;

      const agentUrl = this.agentUrls.get(step.agent);
      if (!agentUrl) throw new Error(`Agent "${step.agent}" not found`);

      // If no input is specified for a step, pass the original workflow input
      const resolvedInput = step.input != null
        ? this.resolveRefs(step.input, context)
        : context.input;

      const inputData = (resolvedInput && typeof resolvedInput === 'object')
        ? resolvedInput as Record<string, unknown>
        : { input: resolvedInput };

      const result = await this.a2aClient.sendTask(agentUrl, {
        role: 'user',
        parts: [{ type: 'data', data: inputData }],
      });

      if (result.status === 'failed') throw new Error(`Agent "${step.agent}" failed: ${result.error?.message}`);

      const outputData = result.result?.parts.find((p) => p.type === 'data')?.data ?? {};
      if (step.output) {
        const key = step.output.replace('$', '');
        context[key] = outputData;
      }
    }
    return context;
  }

  private resolveRefs(input: unknown, context: Record<string, unknown>): unknown {
    if (typeof input === 'string' && input.startsWith('$')) {
      const path = input.slice(1).split('.');
      let value: unknown = context;
      for (const key of path) value = (value as Record<string, unknown>)?.[key];
      return value;
    }
    if (typeof input === 'object' && input !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) resolved[key] = this.resolveRefs(val, context);
      return resolved;
    }
    return input;
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    const match = condition.match(/^\$(\w+(?:\.\w+)*)\s*([<>=!]+)\s*(.+)$/);
    if (!match) return true;
    const [, path, op, rawVal] = match;
    let left: unknown = context;
    for (const key of path.split('.')) left = (left as Record<string, unknown>)?.[key];
    const right = Number(rawVal) || rawVal;
    switch (op) {
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '==': return left == right;
      case '!=': return left != right;
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);
      default: return true;
    }
  }
}
