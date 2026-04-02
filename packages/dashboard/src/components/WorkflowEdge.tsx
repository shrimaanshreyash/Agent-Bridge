import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function WorkflowEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX, sourceY: props.sourceY,
    targetX: props.targetX, targetY: props.targetY,
  });
  return <BaseEdge path={edgePath} style={{ stroke: 'rgba(99, 102, 241, 0.4)', strokeWidth: 2, strokeDasharray: '8 4', animation: 'dashmove 1s linear infinite' }} />;
}
