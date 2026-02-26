import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConflictDetectorProps {
  conflicts: any[];
}

const ConflictDetector: React.FC<ConflictDetectorProps> = ({ conflicts }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg p-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        冲突检测结果
      </h2>
      
      <div className="space-y-2">
        {conflicts.map((conflict, index) => (
          <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm font-medium text-yellow-800">
                  {conflict.message}
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  建议: {conflict.suggestion}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictDetector;
