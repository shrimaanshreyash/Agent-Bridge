# Contributing to AgentBridge

## Getting Started

```bash
git clone https://github.com/srimaan/agentbridge.git
cd agentbridge
npm install
npx turbo build
```

## Adding a New Agent

1. `npx agentbridge init my-agent`
2. Implement your logic in `agent.ts`
3. Add to `agentbridge.yaml`
4. Test: `npx agentbridge up`

## Adding a Framework Adapter

1. Create `packages/adapter-yourframework/`
2. Follow the pattern in `packages/adapter-langchain/`
3. Wrap your framework's agent interface
4. Add an example in the adapter package

## Development

```bash
npx turbo dev          # Watch mode for all packages
npx turbo test         # Run all tests
npx turbo build        # Build all packages
```

## Code Style

- TypeScript strict mode
- ESM modules
- Functional where possible, classes for agents and adapters
- Zod for runtime validation

## Pull Requests

- One feature per PR
- Include tests for core changes
- Update README if adding user-facing features
