# Basic Workflow Example

A simple two-agent pipeline: code review followed by documentation generation.

## Run

```bash
cd examples/basic-workflow
OPENROUTER_API_KEY=your_key npx agentbridge up
```

## What Happens

1. Registry starts on port 6100
2. `code-review` agent starts on port 6101
3. `doc-generator` agent starts on port 6103
4. Dashboard available at http://localhost:6140
