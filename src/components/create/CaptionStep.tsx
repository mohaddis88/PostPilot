import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Hash,
} from 'lucide-react';
import { Button } from '../common/Button';
import { CtaType, PlatformType, PostType } from '../../domain/types';
import { PLATFORM_SPECS } from '../../domain/specs';

interface CaptionStepProps {
  postType: PostType;
  masterTitle: string;
  setMasterTitle: (title: string) => void;
  masterCaption: string;
  setMasterCaption: (caption: string) => void;
  selectedPlatforms: PlatformType[];
  platformOverrides: Partial<Record<PlatformType, string>>;
  setPlatformOverrides: React.Dispatch<
    React.SetStateAction<Partial<Record<PlatformType, string>>>
  >;
  cta?: CtaType;
  onSelectCta?: (cta: CtaType) => void;
  onNavigateBack: () => void;
  onProceedToSchedule: () => void;
}

const PLATFORM_LIMITS: Record<PlatformType, number> = {
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  facebook: 63206,
};

const SUGGESTED_HASHTAGS = [
  '#innovation',
  '#futureoftech',
  '#aiengineering',
  '#creatorlife',
  '#postpilot',
  '#viralcontent',
];

export const CaptionStep: React.FC<CaptionStepProps> = ({
  postType,
  masterTitle,
  setMasterTitle,
  masterCaption,
  setMasterCaption,
  selectedPlatforms,
  platformOverrides,
  setPlatformOverrides,
  cta = 'none',
  onSelectCta,
  onNavigateBack,
  onProceedToSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'master' | PlatformType>('master');

  const currentText =
    activeTab === 'master' ? masterCaption : platformOverrides[activeTab] || '';

  const handleTextChange = (text: string) => {
    if (activeTab === 'master') {
      setMasterCaption(text);
    } else {
      setPlatformOverrides((prev) => ({
        ...prev,
        [activeTab]: text,
      }));
    }
  };

  const handleAddHashtag = (tag: string) => {
    const updated = currentText ? `${currentText} ${tag}` : tag;
    handleTextChange(updated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Story Caption Note */}
      {postType === 'story' && (
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
          <span>
            <strong className="text-[var(--text)]">Stories Note:</strong> Caption is optional and will be placed as sticker / overlay text.
          </span>
        </div>
      )}

      {/* Post Title */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2">
        <label htmlFor="post-title" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Internal Title / Label
        </label>
        <input
          id="post-title"
          type="text"
          value={masterTitle}
          onChange={(e) => setMasterTitle(e.target.value)}
          placeholder="e.g. Weekly Product Update & Tech Demo"
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Caption Tabs (Master vs Platform Overrides) */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('master')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'master'
                  ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Master Caption
            </button>

            {selectedPlatforms.map((plat) => {
              const spec = PLATFORM_SPECS[plat];
              const isOverridden = !!platformOverrides[plat];
              const isActive = activeTab === plat;

              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setActiveTab(plat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--p-${plat})` }}
                  />
                  <span>{spec.name}</span>
                  {isOverridden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono text-[var(--muted)]">
            {activeTab === 'master' ? (
              `${masterCaption.length} chars`
            ) : (
              `${(platformOverrides[activeTab] || '').length} / ${PLATFORM_LIMITS[activeTab]}`
            )}
          </span>
        </div>

        {/* Caption Textarea */}
        <textarea
          rows={7}
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={
            activeTab === 'master'
              ? 'Write the main post caption here...'
              : `Customize caption specifically for ${PLATFORM_SPECS[activeTab].name} (leave empty to use Master Caption)...`
          }
          className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-y"
        />

        {/* Hashtag Suggestions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-[var(--muted)] flex items-center gap-1">
            <Hash className="w-3.5 h-3.5" /> Suggested:
          </span>
          {SUGGESTED_HASHTAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddHashtag(tag)}
              className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* CALL TO ACTION (CTA) SELECTOR */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Call to Action (CTA)
          </label>
          <span className="text-[11px] text-[var(--muted)]">Tracks button/link clicks per CTA</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(
            [
              { type: 'none', label: 'None' },
              { type: 'link', label: 'Link' },
              { type: 'book', label: 'Book' },
              { type: 'sign up', label: 'Sign Up' },
              { type: 'other', label: 'Other' },
            ] as const
          ).map((opt) => {
            const isSelected = cta === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onSelectCta?.(opt.type)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-text)] font-semibold shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onNavigateBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Format
        </Button>
        <Button
          type="button"
          variant="accent"
          size="md"
          onClick={onProceedToSchedule}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Schedule
        </Button>
      </div>
    </div>
  );
};
