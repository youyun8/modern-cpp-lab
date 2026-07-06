import type { ChapterContent } from '@/types/ChapterContent';

import ch01 from './ch01-introduction';
import ch02 from './ch02-preparation';
import ch03 from './ch03-basic-concepts-i';
import ch04 from './ch04-basic-concepts-ii';
import ch05 from './ch05-basic-concepts-iii';
import ch06 from './ch06-basic-concepts-iv';
import ch07 from './ch07-basic-concepts-v';
import ch08 from './ch08-basic-concepts-vi';
import ch08UserDefinedLiterals from './ch08-user-defined-literals';
import ch08Exceptions from './ch08.5-exceptions';
import ch08StructuredBindings from './ch08.75-structured-bindings';
import ch09 from './ch09-oop-i';
import ch09SmartPointers from './ch09.5-smart-pointers';
import ch10 from './ch10-oop-ii';
import ch11 from './ch11-templates-i';
import ch12 from './ch12-templates-ii';
import ch12ForwardingReferences from './ch12-forwarding-references';
import ch12CompileTimeProgramming from './ch12-compile-time-programming';
import ch12CallableUtilities from './ch12-callable-utilities';
import ch13 from './ch13-translation-units-i';
import ch14 from './ch14-translation-units-ii';
import ch15 from './ch15-code-conventions-i';
import ch16 from './ch16-code-conventions-ii';
import ch16Attributes from './ch16-attributes';
import ch17 from './ch17-debugging-testing';
import ch18 from './ch18-ecosystem';
import ch19 from './ch19-utilities';
import ch19StringView from './ch19-string-view';
import ch19FilesystemIo from './ch19-filesystem-io';
import ch19TextUnicode from './ch19-text-unicode';
import ch19AllocatorsPmr from './ch19-allocators-pmr';
import ch19ChronoCore from './ch19.5-chrono-core';
import ch20 from './ch20-containers-algorithms';
import ch20Random from './ch20-random';
import ch20Regex from './ch20-regex';
import ch21 from './ch21-advanced-i';
import ch21ObjectLifetime from './ch21-object-lifetime';
import ch22 from './ch22-advanced-ii';
import ch23 from './ch23-optimization-i';
import ch24 from './ch24-optimization-ii';
import ch25 from './ch25-optimization-iii';
import ch26 from './ch26-software-design-i';
import ch27 from './ch27-software-design-ii';
import ch27TypeErasureRtti from './ch27-type-erasure-rtti';
import ch28 from './ch28-binary-size';
import ch29 from './ch29-build-time';

import ind01WhyParallelRoofline from './ind01-why-parallel-roofline';
import ind02HardwareReality from './ind02-hardware-reality';
import ind03ConcurrencyVsParallelism from './ind03-concurrency-vs-parallelism';
import ind04DataRacesMemoryModel from './ind04-data-races-memory-model';
import ind05AtomicsMemoryOrder from './ind05-atomics-memory-order';
import ind06WeakMemoryFences from './ind06-weak-memory-fences';
import ind07ThreadLifecycle from './ind07-thread-lifecycle';
import ind08MutexLocks from './ind08-mutex-locks';
import ind09CondvarCpp20Sync from './ind09-condvar-cpp20-sync';
import ind10LockFreeBasics from './ind10-lock-free-basics';
import ind11SafeMemoryReclamation from './ind11-safe-memory-reclamation';
import ind12ConcurrentContainers from './ind12-concurrent-containers';
import ind13AsyncFuturePromise from './ind13-async-future-promise';
import ind14ParallelStl from './ind14-parallel-stl';
import ind15Coroutines from './ind15-coroutines';
import ind16SendersReceivers from './ind16-senders-receivers';
import ind17StdSimd from './ind17-std-simd';
import ind18VectorizationFriendlyCode from './ind18-vectorization-friendly-code';
import ind19MeasurementProfiling from './ind19-measurement-profiling';
import ind20MemoryNumaOptimization from './ind20-memory-numa-optimization';
import ind21ThreadPoolsScheduling from './ind21-thread-pools-scheduling';
import ind22ReproducibleBenchmarking from './ind22-reproducible-benchmarking';
import ind23CatchingConcurrencyBugs from './ind23-catching-concurrency-bugs';
import ind24ExceptionSafetyResourceMgmt from './ind24-exception-safety-resource-mgmt';
import ind25FloatingPointReductionReproducibility from './ind25-floating-point-reduction-reproducibility';
import ind26MdspanLinalg from './ind26-mdspan-linalg';
import ind27OffloadingDataMovement from './ind27-offloading-data-movement';
import ind28PortableHeterogeneousConvergence from './ind28-portable-heterogeneous-convergence';
import ind29ParallelDesignPatterns from './ind29-parallel-design-patterns';
import ind30OpenmpMpiInterop from './ind30-openmp-mpi-interop';
import ind31CapstoneProject from './ind31-capstone-project';
import ind32RangesViews from './ind32-ranges-views';
import ind33ConceptsRequires from './ind33-concepts-requires';
import ind34ThreeWayComparison from './ind34-three-way-comparison';
import ind35Cpp20UtilityUpdates from './ind35-cpp20-utility-updates';
import ind36DesignatedInitializers from './ind36-designated-initializers';
import ind37ConstexprAllocation from './ind37-constexpr-allocation';
import ind38DeducingThis from './ind38-deducing-this';
import ind39Cpp26Outlook from './ind39-cpp26-outlook';
import appendixAFeatureTimeline from './appendix-a-feature-timeline';
import appendixBToolCheatsheet from './appendix-b-tool-cheatsheet';
import appendixCUbAntipatterns from './appendix-c-ub-antipatterns';
import appendixDReferences from './appendix-d-references';

