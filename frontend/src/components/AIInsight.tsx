import { BrainCircuit } from 'lucide-react';

interface AIInsightProps {
  insight: string;
  isLoading?: boolean;
}

export default function AIInsight({ insight, isLoading }: AIInsightProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-in fade-in duration-700">
      <div className={`p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
        <BrainCircuit className="w-8 h-8 text-white" />
      </div>
      <div className="w-full">
        <h3 className="text-lg font-bold">Nuero Insight</h3>
        {isLoading ? (
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-indigo-400/30 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-indigo-400/30 rounded animate-pulse w-1/2"></div>
            <span className="text-xs text-indigo-200 mt-1 inline-block animate-pulse">Analyzing priority metrics...</span>
          </div>
        ) : (
          <p className="text-indigo-100 mt-1 font-medium leading-relaxed">
            {insight || "Keep up the good work! The engine is actively monitoring your progress."}
          </p>
        )}
      </div>
    </div>
  );
}
