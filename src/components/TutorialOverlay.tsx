import React, { useState } from 'react';
import { TutorialState, TutorialStepId, TrainingConfig } from '../game/rules';

interface TutorialOverlayProps {
  tutorialState: TutorialState;
  trainingConfig: TrainingConfig;
  onSelectStep: (index: number) => void;
  onCompleteCurrentStep: () => void;
  onResetTutorial: () => void;
  onSpawnBot: () => void;
  onClearBots: () => void;
  onRefillAll: () => void;
  onOpenTrainingConfig: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorialState,
  trainingConfig,
  onSelectStep,
  onCompleteCurrentStep,
  onResetTutorial,
  onSpawnBot,
  onClearBots,
  onRefillAll,
  onOpenTrainingConfig,
}) => {
  // On mobile landscape / compact viewports, start with the detailed lesson card collapsed so sightline is clear
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight < 540 || window.innerWidth < 760;
    }
    return false;
  });
  // Allow user to push the entire panel out of the way into a tiny top-edge pill
  const [minimizedToPill, setMinimizedToPill] = useState(false);

  const currentStep = tutorialState.steps[tutorialState.activeStepIndex] || tutorialState.steps[0];
  const completedCount = tutorialState.steps.filter((s) => s.completed).length;

  const stepLabelCode = (id: TutorialStepId) => {
    switch (id) {
      case 'movement':
        return 'M1';
      case 'shooting':
        return 'M2';
      case 'reloading':
        return 'M3';
      case 'powerups':
        return 'M4';
    }
  };

  if (minimizedToPill) {
    return (
      <div
        className="training-minimized-pill-wrap"
        dir="rtl"
        data-testid="training-minimized-pill"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="training-minimized-pill-btn"
          data-testid="btn-restore-training-panel"
          onClick={(e) => {
            e.currentTarget.blur();
            setMinimizedToPill(false);
          }}
        >
          <span>پنل تمرین و مراحل</span>
          <b dir="ltr" style={{ display: 'inline-block' }}>
            ({completedCount}/{tutorialState.steps.length})
          </b>
          <span className="pill-expand-hint">باز کردن</span>
        </button>
        <button
          type="button"
          className="training-minimized-quick-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onSpawnBot();
          }}
          title="افزودن بات"
        >
          + بات
        </button>
        <button
          type="button"
          className="training-minimized-quick-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onRefillAll();
          }}
          title="شارژ مهمات و سلامت"
        >
          شارژ
        </button>
      </div>
    );
  }

  return (
    <div
      className="training-hud-panel"
      dir="rtl"
      data-testid="training-hud-panel"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Top Compact Bar with Sandbox Controls & Dismiss/Collapse Buttons */}
      <div className="training-hud-topbar">
        <div className="training-mode-title">
          <span className="training-tag">TRAINING</span>
          <span className="training-meta-inline">
            بات: <b>{Math.round(trainingConfig.botSpeed * 100)}%</b> · دقت: <b>{trainingConfig.botAccuracy}%</b>
          </span>
        </div>

        <div className="training-sandbox-btns">
          <button
            type="button"
            className="sandbox-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onSpawnBot();
            }}
            title="افزودن بات تمرینی به میدان"
          >
            + اسپاون بات
          </button>
          <button
            type="button"
            className="sandbox-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onClearBots();
            }}
            title="حذف تمام بات‌های میدان"
          >
            پاکسازی
          </button>
          <button
            type="button"
            className="sandbox-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onRefillAll();
            }}
            title="پر کردن مهمات، سلامت، زره و شارژ قدرت آدرنالین"
          >
            شارژ کامل
          </button>
          <button
            type="button"
            className="sandbox-btn accent"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenTrainingConfig();
            }}
            title="تغییر تنظیمات تمرین و سلاح‌ها"
          >
            تنظیمات تمرین
          </button>
          {trainingConfig.tutorialEnabled && (
            <button
              type="button"
              className="sandbox-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setCollapsed(!collapsed);
              }}
              aria-label={collapsed ? 'Show Tutorial Guide' : 'Hide Tutorial Guide'}
            >
              {collapsed ? 'شرح مرحله' : 'جمع کردن'}
            </button>
          )}
          <button
            type="button"
            className="sandbox-btn dismiss-pill-btn"
            data-testid="btn-minimize-training-panel"
            onClick={(e) => {
              e.currentTarget.blur();
              setMinimizedToPill(true);
            }}
            title="کنار زدن کامل پنل برای دید باز در حالت تمام‌صفحه"
          >
            کنار زدن پنل
          </button>
        </div>
      </div>

      {/* Interactive Tutorial Stepper & Lesson Card */}
      {trainingConfig.tutorialEnabled && !collapsed && (
        <div className="tutorial-body-card" data-testid="tutorial-lesson-card">
          <div className="tutorial-steps-tabs" role="tablist" aria-label="Tutorial Lessons">
            {tutorialState.steps.map((step, idx) => {
              const isActive = idx === tutorialState.activeStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`tut-tab-btn ${isActive ? 'active' : ''} ${step.completed ? 'done' : ''}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectStep(idx);
                  }}
                >
                  <span>{step.completed ? '✓' : stepLabelCode(step.id)}</span>
                  <span>
                    {idx + 1}.{' '}
                    {step.id === 'movement'
                      ? 'حرکت'
                      : step.id === 'shooting'
                        ? 'تیراندازی'
                        : step.id === 'reloading'
                          ? 'خشاب و سلاح'
                          : 'قدرت‌ها'}
                  </span>
                </button>
              );
            })}
            <span className="tut-overall-progress">
              پیشرفت:{' '}
              <b dir="ltr" style={{ display: 'inline-block' }}>
                {completedCount} / {tutorialState.steps.length}
              </b>
            </span>
          </div>

          <div className="tutorial-active-content">
            <div className="tut-lesson-main">
              <div className="tut-lesson-header">
                <h4>{currentStep.titleFa}</h4>
                <span className="tut-step-counter">
                  <b dir="ltr" style={{ display: 'inline-block' }}>
                    {Math.floor(currentStep.current)} / {currentStep.target}
                  </b>{' '}
                  {currentStep.completed ? '(تکمیل شد)' : '(در حال انجام)'}
                </span>
              </div>
              <p className="tut-instruction-text">{currentStep.instructionFa}</p>
              <div className="tut-controls-hint">{currentStep.controlsHintFa}</div>
            </div>

            <div className="tut-lesson-actions">
              <div className="tut-progress-bar-bg">
                <div
                  className="tut-progress-bar-fill"
                  style={{
                    width: `${Math.min(100, (currentStep.current / currentStep.target) * 100)}%`,
                  }}
                />
              </div>

              <div className="tut-action-buttons">
                {!currentStep.completed && (
                  <button
                    type="button"
                    className="sandbox-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onCompleteCurrentStep();
                    }}
                  >
                    تکمیل مرحله
                  </button>
                )}
                <button
                  type="button"
                  className="sandbox-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onResetTutorial();
                  }}
                >
                  شروع مجدد
                </button>
                <button
                  type="button"
                  className="sandbox-btn dismiss-pill-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMinimizedToPill(true);
                  }}
                >
                  بستن مزاحمت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
