/** Key that maps a chapter/lab to a concrete diagram React component. */
export type DiagramKey =
  | 'thread-timeline'
  | 'memory-ladder'
  | 'cache-line'
  | 'amdahl-curve'
  | 'execution-policies'
  | 'happens-before'
  | 'generic-flow';

export interface DiagramSpec {
  key: DiagramKey;
  /** Traditional Chinese caption rendered under the diagram. */
  caption?: string;
  /** Optional labelled nodes for the generic flow/UML diagram. */
  nodes?: string[];
}

export interface DiagramComponentProps {
  spec: DiagramSpec;
}
