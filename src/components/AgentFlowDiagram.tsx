'use client';

import { CheckCircle, Loader2, Circle, Brain, Scissors, FileSearch } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AgentFlowDiagramProps {
  currentStep?: string;
}

export function AgentFlowDiagram({ currentStep = '' }: AgentFlowDiagramProps) {
  const [dots, setDots] = useState('');

  // Animated dots for processing effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Determine which steps are complete, active, or pending based on currentStep
  const steps = [
    {
      name: 'Router Agent',
      description: 'Identifying workloads from transcript',
      detailedDescription: 'Analyzing conversation to identify distinct sales opportunities and workloads',
      icon: Brain,
      key: 'router',
    },
    {
      name: 'Slicer Agent',
      description: 'Organizing topics per workload',
      detailedDescription: 'Grouping related discussion topics and context for each identified workload',
      icon: Scissors,
      key: 'slicer',
    },
    {
      name: 'Extraction Agents',
      description: 'Technical, Commercial & Strategy',
      detailedDescription: 'Extracting technical architecture, commercial details, and strategic insights',
      icon: FileSearch,
      key: 'extraction',
    },
  ];

  // Determine the current step index
  const getCurrentStepIndex = () => {
    const lower = currentStep.toLowerCase();
    if (lower.includes('router') || lower.includes('routing')) return 0;
    if (lower.includes('slicer') || lower.includes('slicing')) return 1;
    if (lower.includes('agent') || lower.includes('extract') || lower.includes('technical') || lower.includes('commercial') || lower.includes('strategy')) return 2;
    return 0; // Default to first step if unknown
  };

  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            AI Agents Processing Your Transcript{dots}
          </h3>
          <p className="text-gray-600">
            Multi-agent workflow analyzing and extracting insights
          </p>
        </div>
        
        <div className="space-y-6">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isLast = index === steps.length - 1;
            const Icon = step.icon;
            
            return (
              <div key={step.key}>
                {/* Step Card */}
                <div 
                  className={`
                    relative rounded-xl p-6 border-2 transition-all duration-500 transform
                    ${status === 'completed' ? 'bg-gradient-to-r from-green-700 to-green-600 border-green-700 text-white scale-95 opacity-75' : ''}
                    ${status === 'active' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-600 text-green-900 shadow-2xl scale-100' : ''}
                    ${status === 'pending' ? 'bg-gray-50 border-gray-300 text-gray-500 scale-95' : ''}
                  `}
                >
                  <div className="flex items-start">
                    {/* Icon Section */}
                    <div className={`
                      p-3 rounded-lg mr-4
                      ${status === 'completed' ? 'bg-white/20' : ''}
                      ${status === 'active' ? 'bg-green-200' : ''}
                      ${status === 'pending' ? 'bg-gray-200' : ''}
                    `}>
                      {status === 'completed' && <CheckCircle className="w-8 h-8" />}
                      {status === 'active' && <Icon className="w-8 h-8 animate-pulse" />}
                      {status === 'pending' && <Icon className="w-8 h-8" />}
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-lg">{step.name}</h4>
                        {status === 'active' && (
                          <div className="flex items-center space-x-1">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Processing...</span>
                          </div>
                        )}
                        {status === 'completed' && (
                          <span className="text-sm font-medium flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="text-sm font-medium text-gray-400">Pending</span>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-1 ${status === 'pending' ? 'text-gray-400' : ''}`}>
                        {step.description}
                      </p>
                      
                      {status === 'active' && (
                        <p className="text-xs text-green-700 mt-2 italic">
                          {step.detailedDescription}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar for active step */}
                  {status === 'active' && (
                    <div className="mt-4 w-full bg-green-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full animate-progress-bar" 
                           style={{ 
                             width: '100%',
                             animation: 'progress 2s ease-in-out infinite'
                           }} />
                    </div>
                  )}
                </div>
                
                {/* Connector Arrow */}
                {!isLast && (
                  <div className="flex justify-center py-2">
                    <div className={`
                      w-1 h-8 rounded transition-all duration-500
                      ${status === 'completed' ? 'bg-green-700' : 'bg-gray-300'}
                    `} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Current status text */}
        <div className="mt-8 text-center bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            {currentStep || 'Initializing AI agents...'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            This usually takes 30-60 seconds depending on transcript size
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
}
