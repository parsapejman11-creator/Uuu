import React, { useState } from 'react';
import {
  AntiCheatState,
  APPROVED_OWNER_NAME_FA,
  BannedPlayerRecord,
  validateExclusiveNameRegistry,
  verifyAdminAccountLogin,
} from '../game/rules';

interface AdminPanelModalProps {
  isAdminLoggedIn: boolean;
  adminUsername: string;
  strictNameRegistry: boolean;
  antiCheatState: AntiCheatState;
  bannedPlayers: BannedPlayerRecord[];
  onAdminLoginSuccess: (canonicalName: string) => void;
  onAdminLogout: () => void;
  onToggleStrictNameRegistry: (enabled: boolean) => void;
  onToggleAntiCheatEnabled: (enabled: boolean) => void;
  onToggleAdminImmunity: (immune: boolean) => void;
  onTriggerTestAntiCheatBan: () => void;
  onUnbanSelfAndClear: () => void;
  onBanPlayerByName: (targetName: string, reasonFa: string) => void;
  onUnbanPlayerById: (id: string) => void;
  onAdminEnableAllCheats: () => void;
  onAdminKillAllBots: () => void;
  onAdminRefillAll: () => void;
  onAdminAddBonusScore: () => void;
  onAdminSpawnBots: () => void;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isAdminLoggedIn,
  adminUsername,
  strictNameRegistry,
  antiCheatState,
  bannedPlayers,
  onAdminLoginSuccess,
  onAdminLogout,
  onToggleStrictNameRegistry,
  onToggleAntiCheatEnabled,
  onToggleAdminImmunity,
  onTriggerTestAntiCheatBan,
  onUnbanSelfAndClear,
  onBanPlayerByName,
  onUnbanPlayerById,
  onAdminEnableAllCheats,
  onAdminKillAllBots,
  onAdminRefillAll,
  onAdminAddBonusScore,
  onAdminSpawnBots,
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState(APPROVED_OWNER_NAME_FA);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [registryTestInput, setRegistryTestInput] = useState('');
  const [registryTestMessage, setRegistryTestMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [manualBanName, setManualBanName] = useState('');
  const [adminActionToast, setAdminActionToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setAdminActionToast(msg);
    window.setTimeout(() => {
      setAdminActionToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = verifyAdminAccountLogin(usernameInput, passwordInput);
    if (!res.ok) {
      setLoginError(res.errorFa || 'اطلاعات ورود به اکانت ادمین نامعتبر است.');
      return;
    }
    setLoginError(null);
    setPasswordInput('');
    onAdminLoginSuccess(res.canonicalName);
    triggerToast('خوش آمدید پارسا — دسترسی کامل ادمین و اسم‌خونه فعال شد.');
  };

  const handleCheckNameInRegistry = () => {
    const res = validateExclusiveNameRegistry(registryTestInput, strictNameRegistry);
    if (res.valid) {
      setRegistryTestMessage({
        ok: true,
        text: `نام «${res.canonicalName}» در اسم‌خونه تایید شد و مجاز به فعالیت آنلاین است.`,
      });
    } else {
      setRegistryTestMessage({
        ok: false,
        text: res.errorFa || 'این نام در اسم‌خونه مجاز نیست.',
      });
    }
  };

  const handleManualBanSubmit = () => {
    const trimmed = manualBanName.trim();
    if (!trimmed) return;
    onBanPlayerByName(trimmed, 'بن مستقیم توسط ادمین کل (پارسا) به دلیل تخلف / هدشات مشکوک');
    setManualBanName('');
    triggerToast(`پلیر «${trimmed}» توسط ادمین بن شد.`);
  };

  return (
    <div
      id="admin-panel-screen"
      data-testid="admin-panel-modal"
      className="overlay-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Panel and Exclusive Name Registry"
    >
      <div
        className="panel-card settings-minimal-card"
        dir="rtl"
        style={{
          maxWidth: '680px',
          border: '1.5px solid rgba(251, 191, 36, 0.45)',
          boxShadow: '0 22px 60px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid rgba(251, 191, 36, 0.22)',
            paddingBottom: '8px',
            marginBottom: '10px',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div className="game-logo" style={{ fontSize: '19px', color: '#fbbf24' }}>
              اکانت اختصاصی، اسم‌خونه و پنل ادمین · <span>ADMIN OPS</span>
            </div>
            <div className="game-subtitle" style={{ marginBottom: 0 }}>
              سیستم اسم‌خونه انحصاری «پارسا»، آنتی‌چیت هوشمند تشخیص هدشات و کنترل کامل سرور
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-admin-modal"
            className="secondary-btn"
            style={{ width: 'auto', marginTop: 0, padding: '6px 14px' }}
            onClick={onClose}
          >
            بستن
          </button>
        </div>

        {adminActionToast && (
          <div
            data-testid="admin-action-toast"
            style={{
              background: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#6ee7b7',
              borderRadius: '8px',
              padding: '7px 11px',
              fontSize: '11.5px',
              fontWeight: 800,
              marginBottom: '10px',
              textAlign: 'right',
            }}
          >
            {adminActionToast}
          </div>
        )}

        {/* Exclusive Name Registry ("اسم‌خونه") Box — Always Visible */}
        <div
          data-testid="exclusive-name-registry-box"
          style={{
            background: 'rgba(15, 23, 38, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.32)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <strong style={{ fontSize: '12px', color: '#38bdf8' }}>
              اسم‌خونه انحصاری بازی (Exclusive Name Registry)
            </strong>
            <span
              data-testid="name-registry-approved-badge"
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#6ee7b7',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              تنها نام مجاز و ثبت‌شده: {APPROVED_OWNER_NAME_FA}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '7px', lineHeight: 1.5 }}>
            در اسم‌خونه این بازی فقط نام <b style={{ color: '#fbbf24' }}>«پارسا»</b> تایید می‌شود و هیچ شخص دیگری نمی‌تواند نام دیگری برای اکانت یا لابی آنلاین ثبت کند.
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              data-testid="input-name-registry-check"
              placeholder="بررسی نام در اسم‌خونه (مثلاً پارسا یا نام دیگر)..."
              value={registryTestInput}
              onChange={(e) => {
                setRegistryTestInput(e.target.value);
                if (registryTestMessage) setRegistryTestMessage(null);
              }}
              style={{
                flex: 1,
                background: '#070b12',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <button
              type="button"
              data-testid="btn-verify-name-registry"
              className="cheat-unlock-btn"
              onClick={handleCheckNameInRegistry}
            >
              بررسی در اسم‌خونه
            </button>
          </div>
          {registryTestMessage && (
            <div
              data-testid="name-registry-check-result"
              style={{
                marginTop: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: registryTestMessage.ok ? '#6ee7b7' : '#fda4af',
              }}
            >
              {registryTestMessage.text}
            </div>
          )}
        </div>

        {/* Account Login Gate OR Admin Control Center */}
        {!isAdminLoggedIn ? (
          <form
            onSubmit={handleLoginSubmit}
            data-testid="admin-login-gate"
            style={{
              background: 'linear-gradient(160deg, rgba(24, 18, 10, 0.92), rgba(10, 14, 24, 0.96))',
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
              borderRadius: '11px',
              padding: '12px 14px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#fbbf24', marginBottom: '4px' }}>
              ورود به اکانت اختصاصی ادمین (ویژه شخص پارسا)
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '10px', lineHeight: 1.5 }}>
              برای ورود به اکانت خود و باز کردن پنل مدیریت کل، نام تاییدشده در اسم‌خونه (<b>پارسا</b>) و رمز اختصاصی خود را وارد کنید:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label
                  htmlFor="admin-username-input"
                  style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}
                >
                  نام کاربری (فقط پارسا مجاز است)
                </label>
                <input
                  id="admin-username-input"
                  data-testid="input-admin-username"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="پارسا"
                  style={{
                    width: '100%',
                    background: '#070b12',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    color: '#fef08a',
                    fontSize: '12.5px',
                    fontWeight: 800,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}
                >
                  رمز اختصاصی اکانت ادمین
                </label>
                <input
                  id="admin-password-input"
                  data-testid="input-admin-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="رمز اختصاصی..."
                  style={{
                    width: '100%',
                    background: '#070b12',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    color: '#f8fafc',
                    fontSize: '12.5px',
                  }}
                />
              </div>
            </div>

            {loginError && (
              <div
                data-testid="admin-login-error"
                style={{
                  background: 'rgba(244, 63, 94, 0.14)',
                  border: '1px solid rgba(244, 63, 94, 0.45)',
                  color: '#fda4af',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              data-testid="btn-admin-login-submit"
              className="primary-btn"
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                color: '#090d16',
                padding: '10px 16px',
                fontSize: '13.5px',
              }}
            >
              ورود به اکانت «پارسا» و فعال‌سازی پنل ادمین
            </button>
          </form>
        ) : (
          <div data-testid="admin-dashboard-content" style={{ textAlign: 'right' }}>
            {/* Logged-in Admin Status Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.45)',
                borderRadius: '9px',
                padding: '8px 12px',
                marginBottom: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#fde68a' }}>
                  اکانت فعال: <span data-testid="admin-active-username">{adminUsername}</span> · سطح دسترسی: ادمین کل (Supreme Admin)
                </div>
                <div style={{ fontSize: '10.5px', color: '#cbd5e1' }}>
                  تمامی دسترسی‌های آنتی‌چیت، بن/رفع بن، اسم‌خونه و دستورات ویژه بازی برای شما باز است.
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-admin-logout"
                className="secondary-btn"
                style={{
                  width: 'auto',
                  marginTop: 0,
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderColor: 'rgba(244, 63, 94, 0.45)',
                  color: '#fda4af',
                }}
                onClick={onAdminLogout}
              >
                خروج از اکانت
              </button>
            </div>

            {/* Section 1: Vanguard Anti-Cheat & Headshot Detection Controls */}
            <div className="settings-section-title" style={{ marginTop: '6px' }}>
              <span>۱. مدیریت آنتی‌چیت قوی (تشخیص هدشات غیرطبیعی و ایم‌بات)</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  background: 'rgba(10, 16, 28, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>وضعیت سپر آنتی‌چیت</div>
                <strong
                  data-testid="anticheat-status-readout"
                  style={{
                    fontSize: '11.5px',
                    color: antiCheatState.banned
                      ? '#ff2e4c'
                      : antiCheatState.enabled
                        ? '#00e676'
                        : '#f59e0b',
                  }}
                >
                  {antiCheatState.banned
                    ? 'مسدود (BANNED)'
                    : antiCheatState.enabled
                      ? 'فعال و آماده'
                      : 'غیرفعال'}
                </strong>
              </div>

              <div
                style={{
                  background: 'rgba(10, 16, 28, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>هدشات پیاپی / کل</div>
                <strong style={{ fontSize: '11.5px', color: '#38bdf8' }}>
                  {antiCheatState.consecutiveHeadshots} پیاپی ({antiCheatState.totalHeadshots}/{antiCheatState.totalHits})
                </strong>
              </div>

              <div
                style={{
                  background: 'rgba(10, 16, 28, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>درجه مشکوک بودن به چیت</div>
                <strong
                  style={{
                    fontSize: '11.5px',
                    color: antiCheatState.suspicionScore >= 50 ? '#ff2e4c' : '#00e676',
                  }}
                >
                  {Math.round(antiCheatState.suspicionScore)}%
                </strong>
              </div>
            </div>

            <div className="setting-row">
              <label htmlFor="admin-ac-enabled">سیستم آنتی‌چیت قوی (تشخیص هدشات پیاپی و بن خودکار)</label>
              <select
                id="admin-ac-enabled"
                data-testid="toggle-anticheat-enabled"
                value={antiCheatState.enabled ? 'on' : 'off'}
                onChange={(e) => onToggleAntiCheatEnabled(e.target.value === 'on')}
              >
                <option value="on">فعال (تشخیص و بن خودکار چیت و هدشات غیرطبیعی)</option>
                <option value="off">غیرفعال توسط ادمین</option>
              </select>
            </div>

            <div className="setting-row">
              <label htmlFor="admin-ac-immunity">معافیت اکانت ادمین (پارسا) از بن شدن آنتی‌چیت</label>
              <select
                id="admin-ac-immunity"
                data-testid="toggle-admin-immunity"
                value={antiCheatState.adminImmunity ? 'on' : 'off'}
                onChange={(e) => onToggleAdminImmunity(e.target.value === 'on')}
              >
                <option value="on">معاف (پارسا هرگز بن نمی‌شود)</option>
                <option value="off">غیرفعال (بررسی آنتی‌چیت روی همه)</option>
              </select>
            </div>

            <div className="setting-row">
              <label htmlFor="admin-strict-registry">قفل اسم‌خونه آنلاین فقط روی نام «پارسا»</label>
              <select
                id="admin-strict-registry"
                data-testid="toggle-strict-name-registry"
                value={strictNameRegistry ? 'on' : 'off'}
                onChange={(e) => onToggleStrictNameRegistry(e.target.value === 'on')}
              >
                <option value="on">فعال (فقط نام «پارسا» مجاز به ثبت است)</option>
                <option value="off">آزاد</option>
              </select>
            </div>

            {/* Anti-Cheat Test Ban & Instant Unban Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                data-testid="btn-admin-test-ban"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  borderColor: 'rgba(244, 63, 94, 0.55)',
                  background: 'rgba(244, 63, 94, 0.14)',
                  color: '#fda4af',
                  fontSize: '12px',
                }}
                onClick={() => {
                  onTriggerTestAntiCheatBan();
                }}
              >
                تست تشخیص هدشات آنتی‌چیت (بن آزمایشی)
              </button>

              <button
                type="button"
                data-testid="btn-admin-unban-all"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  borderColor: 'rgba(16, 185, 129, 0.55)',
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#6ee7b7',
                  fontSize: '12px',
                }}
                onClick={() => {
                  onUnbanSelfAndClear();
                  triggerToast('تمامی مسدودیت‌های آنتی‌چیت رفع شد.');
                }}
              >
                رفع بن فوری و پاکسازی لیست مسدودیت
              </button>
            </div>

            {/* Manual Player Ban & Banned List */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                data-testid="input-admin-ban-target"
                placeholder="نام یا آیدی پلیر متخلف برای بن کردن..."
                value={manualBanName}
                onChange={(e) => setManualBanName(e.target.value)}
                style={{
                  flex: 1,
                  background: '#070b12',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                data-testid="btn-admin-ban-player"
                className="cheat-unlock-btn"
                style={{ background: '#f43f5e', color: '#ffffff' }}
                onClick={handleManualBanSubmit}
              >
                بن کردن پلیر
              </button>
            </div>

            {bannedPlayers.length > 0 && (
              <div
                data-testid="admin-banned-players-list"
                style={{
                  marginTop: '8px',
                  background: 'rgba(24, 9, 14, 0.85)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#fda4af', fontWeight: 800, marginBottom: '5px' }}>
                  لیست افراد بن‌شده توسط آنتی‌چیت و ادمین ({bannedPlayers.length} مورد):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {bannedPlayers.map((bp) => (
                    <div
                      key={bp.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        background: 'rgba(10, 14, 22, 0.8)',
                        padding: '4px 8px',
                        borderRadius: '5px',
                      }}
                    >
                      <span>
                        <b style={{ color: '#ff4d6d' }}>{bp.name}</b> — {bp.reasonFa} ({bp.headshotRatePct}% HS)
                      </span>
                      <button
                        type="button"
                        data-testid={`btn-unban-${bp.id}`}
                        className="mini-preset-btn"
                        style={{ borderColor: '#10b981', color: '#6ee7b7' }}
                        onClick={() => onUnbanPlayerById(bp.id)}
                      >
                        رفع بن
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Admin Supreme Game & Cheat Controls */}
            <div className="settings-section-title" style={{ marginTop: '10px' }}>
              <span>۲. دستورات ویژه ادمین کل (کنترل کامل بازی و چیت دائمی)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              <button
                type="button"
                data-testid="btn-admin-unlock-all-cheats"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  borderColor: 'rgba(251, 191, 36, 0.55)',
                  background: 'rgba(251, 191, 36, 0.14)',
                  color: '#fde68a',
                }}
                onClick={() => {
                  onAdminEnableAllCheats();
                  triggerToast('تمامی چیت‌ها و قفل ایم‌اسیست به‌صورت دائمی برای ادمین باز شد!');
                }}
              >
                فعال‌سازی کامل تمام چیت‌ها + معافیت ادمین
              </button>

              <button
                type="button"
                data-testid="btn-admin-kill-all-bots"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  borderColor: 'rgba(56, 189, 248, 0.45)',
                  color: '#7dd3fc',
                }}
                onClick={() => {
                  onAdminKillAllBots();
                  triggerToast('تمام بات‌های نقشه توسط ادمین حذف شدند.');
                }}
              >
                حذف فوری تمام دشمنان نقشه (Clear Bots)
              </button>

              <button
                type="button"
                data-testid="btn-admin-refill-all"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  borderColor: 'rgba(16, 185, 129, 0.45)',
                  color: '#6ee7b7',
                }}
                onClick={() => {
                  onAdminRefillAll();
                  triggerToast('خون، زره و مهمات هر ۱۰ سلاح شارژ کامل شد.');
                }}
              >
                شارژ کامل سلامت، زره و تیر تمام گان‌ها
              </button>

              <button
                type="button"
                data-testid="btn-admin-add-score"
                className="secondary-btn"
                style={{
                  marginTop: 0,
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  borderColor: 'rgba(192, 132, 252, 0.45)',
                  color: '#e9d5ff',
                }}
                onClick={() => {
                  onAdminAddBonusScore();
                  triggerToast('+10,000 امتیاز ویژه به حساب ادمین اضافه شد.');
                }}
              >
                افزودن +10,000 امتیاز ویژه ادمین
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-admin-spawn-wave"
              className="secondary-btn"
              style={{
                marginTop: '7px',
                padding: '8px 10px',
                fontSize: '11.5px',
              }}
              onClick={() => {
                onAdminSpawnBots();
                triggerToast('بات‌های جدید توسط ادمین وارد میدان شدند.');
              }}
            >
              اسپاون فوری بات جدید در میدان نبرد
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
