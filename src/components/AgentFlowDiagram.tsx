'use client';

import { CheckCircle2, Loader2, Brain, Scissors, FileSearch, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AgentFlowDiagramProps {
  currentStep?: string;
}

const STEPS = [
  {
    key: 'router',
    name: 'Router Agent',
    label: 'Pass 1',
    description: 'Identifies distinct workloads from the transcript',
    icon: Brain,
    match: (s: string) => s.includes('router') || s.includes('routing'),
  },
  {
    key: 'slicer',
    name: 'Slicer Agent',
    label: 'Pass 2a',
    description: 'Groups topics and context per workload',
    icon: Scissors,
    match: (s: string) => s.includes('slicer') || s.includes('slicing'),
  },
  {
    key: 'extraction',
    name: 'Extraction Agents',
    label: 'Pass 2b',
    description: 'Technical · Commercial · Strategy in parallel',
    icon: FileSearch,
    match: (s: string) =>
      s.includes('agent') || s.includes('extract') ||
      s.includes('technical') || s.includes('commercial') || s.includes('strategy'),
  },
  {
    key: 'mongodb',
    name: 'MongoDB Contribution Analyst',
    label: 'Pass 3',
    description: 'Summarises team contributions from full transcript',
    icon: Users,
    match: (s: string) => s.includes('mongodb') || s.includes('contribution'),
  },
];

export function AgentFlowDiagram({ currentStep = '' }: AgentFlowDiagramProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 600);
    return () => clearInterval(id);
  }, []);

  const lower = currentStep.toLowerCase();
  const activeIdx = (() => {
    const idx = STEPS.findIndex(s => s.match(lower));
    return idx >= 0 ? idx : 0;
  })();

  const dots = '.'.repeat((tick % 3) + 1);

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-900">
          AI agents working{dots}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Multi-pass pipeline · usually 30–90 s</p>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < activeIdx;
          const isActive    = i === activeIdx;
          const isPending   = i > activeIdx;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Timeline spine */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                {/* Node */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' :
                  isActive    ? 'bg-green-600 ring-4 ring-green-100' :
                                'bg-gray-100'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 flex-1 my-1 transition-colors duration-300 ${
                    isCompleted ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} style={{ minHeight: '24px' }} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 flex-1 transition-opacity duration-300 ${isPending ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold ${ isActive ? 'text-green-700' : isCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    isCompleted ? 'bg-emerald-50 text-emerald-700' :
                    isActive    ? 'bg-green-50 text-green-600' :
                                  'bg-gray-100 text-gray-400'
                  }`}>{step.label}</span>
                  {isActive && (
                    <span className="text-xs text-green-600 font-medium">Running</span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-emerald-600 font-medium">Done</span>
                  )}
                </div>
                <p className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>

                {/* Active shimmer bar */}
                {isActive && (
                  <div className="mt-2 h-1 rounded-full bg-green-100 overflow-hidden w-full">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: '40%',
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current step text */}
      {currentStep && (
        <div className="mt-2 rounded-xl bg-green-50 border border-green-100 px-4 py-2.5">
          <p className="text-xs text-green-700 font-medium truncate">{currentStep}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