import labMemoryModel from './lab-memory-model';
import labLockFree from './lab-lock-free';
import labParallelStl from './lab-parallel-stl';
import labCoroutines from './lab-coroutines';
import labGpuBridge from './lab-gpu-bridge';

const kAll: ChapterContent[] = [
  ch01,
  ch02,
  ch03,
  ch04,
  ch05,
  ch06,
  ch07,
  ch08,
  ch08UserDefinedLiterals,
  ch08Exceptions,
  ch08StructuredBindings,
  ch09,
  ch09SmartPointers,
  ch10,
  ch11,
  ch12,
  ch12ForwardingReferences,
  ch12CompileTimeProgramming,
  ch12CallableUtilities,
  ch13,
  ch14,
  ch15,
  ch16,
  ch16Attributes,
  ch17,
  ch18,
  ch19,
  ch19StringView,
  ch19FilesystemIo,
  ch19TextUnicode,
  ch19AllocatorsPmr,
  ch19ChronoCore,
  ch20,
  ch20Random,
  ch20Regex,
  ch21,
  ch21ObjectLifetime,
  ch22,
  ch23,
  ch24,
  ch25,
  ch26,
  ch27,
  ch27TypeErasureRtti,
  ch28,
  ch29,
  labMemoryModel,
  labLockFree,
  labParallelStl,
  labCoroutines,
  labGpuBridge,
  ind01WhyParallelRoofline,
  ind02HardwareReality,
  ind03ConcurrencyVsParallelism,
  ind04DataRacesMemoryModel,
  ind05AtomicsMemoryOrder,
  ind06WeakMemoryFences,
  ind07ThreadLifecycle,
  ind08MutexLocks,
  ind09CondvarCpp20Sync,
  ind10LockFreeBasics,
  ind11SafeMemoryReclamation,
  ind12ConcurrentContainers,
  ind13AsyncFuturePromise,
  ind14ParallelStl,
  ind15Coroutines,
  ind16SendersReceivers,
  ind17StdSimd,
  ind18VectorizationFriendlyCode,
  ind19MeasurementProfiling,
  ind20MemoryNumaOptimization,
  ind21ThreadPoolsScheduling,
  ind22ReproducibleBenchmarking,
  ind23CatchingConcurrencyBugs,
  ind24ExceptionSafetyResourceMgmt,
  ind25FloatingPointReductionReproducibility,
  ind26MdspanLinalg,
  ind27OffloadingDataMovement,
  ind28PortableHeterogeneousConvergence,
  ind29ParallelDesignPatterns,
  ind30OpenmpMpiInterop,
  ind31CapstoneProject,
  ind32RangesViews,
  ind33ConceptsRequires,
  ind34ThreeWayComparison,
  ind35Cpp20UtilityUpdates,
  ind36DesignatedInitializers,
  ind37ConstexprAllocation,
  ind38DeducingThis,
  ind39Cpp26Outlook,
  appendixAFeatureTimeline,
  appendixBToolCheatsheet,
  appendixCUbAntipatterns,
  appendixDReferences,
];

export const kContentBySlug: Record<string, ChapterContent> = Object.fromEntries(
  kAll.map((c) => [c.slug, c]),
);

/** All chapter (non-lab) slugs, i.e. those with a chapterLabel. */
export const kChapterSlugs: string[] = kAll.filter((c) => c.chapterLabel).map((c) => c.slug);

/** Lab slugs stripped of the "lab-" prefix, for the /lab/[lab] route. */
export const kLabSlugs: string[] = kAll
  .filter((c) => !c.chapterLabel)
  .map((c) => c.slug.replace(/^lab-/, ''));

export function getContent(slug: string): ChapterContent | undefined {
  return kContentBySlug[slug];
}
