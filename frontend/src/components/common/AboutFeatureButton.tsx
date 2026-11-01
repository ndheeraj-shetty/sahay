import React, { useState } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { AboutFeatureModal, FeatureKey } from './AboutFeatureModal';

interface AboutFeatureButtonProps {
  featureKey: FeatureKey;
  variant?: 'pill' | 'box';
  className?: string;
}

export const AboutFeatureButton: React.FC<AboutFeatureButtonProps> = ({
  featureKey,
  variant = 'pill',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === 'box' ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 hover:text-indigo-800 shadow-2xs hover:shadow-xs transition-all text-xs font-semibold group cursor-pointer ${className}`}
          title="Click to view complete explanation of this feature"
        >
          <div className="w-5 h-5 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors">
            <Info className="w-3.5 h-3.5" />
          </div>
          <span>About the Feature</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer ${className}`}
          title="Click to view complete explanation of this feature"
        >
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>About the Feature</span>
        </button>
      )}

      <AboutFeatureModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        featureKey={featureKey}
      />
    </>
  );
};
