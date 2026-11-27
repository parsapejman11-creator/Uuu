import React, { useMemo } from 'react';
import {
  MAP_LIST,
  computeAccuracyPercent,
  computeMatchSummaryStats,
  formatGameModeFa,
  getTeamColor,
  getTeamNameFa,
  isRoundBasedMode,
  resolveMapVoteWinner,
  sortScoreboardPlayers,
  type AuthoritativeRoomState,
  type CheatConfig,
  type MapId,
  type TeamId,
} from '../game/rules';
import { getCosmeticItem, type CosmeticsState } from '../game/cosmetics';
import type { OnlineRoomSummary } from '../components/OnlineModal';
import { BidiText, GlassButton } from './primitives';
import { resolveMatchIntegrityBadge } from './stage2Helpers';

/* ============================================================================
   LIVE-MATCH & POST-MATCH OVERLAYS (UI v3 — Stage 2)
   STRICT PERFORMANCE LAW:
   All overlays in this file render over a LIVE 3D canvas and therefore enforce
   ZERO backdrop-filter (`backdrop-filter: none !important` in ui-v3.css) so
   gameplay FPS never drops.
   ============================================================================ */

export interface ScoreboardV3Props {
  onlineRoom: OnlineRoomSummary | null;
  localOnlinePlayerId: string;
  onlinePlayerName: string;
  cosmeticsState: CosmeticsState;
  offlineKills: number;
  offlineScore: number;
}

