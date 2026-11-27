import React, { useEffect, useState, useRef } from 'react';
import {
  ALL_CONTROL_SLOT_IDS,
  CONTROL_SLOT_META,
  ControlSlotId,
  CustomControlsLayout,
  clampControlSlot,
  getDefaultControlLayout,
} from '../game/controlLayout';
import type { HudLayoutPreset } from '../game/rules';

interface ControlsLayoutEditorProps {
  initialLayout: CustomControlsLayout;
  activePreset: HudLayoutPreset;
  slideEnabled?: boolean;
  controlsStyle?: 'glass' | 'classic';
  onSave: (nextLayout: CustomControlsLayout) => void;
  onResetDefault: (defaultLayout: CustomControlsLayout) => void;
  onClose: () => void;
}

export const ControlsLayoutEditor: React.FC<ControlsLayoutEditorProps> = ({
  initialLayout,
  activePreset,
  slideEnabled = false,
  controlsStyle = 'classic',
  onSave,
  onResetDefault,
  onClose,
}) => {
  const visibleSlotIds = ALL_CONTROL_SLOT_IDS.filter((id) => (id === 'slide' ? slideEnabled : true));
  const [draftLayout, setDraftLayout] = useState<CustomControlsLayout>(() => ({ ...initialLayout }));
  const [selectedId, setSelectedId] = useState<ControlSlotId>('fire');
  const [draggingId, setDraggingId] = useState<ControlSlotId | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const selectedSlot = draftLayout[selectedId];
  const selectedMeta = CONTROL_SLOT_META[selectedId];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const updateSlot = (id: ControlSlotId, patch: Partial<CustomControlsLayout[ControlSlotId]>) => {
    setDraftLayout((prev) => ({
      ...prev,
      [id]: clampControlSlot(id, { ...prev[id], ...patch }, prev[id]),
    }));
  };

  const handlePointerDownControl = (id: ControlSlotId, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    setDraggingId(id);
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const currentPxX = (draftLayout[id].xPct / 100) * rect.width;
    const currentPxY = (draftLayout[id].yPct / 100) * rect.height;
    dragOffsetRef.current = {
      dx: e.clientX - (rect.left + currentPxX),
      dy: e.clientY - (rect.top + currentPxY),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMoveControl = (id: ControlSlotId, e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId !== id) return;
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const targetPxX = e.clientX - rect.left - dragOffsetRef.current.dx;
    const targetPxY = e.clientY - rect.top - dragOffsetRef.current.dy;
    const xPct = (targetPxX / rect.width) * 100;
    const yPct = (targetPxY / rect.height) * 100;
    updateSlot(id, { xPct, yPct });
  };

  const handlePointerUpControl = (id: ControlSlotId, e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId !== id) return;
    setDraggingId(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handleReset = () => {
    const fresh = getDefaultControlLayout(activePreset);
    setDraftLayout(fresh);
    onResetDefault(fresh);
  };

  const handleSave = () => {
    onSave(draftLayout);
  };

  return (
    <div
      id="controls-layout-editor"
      data-testid="controls-layout-editor"
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label="ویرایش چیدمان کنترل‌ها"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(4, 9, 18, 0.88)',
        touchAction: 'none',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Subtle tactical grid & HUD safe reference zones */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          pointerEvents: 'none',
        }}
      />

      {/* Reference outline for Bottom Weapon Bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(270px, 66vw)',
          height: '78px',
          border: '1px dashed rgba(148, 163, 184, 0.35)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(148, 163, 184, 0.55)',
          fontSize: '10px',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        محدوده نوار سلامت و اسلحه‌ها
      </div>

      {/* Top Floating Inspector & Action Bar */}
      <div
        dir="rtl"
        style={{
          position: 'absolute',
          top: 'max(8px, env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(620px, calc(100vw - 16px))',
          background: 'rgba(10, 14, 20, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '10px',
          padding: '8px 10px',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ color: '#f1f5f9', fontSize: '12px' }}>ویرایش چیدمان کنترل‌ها</strong>
            <span
              data-testid="layout-editor-selected-label"
              style={{
                fontSize: '10.5px',
                color: '#bae6fd',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '6px',
                padding: '2px 7px',
                fontWeight: 700,
              }}
            >
              {selectedMeta.labelFa}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="btn-reset-layout"
              onClick={handleReset}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '4px 9px',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              پیش‌فرض
            </button>
            <button
              type="button"
              data-testid="btn-save-layout"
              onClick={handleSave}
              style={{
                background: '#38bdf8',
                border: '1px solid #38bdf8',
                color: '#061018',
                borderRadius: '6px',
                padding: '4px 11px',
                fontSize: '10.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ذخیره
            </button>
            <button
              type="button"
              data-testid="btn-cancel-layout"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '4px 9px',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              انصراف
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10.5px',
              color: '#cbd5e1',
              fontWeight: 600,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              اندازه: <b style={{ color: '#38bdf8' }}>{Math.round(selectedSlot.scale * 100)}%</b>
            </span>
            <input
              type="range"
              data-testid="layout-editor-scale-slider"
              aria-label="اندازه دکمه انتخاب‌شده"
              min="0.65"
              max="1.6"
              step="0.05"
              value={selectedSlot.scale}
              onChange={(e) => updateSlot(selectedId, { scale: parseFloat(e.target.value) })}
              style={{ flex: 1, minWidth: '60px', accentColor: '#38bdf8' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10.5px',
              color: '#cbd5e1',
              fontWeight: 600,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              شفافیت: <b style={{ color: '#38bdf8' }}>{Math.round(selectedSlot.opacity * 100)}%</b>
            </span>
            <input
              type="range"
              data-testid="layout-editor-opacity-slider"
              aria-label="شفافیت دکمه انتخاب‌شده"
              min="0.25"
              max="1"
              step="0.05"
              value={selectedSlot.opacity}
              onChange={(e) => updateSlot(selectedId, { opacity: parseFloat(e.target.value) })}
              style={{ flex: 1, minWidth: '60px', accentColor: '#38bdf8' }}
            />
          </label>
        </div>

        <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
          هر دکمه را بکشید تا جابه‌جا شود، سپس اندازه و شفافیت آن را تنظیم و ذخیره کنید.
        </div>
      </div>

      {/* Draggable Control Nodes */}
      {visibleSlotIds.map((id) => {
        const slot = draftLayout[id];
        const meta = CONTROL_SLOT_META[id];
        const isSelected = selectedId === id;
        const isDragging = draggingId === id;
        return (
          <div
            key={id}
            data-testid={`editor-control-${id}`}
            data-x-pct={slot.xPct}
            data-y-pct={slot.yPct}
            data-scale={slot.scale}
            data-opacity={slot.opacity}
            role="button"
            tabIndex={0}
            aria-label={`جابه‌جایی ${meta.labelFa}`}
            onPointerDown={(e) => handlePointerDownControl(id, e)}
            onPointerMove={(e) => handlePointerMoveControl(id, e)}
            onPointerUp={(e) => handlePointerUpControl(id, e)}
            onPointerCancel={(e) => handlePointerUpControl(id, e)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedId(id);
              }
            }}
            style={{
              position: 'absolute',
              left: `${slot.xPct}%`,
              top: `${slot.yPct}%`,
              width: `${meta.baseSizePx}px`,
              height: `${meta.baseSizePx}px`,
              transform: `translate(-50%, -50%) scale(${slot.scale})`,
              opacity: slot.opacity,
              borderRadius: '50%',
              background:
                controlsStyle === 'glass'
                  ? id === 'fire'
                    ? 'linear-gradient(155deg, rgba(239, 68, 68, 0.46), rgba(136, 19, 55, 0.7))'
                    : id === 'joystick'
                      ? 'radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.14), rgba(10, 18, 34, 0.46))'
                      : 'linear-gradient(155deg, rgba(26, 40, 68, 0.64), rgba(9, 16, 31, 0.76))'
                  : id === 'fire'
                    ? 'rgba(244, 63, 94, 0.24)'
                    : id === 'joystick'
                      ? 'rgba(8, 12, 18, 0.24)'
                      : 'rgba(8, 12, 18, 0.36)',
              border: isSelected
                ? '1.5px solid #38bdf8'
                : id === 'fire' && controlsStyle === 'classic'
                  ? '1px solid rgba(244, 63, 94, 0.62)'
                  : '1px solid rgba(255, 255, 255, 0.26)',
              boxShadow: isSelected
                ? '0 0 0 3px rgba(56, 189, 248, 0.22)'
                : controlsStyle === 'glass'
                  ? 'inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 4px 12px rgba(2, 6, 23, 0.34)'
                  : 'none',
              color: '#f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              zIndex: isSelected ? 65 : 62,
            }}
          >
            {id === 'joystick' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(241, 245, 249, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.65)',
                  pointerEvents: 'none',
                }}
              />
            )}
            <span
              style={{
                fontSize: id === 'joystick' ? '8.5px' : '9px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                pointerEvents: 'none',
              }}
            >
              {meta.shortLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};
