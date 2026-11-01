import React, { useState } from 'react';
import { X, AlertTriangle, Sparkles } from 'lucide-react';
import { AllergySeverity, CreateAllergyPayload } from '../../types/health';

interface AddAllergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: CreateAllergyPayload) => Promise<void>;
}

const ALLERGY_PRESETS = [
  { allergen: 'Penicillin', category: 'medication', severity: 'life_threatening' as AllergySeverity, is_lt: true },
  { allergen: 'Sulfa Drugs (Sulfonamides)', category: 'medication', severity: 'severe' as AllergySeverity, is_lt: true },
  { allergen: 'Aspirin / NSAIDs', category: 'medication', severity: 'moderate' as AllergySeverity, is_lt: false },
  { allergen: 'Peanuts', category: 'food', severity: 'severe' as AllergySeverity, is_lt: true },
  { allergen: 'Shellfish / Prawns', category: 'food', severity: 'severe' as AllergySeverity, is_lt: true },
  { allergen: 'Dust Mites / Pollen', category: 'environmental', severity: 'mild' as AllergySeverity, is_lt: false },
];

export const AddAllergyModal: React.FC<AddAllergyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  if (!isOpen) return null;

  const [allergen, setAllergen] = useState('');
  const [category, setCategory] = useState('medication');
  const [severity, setSeverity] = useState<AllergySeverity>('moderate');
  const [reactionDescription, setReactionDescription] = useState('');
  const [isLifeThreatening, setIsLifeThreatening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof ALLERGY_PRESETS[0]) => {
    setAllergen(preset.allergen);
    setCategory(preset.category);
    setSeverity(preset.severity);
    setIsLifeThreatening(preset.is_lt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergen.trim()) {
      setError('Please enter an allergen name.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        allergen: allergen.trim(),
        category,
        severity,
        reaction_description: reactionDescription || undefined,
        is_life_threatening: isLifeThreatening,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add allergy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-red-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Known Allergy</h3>
              <p className="text-xs text-slate-500">Record life-critical medication or food allergies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Common Allergens</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGY_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.allergen}
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:border-red-400 hover:bg-red-50 text-slate-700 transition-colors"
                >
                  {p.allergen}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Allergen Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Penicillin, Peanuts, Sulfa"
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="medication">Medication / Drug</option>
                <option value="food">Food Ingredient</option>
                <option value="environmental">Environmental (Dust/Pollen)</option>
                <option value="latex">Latex / Material</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AllergySeverity)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="mild">Mild (Itching, Rash)</option>
                <option value="moderate">Moderate (Hives, Swelling)</option>
                <option value="severe">Severe (Breathing difficulty)</option>
                <option value="life_threatening">Life-Threatening (Anaphylaxis)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-red-100/60 border border-red-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="isLifeThreatening"
              checked={isLifeThreatening}
              onChange={(e) => setIsLifeThreatening(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <label htmlFor="isLifeThreatening" className="text-xs text-slate-800">
              <strong className="text-red-900">Life-Threatening (Anaphylaxis Risk)</strong>
              <p className="text-red-800 text-[11px] mt-0.5">
                Highlights with a RED FLASH banner on Emergency Mode so doctors NEVER administer this medicine in an ER.
              </p>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reaction Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Acute facial swelling, anaphylactic shock"
              value={reactionDescription}
              onChange={(e) => setReactionDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Allergy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