export const ScoreboardV3: React.FC<ScoreboardV3Props> = React.memo(
  ({
    onlineRoom,
    localOnlinePlayerId,
    onlinePlayerName,
    cosmeticsState,
    offlineKills,
    offlineScore,
  }) => {
    const sortedPlayers = useMemo(
      () => (onlineRoom ? sortScoreboardPlayers(onlineRoom.players) : []),
      [onlineRoom]
    );

    const localFrame = getCosmeticItem(cosmeticsState.equipped.name_frame);
    const localBadge = getCosmeticItem(cosmeticsState.equipped.name_badge);

    return (
      <div
        className="uiv3-live-overlay uiv3-scoreboard-overlay"
        data-testid="hud-scoreboard-overlay"
        dir="rtl"
      >
        <div className="uiv3-live-card uiv3-sb-card">
          <div className="uiv3-sb-header">
            <div className="uiv3-sb-title-group">
              <strong className="uiv3-sb-title">جدول امتیازات</strong>
              {onlineRoom && (
                <span className="uiv3-sb-mode-chip">
                  <BidiText text={formatGameModeFa(onlineRoom.mode)} />
                  <span aria-hidden="true"> · </span>
                  <bdi dir="ltr" className="uiv3-bidi-ltr">
                    {onlineRoom.code}
                  </bdi>
                </span>
              )}
            </div>

            {onlineRoom && isRoundBasedMode(onlineRoom.mode) && (
              <div className="uiv3-sb-score-pill">
                <span style={{ color: getTeamColor('alpha') }}>
                  آلفا <b dir="ltr">{onlineRoom.alphaScore ?? 0}</b>
                </span>
                <span className="uiv3-dot" aria-hidden="true">
                  —
                </span>
                <span style={{ color: getTeamColor('bravo') }}>
                  <b dir="ltr">{onlineRoom.bravoScore ?? 0}</b> براوو
                </span>
              </div>
            )}
          </div>

          <div className="uiv3-sb-table-wrap">
            <table className="uiv3-sb-table">
              <thead>
                <tr>
                  <th>بازیکن</th>
                  <th>تیم</th>
                  <th>کشتن</th>
                  <th>مرگ</th>
                  <th>امتیاز</th>
                </tr>
              </thead>
              <tbody>
                {onlineRoom ? (
                  sortedPlayers.map((p) => {
                    const pTeam: TeamId = p.team || 'alpha';
                    const isMe = p.id === localOnlinePlayerId;
                    const frameMeta = getCosmeticItem(p.cosmetics?.nf);
                    const badgeMeta = getCosmeticItem(p.cosmetics?.nb);
                    return (
                      <tr key={p.id} className={isMe ? 'is-me' : undefined}>
                        <td className="uiv3-sb-name-cell">
                          <span
                            className="uiv3-sb-team-dot"
                            style={{ background: getTeamColor(pTeam) }}
                          />
                          <span
                            className={frameMeta ? 'uiv3-sb-framed' : undefined}
                            style={
                              frameMeta
                                ? {
                                    borderColor: frameMeta.colorHex,
                                    background: frameMeta.accentHex || 'rgba(15,23,42,0.75)',
                                  }
                                : undefined
                            }
                          >
                            {badgeMeta?.symbol && (
                              <span
                                className="cosmetic-inline-badge"
                                style={{ color: badgeMeta.colorHex }}
                                title={badgeMeta.nameFa}
                              >
                                {badgeMeta.symbol}
                              </span>
                            )}
                            <span>{p.name}</span>
                          </span>
                          {p.isBot && <span className="uiv3-sb-tag">BOT</span>}
                          {p.id === onlineRoom.hostId && <span className="uiv3-sb-tag is-host">HOST</span>}
                          {p.disconnected && (
                            <span className="uiv3-sb-tag is-warn">اتصال مجدد</span>
                          )}
                        </td>
                        <td style={{ color: getTeamColor(pTeam), fontWeight: 700 }}>
                          {pTeam === 'alpha' ? 'آلفا' : 'براوو'}
                        </td>
                        <td className="uiv3-sb-num" dir="ltr">
                          {p.kills}
                        </td>
                        <td className="uiv3-sb-num" dir="ltr">
                          {p.deaths ?? 0}
                        </td>
                        <td className="uiv3-sb-num" dir="ltr">
                          {p.score ?? 0}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="is-me">
                    <td className="uiv3-sb-name-cell">
                      <span
                        className="uiv3-sb-team-dot"
                        style={{ background: getTeamColor('alpha') }}
                      />
                      <span
                        className={localFrame ? 'uiv3-sb-framed' : undefined}
                        style={
                          localFrame
                            ? {
                                borderColor: localFrame.colorHex,
                                background: localFrame.accentHex || 'rgba(15,23,42,0.75)',
                              }
                            : undefined
                        }
                      >
                        {localBadge?.symbol && (
                          <span
                            className="cosmetic-inline-badge"
                            style={{ color: localBadge.colorHex }}
                            title={localBadge.nameFa}
                          >
                            {localBadge.symbol}
                          </span>
                        )}
                        <span>{onlinePlayerName}</span>
                      </span>
                    </td>
                    <td style={{ color: getTeamColor('alpha'), fontWeight: 700 }}>آلفا</td>
                    <td className="uiv3-sb-num" dir="ltr">
                      {offlineKills}
                    </td>
                    <td className="uiv3-sb-num" dir="ltr">
                      0
                    </td>
                    <td className="uiv3-sb-num" dir="ltr">
                      {offlineScore}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);

/* ----------------------------------------------------------------------------
   ROUND-END INTERMISSION BANNER (Zero-blur translucent floating glass banner)
   ---------------------------------------------------------------------------- */

export interface RoundIntermissionV3Props {
  onlineRoom: OnlineRoomSummary;
}

export const RoundIntermissionV3: React.FC<RoundIntermissionV3Props> = React.memo(
  ({ onlineRoom }) => {
    const winner = onlineRoom.roundWinnerTeam;
    const isDraw = winner === 'draw' || !winner;
    const headline = isDraw ? 'پایان راند · تساوی' : `برندهٔ راند: ${getTeamNameFa(winner)}`;
    const accentColor = isDraw ? '#bae6fd' : getTeamColor(winner);

    return (
      <div
        className="uiv3-live-overlay uiv3-round-end-banner"
        data-testid="uiv3-round-end-banner"
        role="status"
        aria-live="polite"
        dir="rtl"
      >
        <div className="uiv3-live-card uiv3-round-end-card">
          <div className="uiv3-round-end-kicker">
            راند {onlineRoom.currentRound ?? 1} به پایان رسید
          </div>
          <div className="uiv3-round-end-title" style={{ color: accentColor }}>
            {headline}
          </div>
          <div className="uiv3-round-end-score">
            <span style={{ color: getTeamColor('alpha') }}>
              آلفا <b dir="ltr">{onlineRoom.alphaScore ?? 0}</b>
            </span>
            <span className="uiv3-dot">—</span>
            <span style={{ color: getTeamColor('bravo') }}>
              <b dir="ltr">{onlineRoom.bravoScore ?? 0}</b> براوو
            </span>
          </div>
          <div className="uiv3-round-end-sub">آماده‌سازی راند بعدی...</div>
        </div>
      </div>
    );
  }
);

/* ----------------------------------------------------------------------------
   ONLINE ROUND-BASED MATCH RESULT & REMATCH OVERLAY (Zero-blur)
   ---------------------------------------------------------------------------- */

export interface MatchResultV3Props {
  onlineRoom: OnlineRoomSummary;
  localOnlinePlayerId: string;
  cheatConfig?: Partial<CheatConfig>;
  onVoteMap: (mapId: MapId) => void;
  onVoteRematch: (ready: boolean) => void;
  onExit: () => void;
}

export const MatchResultV3: React.FC<MatchResultV3Props> = React.memo(
  ({ onlineRoom, localOnlinePlayerId, cheatConfig, onVoteMap, onVoteRematch, onExit }) => {
    const activePlayers = onlineRoom.players.filter((p) => !p.disconnected && !p.isBot);
    const readyIds = new Set(onlineRoom.rematchReadyPlayerIds || []);
    const readyCount = activePlayers.filter((p) => readyIds.has(p.id)).length;
    const iAmReady = Boolean(localOnlinePlayerId && readyIds.has(localOnlinePlayerId));
    const winnerTeam: TeamId = onlineRoom.matchWinnerTeam || 'alpha';
    const voteRes = resolveMapVoteWinner(onlineRoom as unknown as AuthoritativeRoomState);
    const myMapVote = localOnlinePlayerId ? onlineRoom.mapVotes?.[localOnlinePlayerId] : undefined;
    const winningMapName = (
      MAP_LIST.find((m) => m.id === voteRes.winnerMapId)?.nameFa || ''
    ).split(' (')[0];

    const summaryStats = useMemo(
      () =>
        computeMatchSummaryStats(
          onlineRoom.players.map((p) => ({
            id: p.id,
            name: p.name,
            team: p.team || 'alpha',
            kills: p.kills,
            deaths: p.deaths ?? 0,
            shotsFired: p.shotsFired ?? 0,
            shotsHit: p.shotsHit ?? 0,
            headshots: p.headshots ?? 0,
            score: p.score ?? 0,
          }))
        ),
      [onlineRoom.players]
    );

    const integrity = resolveMatchIntegrityBadge(cheatConfig);

    return (
      <div
        className="uiv3-live-overlay uiv3-match-result-backdrop"
        data-testid="match-result-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="نتیجه مسابقه"
        dir="rtl"
      >
        <div className="uiv3-live-card uiv3-match-result-card">
          <div className="uiv3-mr-head">
            <div className="uiv3-mr-kicker-row">
              <span className="uiv3-mr-kicker">پایان مسابقه · خلاصه آمار</span>
              {integrity.isUnofficial && (
                <span className="uiv3-integrity-badge" data-testid="uiv3-match-integrity-badge">
                  {integrity.labelFa}
                </span>
              )}
            </div>
            <h2 className="uiv3-mr-winner" style={{ color: getTeamColor(winnerTeam) }}>
              برنده: {getTeamNameFa(winnerTeam)}
            </h2>
            <div className="uiv3-mr-score-line">
              <span style={{ color: getTeamColor('alpha') }}>
                آلفا <b dir="ltr">{onlineRoom.alphaScore ?? 0}</b>
              </span>
              <span className="uiv3-dot">—</span>
              <span style={{ color: getTeamColor('bravo') }}>
                <b dir="ltr">{onlineRoom.bravoScore ?? 0}</b> براوو
              </span>
            </div>
          </div>

          {summaryStats.mvp && (
            <div className="uiv3-mr-mvp-strip" data-testid="post-match-mvp-banner">
              <span className="uiv3-mr-mvp-tag">MVP · بهترین بازیکن</span>
              <strong style={{ color: getTeamColor(summaryStats.mvp.team) }}>
                {summaryStats.mvp.name}
              </strong>
              <span className="uiv3-mr-mvp-meta">
                <b dir="ltr">{summaryStats.mvp.kills}</b> کشتن · دقت{' '}
                <b dir="ltr">{summaryStats.mvp.accuracyPct}%</b> ·{' '}
                <b dir="ltr">{summaryStats.mvp.headshots}</b> هدشات
              </span>
            </div>
          )}

          <div className="uiv3-sb-table-wrap">
            <table className="uiv3-sb-table" data-testid="post-match-stats-table">
              <thead>
                <tr>
                  <th>بازیکن</th>
                  <th>تیم</th>
                  <th>کشتن</th>
                  <th>مرگ</th>
                  <th>دقت</th>
                  <th>هدشات</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {summaryStats.rows.map((row) => {
                  const rawP = onlineRoom.players.find((pl) => pl.id === row.id);
                  const isReady = readyIds.has(row.id);
                  return (
                    <tr key={row.id} className={row.isMvp ? 'is-mvp' : undefined}>
                      <td className="uiv3-sb-name-cell">
                        <span
                          className="uiv3-sb-team-dot"
                          style={{ background: getTeamColor(row.team) }}
                        />
                        <span>{row.name}</span>
                        {row.isMvp && <span className="uiv3-sb-tag is-mvp">MVP</span>}
                      </td>
                      <td style={{ color: getTeamColor(row.team), fontWeight: 700 }}>
                        {row.team === 'alpha' ? 'آلفا' : 'براوو'}
                      </td>
                      <td className="uiv3-sb-num" dir="ltr">
                        {row.kills}
                      </td>
                      <td className="uiv3-sb-num" dir="ltr">
                        {row.deaths}
                      </td>
                      <td className="uiv3-sb-num" dir="ltr">
                        {row.accuracyPct}%
                      </td>
                      <td className="uiv3-sb-num" dir="ltr">
                        {row.headshots}
                      </td>
                      <td
                        className="uiv3-sb-num"
                        style={{ color: isReady ? '#30d158' : 'rgba(214,229,247,0.72)' }}
                      >
                        {rawP?.disconnected ? 'قطع' : isReady ? 'آماده' : 'منتظر'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="uiv3-mr-vote-box" data-testid="rematch-map-vote-bar">
            <div className="uiv3-mr-vote-head">
              <span>رأی‌گیری مپ برای دست بعد ({voteRes.totalVotes} رأی)</span>
              <span className="uiv3-mr-vote-status">
                {voteRes.totalVotes === 0
                  ? 'در صورت تساوی، میزبان تصمیم می‌گیرد'
                  : voteRes.isTie
                    ? `تساوی — انتخاب میزبان: ${winningMapName}`
                    : `مپ بعدی: ${winningMapName}`}
              </span>
            </div>
            <div className="uiv3-mr-vote-grid">
              {MAP_LIST.map((m) => {
                const count = voteRes.counts[m.id] || 0;
                const voted = myMapVote === m.id;
                const leading = voteRes.totalVotes > 0 && voteRes.winnerMapId === m.id;
                const shortName = m.nameFa.split(' (')[0];
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`rematch-map-vote-${m.id}`}
                    className={`uiv3-mr-vote-chip${voted ? ' is-voted' : ''}${leading ? ' is-leading' : ''}`}
                    onClick={() => onVoteMap(m.id)}
                  >
                    <span>{shortName}</span>
                    <span className="uiv3-mr-vote-cnt" dir="ltr">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="uiv3-mr-ready-counter" data-testid="rematch-ready-counter">
            {readyCount} از {activePlayers.length} بازیکن آماده بازی دوباره است
          </div>

          <div className="uiv3-mr-actions">
            <GlassButton
              variant="primary"
              size="md"
              data-testid="btn-rematch-ready"
              onClick={() => onVoteRematch(!iAmReady)}
            >
              {iAmReady ? 'آماده‌اید (در انتظار بقیه...)' : 'بازی دوباره'}
            </GlassButton>
            <GlassButton variant="subtle" size="md" data-testid="btn-match-exit" onClick={onExit}>
              خروج
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }
);

/* ----------------------------------------------------------------------------
   OFFLINE / CAMPAIGN GAME OVER OVERLAY (Zero-blur over paused/end canvas)
   ---------------------------------------------------------------------------- */

export interface GameOverV3Props {
  stats: {
    score: number;
    kills: number;
    deaths: number;
    wave: number;
    shotsFired: number;
    shotsHit: number;
    headshots: number;
  };
  cheatConfig?: Partial<CheatConfig>;
  onRetry: () => void;
  onReturnToTitle: () => void;
}

export const GameOverV3: React.FC<GameOverV3Props> = React.memo(
  ({ stats, cheatConfig, onRetry, onReturnToTitle }) => {
    const accuracy = computeAccuracyPercent(stats.shotsFired, stats.shotsHit);
    const integrity = resolveMatchIntegrityBadge(cheatConfig);

    return (
      <div
        id="gameover-screen"
        className="uiv3-live-overlay uiv3-gameover-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="پایان عملیات"
        data-testid="uiv3-gameover"
        dir="rtl"
      >
        <div className="uiv3-live-card uiv3-gameover-card">
          <div className="uiv3-gameover-head">
            <div className="uiv3-mr-kicker-row">
              <span className="uiv3-gameover-kicker">قطع ارتباط دوربین · سقوط</span>
              {integrity.isUnofficial && (
                <span
                  className="uiv3-integrity-badge"
                  data-testid="uiv3-gameover-integrity-badge"
                  title={integrity.activeFlagsFa.join('، ')}
                >
                  {integrity.labelFa}
                </span>
              )}
            </div>
            <h2 className="uiv3-gameover-title">اپراتور در درگیری از پای درآمد</h2>
            {integrity.isUnofficial && (
              <div className="uiv3-integrity-sub">
                موارد فعال: {integrity.activeFlagsFa.join(' · ')}
              </div>
            )}
          </div>

          <div className="uiv3-gameover-stats" data-testid="gameover-summary-stats">
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-kills" dir="ltr">
                {stats.kills}
              </strong>
              <span className="uiv3-go-lbl">کشتن</span>
            </div>
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-deaths" dir="ltr">
                {stats.deaths}
              </strong>
              <span className="uiv3-go-lbl">مرگ</span>
            </div>
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-accuracy" dir="ltr">
                {accuracy}%
              </strong>
              <span className="uiv3-go-lbl">دقت تیراندازی</span>
            </div>
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-headshots" dir="ltr">
                {stats.headshots}
              </strong>
              <span className="uiv3-go-lbl">هدشات</span>
            </div>
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-score" dir="ltr">
                {stats.score}
              </strong>
              <span className="uiv3-go-lbl">امتیاز کل</span>
            </div>
            <div className="uiv3-go-stat">
              <strong className="uiv3-go-num" id="go-wave" dir="ltr">
                {stats.wave}
              </strong>
              <span className="uiv3-go-lbl">موج نهایی</span>
            </div>
          </div>

          <div className="uiv3-gameover-actions">
            <GlassButton
              id="btn-retry"
              variant="primary"
              size="lg"
              data-start="true"
              data-testid="uiv3-btn-retry"
              onClick={onRetry}
            >
              بازی دوباره
            </GlassButton>
            <GlassButton
              variant="subtle"
              size="lg"
              data-testid="uiv3-btn-gameover-exit"
              onClick={onReturnToTitle}
            >
              خروج به منوی اصلی
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }
);
