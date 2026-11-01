import React from 'react';
import { Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModulePlaceholderProps {
  moduleName: string;
  phase: string;
  description: string;
  features: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  phase,
  description,
  features,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="max-w-2xl">
        <div className="inline-flex items-center space-x-2 rounded-full bg-sahay-50 px-3 py-1 text-xs font-semibold text-sahay-700 border border-sahay-200">
          <Layers className="h-3.5 w-3.5" />
          <span>Scheduled for {phase}</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">{moduleName}</h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>

        <div className="mt-6 rounded-xl bg-gray-50 p-5 border border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Planned Module Capabilities
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-gray-600">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sahay-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-sahay-600 hover:text-sahay-700"
          >
            ← Back to Application Foundation Overview
          </Link>
        </div>
      </div>
    </div>
  );
};
