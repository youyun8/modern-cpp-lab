'use client';

import type { ComponentType } from 'react';
import type { DiagramComponentProps, DiagramKey } from '@/types/DiagramProps';
import ThreadTimeline from './ThreadTimeline';
import MemoryLadder from './MemoryLadder';
import CacheLineVisualizer from './CacheLineVisualizer';
import AmdahlCurve from './AmdahlCurve';
import ExecutionPolicies from './ExecutionPolicies';
import HappensBefore from './HappensBefore';
import GenericFlow from './GenericFlow';

export const kDiagramRegistry: Record<
  DiagramKey,
  ComponentType<DiagramComponentProps>
> = {
  'thread-timeline': ThreadTimeline,
  'memory-ladder': MemoryLadder,
  'cache-line': CacheLineVisualizer,
  'amdahl-curve': AmdahlCurve,
  'execution-policies': ExecutionPolicies,
  'happens-before': HappensBefore,
  'generic-flow': GenericFlow,
};
