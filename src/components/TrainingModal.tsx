import React from 'react';
import {
  TrainingConfig,
  TutorialState,
  TutorialStepId,
  WeaponId,
  WEAPON_CATALOG,
  ALL_WEAPON_IDS,
  sanitizeTrainingConfig,
} from '../game/rules';

interface TrainingModalProps {
  config: TrainingConfig;
  tutorialState: TutorialState;
  onChange: (next: TrainingConfig) => void;
  onToggleTutorialStep: (stepId: TutorialStepId) => void;
  onSelectTutorialStep: (index: number) => void;
  onResetTutorial: () => void;
  onStartTraining: () => void;
  onClose: () => void;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  config,
  tutorialState,
  onChange,
  onToggleTutorialStep,
  onSelectTutorialStep,
  onResetTutorial,
  onStartTraining,
  onClose,
}) => {
  const updateField = <K extends keyof TrainingConfig>(key: K, value: TrainingConfig[K]) => {
    onChange(sanitizeTrainingConfig({ ...config, [key]: value }));
  };

  const toggleWeapon = (weaponId: WeaponId) => {
    const nextWeapons = {
      ...config.enabledWeapons,
      [weaponId]: !config.enabledWeapons[weaponId],
    };
    if (!ALL_WEAPON_IDS.some((id) => nextWeapons[id])) {
      return;
    }
    onChange(sanitizeTrainingConfig({ ...config, enabledWeapons: nextWeapons }));
  };

  const applyBotPreset = (preset: 'weak' | 'medium' | 'strong') => {
    if (preset === 'weak') {
      onChange(
        sanitizeTrainingConfig({
          ...config,
          botSpeed: 0.75,
          botAccuracy: 28,
          botAggression: 25,
        })
      );
    } else if (preset === 'medium') {
      onChange(
        sanitizeTrainingConfig({
          ...config,
          botSpeed: 1.0,
          botAccuracy: 55,
          botAggression: 45,
        })
      );
    } else {
      onChange(
        sanitizeTrainingConfig({
          ...config,
          botSpeed: 1.3,
          botAccuracy: 85,
          botAggression: 80,
        })
      );
    }
  };

  return (
    <div className="overlay-screen" role="dialog" aria-modal="true" aria-label="Training Mode Configuration">
      <div className="panel-card training-modal-card" dir="rtl">
        <div className="training-modal-header">
          <div>
            <h2 className="game-logo" style={{ fontSize: '20px', marginBottom: '2px' }}>
              TRAINING <span>RANGE</span> · بخش تمرین و آموزش
            </h2>
            <p className="game-subtitle" style={{ marginBottom: 0 }}>
              شخصی‌سازی بات‌ها (سرعت، دقت، تهاجم)، تعداد اسپاون، ۷ سلاح تاکتیکی و چک‌لیست مراحل آموزشی
            </p>
          </div>
        </div>

        {/* 1. Bot AI Customization */}
        <div className="settings-section-title">
          <span>۱. هوش مصنوعی و سختی بات‌ها (Bot AI Tuning)</span>
          <div className="preset-quick-btns">
            <button
              type="button"
              className="mini-preset-btn"
              onClick={() => applyBotPreset('weak')}
              aria-label="Preset Easy Bots"
            >
              ضعیف (Easy)
            </button>
            <button
              type="button"
              className="mini-preset-btn"
              onClick={() => applyBotPreset('medium')}
              aria-label="Preset Medium Bots"
            >
              متوسط (Medium)
            </button>
            <button
              type="button"
              className="mini-preset-btn"
              onClick={() => applyBotPreset('strong')}
              aria-label="Preset Hard Bots"
            >
              حرفه‌ای (Hard)
            </button>
          </div>
        </div>

        <div className="setting-row">
          <label htmlFor="train-bot-speed">
            سرعت حرکت بات‌ها (Speed): <strong className="val-highlight">{Math.round(config.botSpeed * 100)}%</strong>
          </label>
          <input
            id="train-bot-speed"
            type="range"
            min="0.4"
            max="1.8"
            step="0.05"
            value={config.botSpeed}
            onChange={(e) => updateField('botSpeed', parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-row">
          <label htmlFor="train-bot-accuracy">
            دقت تیراندازی بات‌ها (Accuracy): <strong className="val-highlight">{config.botAccuracy}%</strong>
          </label>
          <input
            id="train-bot-accuracy"
            type="range"
            min="10"
            max="100"
            step="5"
            value={config.botAccuracy}
            onChange={(e) => updateField('botAccuracy', parseInt(e.target.value, 10))}
          />
        </div>

        <div className="setting-row">
          <label htmlFor="train-bot-aggression">
            میزان تهاجم و سرعت شلیک (Aggression): <strong className="val-highlight">{config.botAggression}%</strong>
          </label>
          <input
            id="train-bot-aggression"
            type="range"
            min="10"
            max="100"
            step="5"
            value={config.botAggression}
            onChange={(e) => updateField('botAggression', parseInt(e.target.value, 10))}
          />
        </div>

        {/* 2. Bot Spawn Count & Arena Rules */}
        <div className="settings-section-title">
          <span>۲. تعداد بات‌ها و قوانین میدان تمرین (Spawn & Rules)</span>
        </div>

        <div className="setting-row">
          <label htmlFor="train-spawn-count">
            تعداد بات هم‌زمان (Spawn Count): <strong className="val-highlight">{config.spawnCount} بات</strong>
          </label>
          <input
            id="train-spawn-count"
            type="range"
            min="0"
            max="12"
            step="1"
            value={config.spawnCount}
            onChange={(e) => updateField('spawnCount', parseInt(e.target.value, 10))}
          />
        </div>

        <div className="training-toggles-grid">
          <label className="toggle-check-card">
            <input
              type="checkbox"
              checked={config.autoRespawnBots}
              onChange={(e) => updateField('autoRespawnBots', e.target.checked)}
            />
            <span>اسپاون خودکار بات جدید پس از حذف</span>
          </label>

          <label className="toggle-check-card">
            <input
              type="checkbox"
              checked={config.infiniteAmmo}
              onChange={(e) => updateField('infiniteAmmo', e.target.checked)}
            />
            <span>مهمات بی‌نهایت (Infinite Reserve)</span>
          </label>
        </div>

        {/* 3. Available Weapons Loadout (10 Weapons) */}
        <div className="settings-section-title">
          <span>۳. انتخاب سلاح‌های مجاز در تمرین (10 Tactical Weapons)</span>
        </div>

        <div className="weapon-loadout-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))' }}>
          {WEAPON_CATALOG.map((w) => {
            const enabled = Boolean(config.enabledWeapons[w.id]);
            return (
              <button
                key={w.id}
                type="button"
                role="checkbox"
                aria-checked={enabled}
                aria-label={`Toggle ${w.nameEn}`}
                className={`loadout-card ${enabled ? 'selected' : ''}`}
                onClick={() => toggleWeapon(w.id)}
              >
                <strong>{w.nameEn}</strong>
                <span>{w.nameFa}</span>
                <span className="loadout-state">{enabled ? 'فعال' : 'غیرفعال'}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Detailed Tutorial Stages & Interactive Completion Checklist */}
        <div className="settings-section-title">
          <span>۴. راهنمای جامع مراحل آموزشی و چک‌لیست انجام (Tutorial Checklist)</span>
          <div className="tutorial-checklist-summary-pill">
            <span>پیشرفت کل:</span>
            <b dir="ltr" style={{ display: 'inline-block' }}>
              {tutorialState.steps.filter((s) => s.completed).length} / {tutorialState.steps.length}
            </b>
            <span>
              ({Math.round((tutorialState.steps.filter((s) => s.completed).length / Math.max(1, tutorialState.steps.length)) * 100)}%)
            </span>
            <button
              type="button"
              className="mini-preset-btn"
              onClick={onResetTutorial}
              aria-label="Reset Tutorial Checklist"
              data-testid="modal-reset-tutorial-btn"
            >
              بازنشانی چک‌لیست
            </button>
          </div>
        </div>

        <div className="tutorial-overall-progress-track" aria-hidden="true">
          <div
            className="tutorial-overall-progress-fill"
            style={{
              width: `${Math.round(
                (tutorialState.steps.filter((s) => s.completed).length / Math.max(1, tutorialState.steps.length)) * 100
              )}%`,
            }}
          />
        </div>

        <label className="toggle-check-card" style={{ marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={config.tutorialEnabled}
            onChange={(e) => updateField('tutorialEnabled', e.target.checked)}
          />
          <span>نمایش پنل راهنمای گام‌به‌گام و ردیاب زنده چک‌لیست در بالای صفحه تمرین</span>
        </label>

        <div className="tutorial-checklist-list" role="list" aria-label="Tutorial Steps Checklist">
          {tutorialState.steps.map((step, idx) => {
            const isFocused = idx === tutorialState.activeStepIndex;
            const stepPercent = Math.min(100, Math.round((step.current / step.target) * 100));

            return (
              <div
                key={step.id}
                role="listitem"
                data-testid={`checklist-card-${step.id}`}
                className={`tutorial-checklist-card ${step.completed ? 'is-completed' : ''} ${
                  isFocused ? 'is-focused' : ''
                }`}
              >
                <div className="tut-check-card-header">
                  <div className="tut-check-title-group">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={step.completed}
                      aria-label={`Mark ${step.titleEn} completed`}
                      data-testid={`checklist-toggle-${step.id}`}
                      className={`tut-check-box-btn ${step.completed ? 'checked' : ''}`}
                      onClick={() => onToggleTutorialStep(step.id)}
                    >
                      {step.completed ? '✓' : idx + 1}
                    </button>
                    <div>
                      <div className="tut-check-step-title">
                        <strong>{step.titleFa}</strong>
                        <span className="tut-check-en-tag" dir="ltr">
                          {step.titleEn}
                        </span>
                      </div>
                      <p className="tut-check-summary">{step.instructionFa}</p>
                    </div>
                  </div>

                  <div className="tut-check-actions-col">
                    <span className={`tut-status-badge ${step.completed ? 'done' : 'pending'}`}>
                      {step.completed ? 'تکمیل شد' : 'در انتظار انجام'}
                    </span>
                    <button
                      type="button"
                      className={`tut-focus-btn ${isFocused ? 'active' : ''}`}
                      onClick={() => onSelectTutorialStep(idx)}
                      data-testid={`checklist-focus-${step.id}`}
                    >
                      {isFocused ? 'مرحله فعال' : 'انتخاب تمرین'}
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Numeric Target */}
                <div className="tut-check-progress-row">
                  <div className="tut-check-progress-bar">
                    <div
                      className="tut-check-progress-fill"
                      style={{ width: `${stepPercent}%` }}
                    />
                  </div>
                  <span className="tut-check-progress-text">
                    هدف مرحله:{' '}
                    <b dir="ltr" style={{ display: 'inline-block' }}>
                      {Math.floor(step.current)} / {step.target}
                    </b>{' '}
                    {step.unitLabelFa}
                  </span>
                </div>

                {/* Detailed Mechanics Explanation Bullet Points */}
                <ul className="tut-detailed-points">
                  {step.detailedPointsFa.map((point, pIdx) => (
                    <li key={pIdx} className={step.completed ? 'point-done' : ''}>
                      <span className="point-bullet" aria-hidden="true">
                        {step.completed ? '✓' : '–'}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {/* Controls Hint & Pro Tip Footer */}
                <div className="tut-check-card-footer">
                  <div className="tut-footer-chip controls-chip">{step.controlsHintFa}</div>
                  <div className="tut-footer-chip protip-chip">{step.proTipFa}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions-row">
          <button
            type="button"
            className="primary-btn"
            onClick={onStartTraining}
            data-testid="start-training-btn"
          >
            ورود به میدان تمرین و آموزش
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            بازگشت
          </button>
        </div>
      </div>
    </div>
  );
};
