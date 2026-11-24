import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './game/engine';
import type { DialogueData, LetterData, Snapshot, SpeechData, StoryData } from './game/engine';
import type { ActionId, MiniGameId, Mood, ShopItem, ZoneId } from './game/types';
import { MOOD_LABEL, PERSONALITY_LABEL, SHOP_BY_ID, SHOP_ITEMS, SPROUT_BY_ID, SPROUTS, STAGE_GROWTH, STAGE_NAMES, STAGE_THRESHOLDS, ZONES, ZONE_ORDER } from './game/content';
import { TUTORIAL, TALK_OPTIONS } from './game/dialogue';
import { MoodDot, SproutPortrait } from './ui/Portrait';
import { ArcadeHub, MiniGame } from './ui/arcade';
import { PixelIcon, type IconName } from './ui/icons';
import { DecorPreview, SproutStageIcon, WeatherIcon, ZoneThumb } from './ui/art';

const needMeta: { key: 'hunger' | 'hydration' | 'energy' | 'comfort'; label: string; icon: IconName; color: string }[] = [
  { key: 'hunger', label: 'Food', icon: 'hunger', color: 'linear-gradient(90deg,#e8b85a,#d99a3c)' },
  { key: 'hydration', label: 'Water', icon: 'hydration', color: 'linear-gradient(90deg,#8fd3e8,#5aa9c6)' },
  { key: 'energy', label: 'Rest', icon: 'energy', color: 'linear-gradient(90deg,#e9d27a,#d4b84a)' },
  { key: 'comfort', label: 'Comfort', icon: 'comfort', color: 'linear-gradient(90deg,#f0a3b6,#dd8099)' },
];

const actionDefs: { id: ActionId; label: string; icon: IconName; key: string; kind?: string }[] = [
  { id: 'feed', label: 'Feed', icon: 'hunger', key: 'F' },
  { id: 'water', label: 'Water', icon: 'water', key: 'R' },
  { id: 'cuddle', label: 'Cuddle', icon: 'cuddle', key: 'C' },
  { id: 'talk', label: 'Talk', icon: 'talk', key: 'T', kind: 'primary' },
  { id: 'play', label: 'Play', icon: 'play', key: 'P' },
  { id: 'sing', label: 'Sing', icon: 'sing', key: 'G' },
  { id: 'story', label: 'Story', icon: 'story', key: 'Y' },
  { id: 'breathe', label: 'Breathe', icon: 'breathe', key: 'B' },
  { id: 'soothe', label: 'Soothe', icon: 'heart', key: 'S' },
];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [dialogue, setDialogue] = useState<DialogueData | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [speech, setSpeech] = useState<SpeechData | null>(null);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<MiniGameId | null>(null);
  const [modal, setModal] = useState<null | 'journal' | 'map' | 'shop' | 'settings' | 'help' | 'arcade'>(null);
  const [careId, setCareId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'spouts' | 'quest' | 'garden'>('spouts');
  const [nameDraft, setNameDraft] = useState('');
  const [toast, setToast] = useState<{ id: number; text: string; tone: string } | null>(null);

  // engine bootstrap
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current, {
      onSnapshot: setSnap,
      onDialogue: setDialogue,
      onStory: setStory,
      onLetter: setLetter,
      onSpeech: setSpeech,
    });
    engineRef.current = engine;
    if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = engine;
    engine.start();
    engine.attach();
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      engine.keyDown(e);
    };
    const onKeyUp = (e: KeyboardEvent) => engine.keyUp(e);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const onPointer = (e: PointerEvent) => {
      if (e.target === canvasRef.current) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        engine.pointerMove(e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    window.addEventListener('pointermove', onPointer);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointer);
      engine.stop();
      engine.detach();
    };
  }, []);

  // toast from snapshot
  useEffect(() => {
    if (snap?.toast && (!toast || toast.id !== snap.toast.id)) {
      setToast({ id: snap.toast.id, text: snap.toast.text, tone: snap.toast.tone });
    }
  }, [snap?.toast]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (snap?.selectedId) setCareId(snap.selectedId);
    else if (!snap?.selectedId) setCareId(null);
  }, [snap?.selectedId]);

  const arcadeUnlockedRef = useRef(false);
  useEffect(() => {
    arcadeUnlockedRef.current = !!snap?.arcadeUnlocked;
  }, [snap?.arcadeUnlocked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'j') setModal((m) => (m === 'journal' ? null : 'journal'));
      if (k === 'm') setModal((m) => (m === 'map' ? null : 'map'));
      if (k === 'k') setModal((m) => (m === 'shop' ? null : 'shop'));
      if (k === 'h') setModal((m) => (m === 'help' ? null : 'help'));
      // 'P' plays with a nearby sprout (handled by the engine); 'L' opens the Lantern Arcade.
      if (k === 'l' && arcadeUnlockedRef.current) setArcadeOpen((v) => !v);
      if (k === 'escape') {
        setModal(null);
        setArcadeOpen((open) => {
          if (open) setActiveGame(null);
          return false;
        });
      }
    };
    const onShop = () => setModal('shop');
    window.addEventListener('keydown', onKey);
    window.addEventListener('ls-open-shop', onShop as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ls-open-shop', onShop as EventListener);
    };
  }, []);

  // prevent scroll bounce
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.rail, .modal, .modal-body, .dialogue')) return;
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, []);

  // The engine asks the UI to open the arcade when the keeper uses a booth.
  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent).detail as MiniGameId | undefined;
      setArcadeOpen(true);
      if (id) setActiveGame(id);
    };
    const close = () => {
      setActiveGame(null);
      setArcadeOpen(false);
    };
    window.addEventListener('ls-open-arcade', open as EventListener);
    window.addEventListener('ls-close-arcade', close as EventListener);
    return () => {
      window.removeEventListener('ls-open-arcade', open as EventListener);
      window.removeEventListener('ls-close-arcade', close as EventListener);
    };
  }, []);

  const engine = engineRef.current;
  const sprout = snap?.sprouts.find((s) => s.id === careId) ?? null;
  const started = snap?.started ?? false;
  const selected = useMemo(() => sprout, [sprout]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    engine?.pointerDown(e.clientX - rect.left, e.clientY - rect.top);
  };

  // The canvas mounts exactly once and is never remounted: the engine binds to it in
  // the mount effect, and it emits the first snapshot synchronously.
  return (
    <div className="app">
      {snap && started && (
        <Hud
          snap={snap}
          onOpen={(m) => {
            if (m === 'arcade') setArcadeOpen(true);
            else setModal(m);
          }}
        />
      )}

      <div className="stage">
        <div className={`viewport ${snap?.mode === 'place' ? 'place-mode' : ''}`}>
          <canvas ref={canvasRef} className="game-canvas" onPointerDown={handleCanvasPointerDown} />
          {snap && (
          <div className="view-overlay">
            <div className="zone-plate">
              <div className="zp-name">{snap.zoneName}</div>
              <div className="zp-sub">
                Day {snap.day} · {snap.clockLabel}
              </div>
              <div className="zp-weather">
                <WeatherIcon weather={snap.weather} size={13} /> {snap.weatherLabel}
              </div>
            </div>
            {snap.prompt && !snap.breath.active && (
              <div className="prompt-pill" style={{ pointerEvents: 'none' }}>
                <span className="key">E</span>
                <span className="pp-label">{snap.prompt.label}</span>
                <span className="pp-action">{snap.prompt.action}</span>
              </div>
            )}
            {!snap.breath.active && snap.mode === 'play' && (
              <div className="hint-strip">
                <span className="key">WASD</span> walk · <span className="key">E</span> interact · <span className="key">T</span> talk
              </div>
            )}
            {snap.mode === 'place' && snap.placement && (
              <div className="place-banner">
                <div className="place-card">
                  Placing {snap.placement.item.name}
                  <small>{snap.placement.valid ? 'Click the ground to set it down · Esc cancels' : 'Blocked — find open ground'}</small>
                </div>
              </div>
            )}
            {snap.breath.active && <BreathOverlay breath={snap.breath} onClose={() => engine?.cancelBreathing()} />}
            {!careId && !dialogue && !story && !snap.breath.active && snap.mode === 'play' && <QuickCare snap={snap} engine={engine} />}
            {speech && !dialogue && !snap.breath.active && (
              <button className="speech-toast" onClick={() => engine?.closeSpeech()} title="Dismiss">
                <span className="st-name">{speech.name}</span>
                <span className="st-text">{speech.text}</span>
              </button>
            )}
            {snap.tutorialActive && !snap.flags.tutorialSeen && !careId && !dialogue && !story && !snap.breath.active && (
              <TutorialCard snap={snap} onDismiss={() => engine?.setSetting('hints', true)} onSkip={() => engine?.dismissTutorial()} />
            )}
          </div>
          )}
          {snap && <MobileControls engine={engine} snap={snap} />}
        </div>

        {snap && started && (
          <aside className="rail">
            <RailPanel snap={snap} onOpen={setModal} onSelect={(id) => engine?.openCare(id)} onUnlock={(z) => engine?.unlockZone(z)} activeTab={mobileTab} onTab={setMobileTab} />
          </aside>
        )}
      </div>

      {snap && started && (
        <nav className="bottom-nav">
          <MobileNav snap={snap} active={mobileTab} engine={engine} onTab={setMobileTab} onSelect={(id) => engine?.openCare(id)} />
        </nav>
      )}

      {snap && !started && (
        <TitleScreen
          hasSave={snap.hasSave}
          name={nameDraft}
          setName={setNameDraft}
          onStart={() => engine?.newGame(nameDraft || 'Keeper')}
          onContinue={() => engine?.continueGame()}
        />
      )}

      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.tone}`}>{toast.text}</div>
        </div>
      )}

      {snap && careId && selected && snap.started && !story && (
        <CareModal
          sprout={selected}
          snap={snap}
          onClose={() => engine?.closeCare()}
          onAction={(a) => engine?.care(selected.id, a)}
          onTalk={() => engine?.startTalk(selected.id)}
          onTuck={() => (selected.asleep ? engine?.wake(selected.id) : engine?.care(selected.id, 'tuckin'))}
        />
      )}

      {dialogue && (
        <DialogueBox
          dialogue={dialogue}
          onOption={(id) => engine?.chooseTalk(id)}
          onClose={() => engine?.closeDialogue()}
        />
      )}

      {story && <StoryModal story={story} onDone={() => engine?.finishStory()} />}

      {letter && <LetterModal letter={letter} onClose={() => engine?.closeLetter()} />}

      {snap && arcadeOpen && !activeGame && (
        <ArcadeHub
          miniGames={snap.miniGames ?? {}}
          seeds={snap.seeds}
          onClose={() => setArcadeOpen(false)}
          onPlay={(id) => setActiveGame(id)}
        />
      )}

      {snap && activeGame && (
        <MiniGame
          id={activeGame}
          best={snap.miniGames?.[activeGame]?.best ?? 0}
          onExit={() => setActiveGame(null)}
          onFinish={(r) => engine?.finishMiniGame(activeGame, r.score, r.won)}
        />
      )}

      {snap && modal && (
        <BigModal
          modal={modal}
          snap={snap}
          onClose={() => setModal(null)}
          engine={engine}
          onSelect={(id) => {
            setModal(null);
            engine?.openCare(id);
          }}
          onSwitch={setModal}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  HUD                                                                */
/* ================================================================== */

function Hud({ snap, onOpen }: { snap: Snapshot; onOpen: (m: 'journal' | 'map' | 'shop' | 'settings' | 'help' | 'arcade') => void }) {
  const claimable = snap.chapters.filter((c) => c.done && !c.claimed).length;
  const dailyDone = snap.daily?.allDone && !snap.daily.rewardClaimed;
  return (
    <header className="hud">
      <div className="hud-brand">
        <div className="brand-mark">
          <PixelIcon name="growth" size={18} />
        </div>
        <div className="brand-text">
          <div className="brand-title">LITTLE SPROUTS</div>
          <div className="brand-sub">{snap.keeperName !== 'You' ? `Keeper ${snap.keeperName}` : 'Garden keeper'}</div>
        </div>
      </div>
      <div className="hud-chips">
        <div className="chip">
          <PixelIcon name="energy" size={13} />
          <b>Day {snap.day}</b>
          <span className="chip-sub">{snap.clockLabel}</span>
        </div>
        <div className="chip">
          <PixelIcon name="seeds" size={13} />
          <b>{snap.seeds}</b>
          <span className="chip-sub">seeds</span>
        </div>
        <div className="chip">
          <PixelIcon name="berries" size={13} />
          <b>{snap.berries}</b>
          <span className="chip-sub">berries</span>
        </div>
        <div className={`chip ${snap.dew === 0 ? 'warn' : ''}`}>
          <PixelIcon name="water" size={13} />
          <b>
            {snap.dew}/{snap.canMax}
          </b>
          <span className="chip-sub">can</span>
        </div>
        <div className="chip">
          <PixelIcon name="harmony" size={13} />
          <b>{snap.harmony}</b>
          <span className="chip-sub">harmony</span>
        </div>
        <div className="chip zone-chip">
          <PixelIcon name="map" size={12} />
          {snap.zoneName}
        </div>
      </div>
      <div className="hud-actions">
        <button className={`icon-btn ${claimable > 0 || dailyDone ? 'badged' : ''}`} onClick={() => onOpen('journal')} title="Journal (J)">
          <PixelIcon name="journal" size={16} />
          {claimable + (dailyDone ? 1 : 0) > 0 && <span className="badge">{claimable + (dailyDone ? 1 : 0)}</span>}
        </button>
        <button className="icon-btn" onClick={() => onOpen('map')} title="Garden map (M)">
          <PixelIcon name="map" size={16} />
        </button>
        <button className="icon-btn" onClick={() => onOpen('shop')} title="Garden shop (K)">
          <PixelIcon name="seedbag" size={16} />
        </button>
        {snap.arcadeUnlocked && (
          <button className="icon-btn" onClick={() => onOpen('arcade')} title="Lantern Arcade (L)">
            <PixelIcon name="play" size={16} />
          </button>
        )}
        <button className="icon-btn" onClick={() => onOpen('settings')} title="Settings">
          <PixelIcon name="menu" size={16} />
        </button>
      </div>
      <div className="hud-clock">{snap.clockLabel}</div>
    </header>
  );
}

/* ================================================================== */
/*  Rail                                                               */
/* ================================================================== */

function RailPanel({
  snap,
  onOpen,
  onSelect,
  onUnlock,
  activeTab,
}: {
  snap: Snapshot;
  onOpen: (m: 'journal' | 'map' | 'shop' | 'settings' | 'help' | 'arcade') => void;
  onSelect: (id: string) => void;
  onUnlock: (z: ZoneId) => void;
  activeTab: string;
  onTab: (t: 'spouts' | 'quest' | 'garden') => void;
}) {
  const sorted = [...snap.sprouts].sort((a, b) => urgency(b) - urgency(a));
  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <PixelIcon name="growth" size={12} /> YOUR SPROUTS <span className="count">{snap.sprouts.length}</span>
          </div>
          <button className="panel-link" onClick={() => onOpen('map')}>
            map
          </button>
        </div>
        <div className="panel-body">
          <div className="panel-hint">
            <PixelIcon name="heart" size={12} />
            <span>Talk with them (T) to grow heart, calm and trust — that is what helps them bloom.</span>
          </div>
          <div className="sprout-list">
            {sorted.map((s) => (
              <button key={s.id} className={`sprout-card ${s.isCrying ? 'crying' : urgency(s) > 150 ? 'urgent' : ''}`} onClick={() => onSelect(s.id)}>
                <div className="sc-avatar">
                  <SproutPortrait id={s.id} mood={s.mood} size={42} stage={s.stage} />
                </div>
                <div>
                  <div className="sc-name">
                    {s.name}
                    <MoodDot mood={s.mood} />
                  </div>
                  <div className="sc-mood">
                    {s.moodLabel}
                    <span style={{ opacity: 0.55, fontSize: 10 }}>· {STAGE_NAMES[s.stage]}</span>
                  </div>
                  <div className="sc-bars">
                    <div className="mini-bar"><span style={{ width: `${s.needs.hunger}%`, background: 'linear-gradient(90deg,#e8b85a,#d99a3c)' }} /></div>
                    <div className="mini-bar"><span style={{ width: `${s.needs.hydration}%`, background: 'linear-gradient(90deg,#8fd3e8,#5aa9c6)' }} /></div>
                    <div className="mini-bar"><span style={{ width: `${s.needs.comfort}%`, background: 'linear-gradient(90deg,#f0a3b6,#dd8099)' }} /></div>
                  </div>
                </div>
                <div className="sc-stage">{s.zone === snap.zone ? 'here' : ZONES[s.zone]?.name.split(' ')[0] ?? s.zone}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {snap.quest && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <PixelIcon name="journal" size={12} /> {snap.quest.title}
            </div>
            <button className="panel-link" onClick={() => onOpen('journal')}>
              engage
            </button>
          </div>
          <div className="panel-body">
            <div className="stack">
              {snap.quest.tasks.map((t) => (
                <div key={t.id} className={`task-row ${t.done ? 'done' : ''}`}>
                  <span className="task-check">{t.done ? '✓' : ''}</span>
                  <span>{t.label}</span>
                  <span className="task-count">
                    {t.progress}/{t.count}
                  </span>
                </div>
              ))}
            </div>
            {snap.daily && (
              <>
                <hr className="hairline" />
                <div className="row between">
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8b7854' }}>
                    Daily tending
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#8b7854' }}>
                    {snap.daily.tasks.filter((t) => t.done).length}/{snap.daily.tasks.length}
                  </span>
                </div>
                {snap.daily.tasks.map((t) => (
                  <div key={t.def.id} className={`task-row ${t.done ? 'done' : ''}`}>
                    <span className="task-check">{t.done ? '✓' : ''}</span>
                    <span>{t.def.label}</span>
                    <span className="task-count">
                      {t.progress}/{t.def.count}
                    </span>
                  </div>
                ))}
                {snap.daily.allDone && !snap.daily.rewardClaimed && (
                  <button className="btn btn-gold btn-sm mt-8" style={{ width: '100%' }} onClick={() => onOpen('journal')}>
                    Claim +20 seeds
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <NextUnlockPanel snap={snap} onUnlock={onUnlock} onOpenMap={() => onOpen('map')} />
      {snap.nextUnlock === null && (
        <div className="panel">
          <div className="panel-body">
            <div className="empty-note">Every part of the garden has woken. What a place you have made.</div>
          </div>
        </div>
      )}
    </>
  );
}

function NextUnlockPanel({ snap, onUnlock, onOpenMap }: { snap: Snapshot; onUnlock: (z: ZoneId) => void; onOpenMap: () => void }) {
  const nu = snap.nextUnlock;
  if (!nu) return null;
  const zone = ZONES[nu.zone];
  const seedPct = Math.min(100, (snap.seeds / Math.max(1, nu.seeds)) * 100);
  const harPct = Math.min(100, (snap.harmony / Math.max(1, nu.harmony)) * 100);
  const ready = snap.seeds >= nu.seeds && snap.harmony >= nu.harmony;
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <PixelIcon name="map" size={12} /> NEXT GATE
        </div>
        <button className="panel-link" onClick={onOpenMap}>
          all
        </button>
      </div>
      <div className="panel-body">
        <div className="unlock-top">
          <div className="unlock-name">{zone.name}</div>
          <div className="unlock-need">{ready ? 'Ready to wake' : nu.missing}</div>
        </div>
        <div className="unlock-bars">
          <div className="ub">
            <span>Seeds</span>
            <span className="track">
              <span style={{ width: `${seedPct}%` }} />
            </span>
            <span style={{ textAlign: 'right' }}>
              {snap.seeds}/{nu.seeds}
            </span>
          </div>
          <div className="ub">
            <span>Harmony</span>
            <span className="track">
              <span className="gold" style={{ width: `${harPct}%` }} />
            </span>
            <span style={{ textAlign: 'right' }}>
              {snap.harmony}/{nu.harmony}
            </span>
          </div>
        </div>
        <button className="unlock-btn" disabled={!ready} onClick={() => onUnlock(nu.zone)}>
          {ready ? `WAKE ${zone.name.toUpperCase()}` : 'KEEP TENDING'}
        </button>
      </div>
    </div>
  );
}

/** Progress within the current stage, 0-100. */
function growthPct(stage: number, nextStageGap: number | null) {
  if (stage >= 3 || nextStageGap === null) return 100;
  const from = STAGE_GROWTH[stage];
  const to = STAGE_THRESHOLDS[stage];
  const span = Math.max(1, to - from);
  return Math.max(0, Math.min(100, ((span - nextStageGap) / span) * 100));
}

function urgency(s: Snapshot['sprouts'][number]) {
  return (
    (100 - s.needs.hunger) * 0.7 +
    (100 - s.needs.hydration) * 0.7 +
    (100 - s.needs.comfort) * 0.8 +
    (100 - s.needs.energy) * 0.3 +
    (s.isCrying ? 60 : 0) +
    (100 - s.calm) * 0.6
  );
}

/* ================================================================== */
/*  Care sheet                                                         */
/* ================================================================== */

function CareModal({
  sprout,
  snap,
  onClose,
  onAction,
  onTalk,
  onTuck,
}: {
  sprout: NonNullable<Snapshot['sprouts'][number]>;
  snap: Snapshot;
  onClose: () => void;
  onAction: (a: ActionId) => void;
  onTalk: () => void;
  onTuck: () => void;
}) {
  const def = SPROUT_BY_ID[sprout.id];
  const mood = sprout.mood;
  const hasBerries = snap.berries > 0;
  const hasWater = snap.dew > 0;
  const actions = actionDefs.filter((a) => (a.id === 'soothe' ? sprout.isCrying || sprout.calm < 45 : true));
  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 'min(720px, 100%)' }} role="dialog" aria-label={`Care for ${sprout.name}`}>
        <div className="modal-head">
          <div>
            <div className="modal-title">CARING FOR {sprout.name.toUpperCase()}</div>
            <div className="modal-sub">
              {PERSONALITY_LABEL[def.personality]} {def.kind} · {STAGE_NAMES[sprout.stage]} · {ZONES[sprout.zone]?.name}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <PixelIcon name="close" size={13} />
          </button>
        </div>
        <div className="modal-body">
          <div className="care-sheet">
            <div className="care-portrait">
              <div className={`portrait-frame mood-${mood}`}>
                <SproutPortrait id={sprout.id} mood={sprout.asleep ? 'asleep' : mood} size={168} stage={sprout.stage} />
              </div>
              <div className="name-plate">
                <h3>{sprout.name}</h3>
                <div className="np-sub">
                  {sprout.moodLabel} · {STAGE_NAMES[sprout.stage]}
                </div>
                <div className="tag-row">
                  <span className="tag">{PERSONALITY_LABEL[def.personality]}</span>
                  <span className="tag gold">♥ {Math.round(sprout.heart)}</span>
                </div>
              </div>
              {sprout.asleep && <div className="center muted">Sleeping peacefully. They will wake when rested.</div>}
            </div>

            <div className="care-main">
              {def.passive && (
                <div className="host-banner">
                  <SproutPortrait id={sprout.id} mood={sprout.mood} size={44} stage={sprout.stage} />
                  <div>
                    <div className="hb-name">ARCADE HOST</div>
                    <div className="hb-text">
                      {sprout.asleep
                        ? 'Nerdy is asleep behind the prize shelf, still holding the score book.'
                        : '"I keep the scores and I worry about the lanterns. Both jobs are important. Would you like to play something?"'}
                    </div>
                  </div>
                </div>
              )}
              <div className="speech">{sprout.asleep ? `${sprout.name} is asleep. Their leaves rise and fall very slowly.` : def.blurb}</div>

              <div className="needs-grid">
                {needMeta.map((n) => {
                  const val = sprout.needs[n.key];
                  return (
                    <div key={n.key} className={`need-card ${val < 25 ? 'critical' : ''}`}>
                      <div className="nc-top">
                        <PixelIcon name={n.icon} size={12} />
                        {n.label}
                        <span className="val">{Math.round(val)}%</span>
                      </div>
                      <div className="bar">
                        <span style={{ width: `${val}%`, background: n.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bond-row">
                <div className="bond-cell">
                  <div className="bc-label">
                    <PixelIcon name="heart" size={10} /> Heart
                  </div>
                  <div className="bc-value">{Math.round(sprout.heart)}</div>
                </div>
                <div className="bond-cell">
                  <div className="bc-label">
                    <PixelIcon name="calm" size={10} /> Calm
                  </div>
                  <div className="bc-value">{Math.round(sprout.calm)}</div>
                </div>
                <div className="bond-cell">
                  <div className="bc-label">
                    <PixelIcon name="trust" size={10} /> Trust
                  </div>
                  <div className="bc-value">{Math.round(sprout.trust)}</div>
                </div>
              </div>

              <div className="growth-strip">
                <span className="gs-label">Growth</span>
                <span className="gs-track">
                  <span style={{ width: `${growthPct(sprout.stage, sprout.gap.nextStage)}%` }} />
                </span>
                <span className="gs-val">
                  {sprout.stage >= 3 ? 'Bloomed' : `${Math.round(growthPct(sprout.stage, sprout.gap.nextStage))}% to ${STAGE_NAMES[sprout.stage + 1]}`}
                </span>
              </div>

              <div>
                <div className="actions-label">What do they need?</div>
                <div className="action-grid">
                  {actions.map((a) => {
                    const isPrimary = a.id === 'talk';
                    const isSoothe = a.id === 'soothe' && sprout.isCrying;
                    return (
                      <button
                        key={a.id}
                        className={`action-btn ${isPrimary ? 'primary' : ''} ${isSoothe ? 'soothe' : ''}`}
                        onClick={() => (a.id === 'talk' ? onTalk() : a.id === 'tuckin' ? onTuck() : onAction(a.id))}
                        disabled={a.id === 'feed' && !hasBerries ? true : a.id === 'water' && !hasWater ? true : false}
                        title={
                          a.id === 'feed' && !hasBerries
                            ? 'No berries — gather some from a berry bush'
                            : a.id === 'water' && !hasWater
                              ? 'Refill your can at the well'
                              : undefined
                        }
                      >
                        <span className="ab-key">{a.key}</span>
                        <PixelIcon name={a.icon} size={18} />
                        <span className="ab-name">{a.label}</span>
                      </button>
                    );
                  })}
                  <button className="action-btn" onClick={onTuck}>
                    <span className="ab-key">N</span>
                    <PixelIcon name={sprout.asleep ? 'energy' : 'tuckin'} size={18} />
                    <span className="ab-name">{sprout.asleep ? 'Wake' : 'Tuck in'}</span>
                  </button>
                </div>
              </div>
              <div className="row between" style={{ fontSize: 11, fontWeight: 700, color: '#8a7753' }}>
                <span>Talks today: {sprout.talksToday} / 3</span>
                <span>Stories today: {sprout.storiesToday} / 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCare({ snap, engine }: { snap: Snapshot; engine: Engine | null }) {
  const near = snap.sprouts.find((sp) => sp.id === snap.prompt?.sproutId) ?? null;
  if (!near) return null;
  const def = SPROUT_BY_ID[near.id];
  const need = lowestNeed(near);
  const hasBerries = snap.berries > 0;
  const hasWater = snap.dew > 0;
  const btns: { id: ActionId | 'open'; label: string; icon: IconName; key: string; disabled?: boolean; tone?: string }[] = [
    { id: 'feed', label: 'Feed', icon: 'hunger', key: 'F', disabled: !hasBerries },
    { id: 'water', label: 'Water', icon: 'water', key: 'R', disabled: !hasWater },
    { id: 'cuddle', label: 'Cuddle', icon: 'cuddle', key: 'C' },
    { id: 'talk', label: 'Talk', icon: 'talk', key: 'T', tone: 'primary' },
    { id: 'play', label: 'Play', icon: 'play', key: 'P' },
  ];
  if (near.isCrying) btns.splice(3, 0, { id: 'soothe', label: 'Soothe', icon: 'heart', key: 'S', tone: 'urgent' });
  return (
    <div className="quick-care">
      <div className="qc-head">
        <span className="qc-name">{near.name}</span>
        <span className="qc-mood">
          {near.isCrying ? 'needs you' : need.label}
        </span>
      </div>
      {btns.map((b) => (
        <button
          key={b.id}
          className={`qc-btn ${b.tone ?? ''}`}
          disabled={b.disabled}
          title={b.disabled ? (b.id === 'feed' ? 'No berries — gather some first' : 'Your can is empty — refill at the well') : `${b.label} ${near.name}`}
          onClick={() => (b.id === 'open' ? engine?.openCare(near.id) : engine?.care(near.id, b.id as ActionId))}
        >
          <PixelIcon name={b.icon} size={16} />
          <span className="qc-label">{b.label}</span>
        </button>
      ))}
      <button className="qc-btn" onClick={() => engine?.openCare(near.id)} title={`Open ${near.name}'s full care sheet`}>
        <PixelIcon name="journal" size={16} />
        <span className="qc-label">All</span>
      </button>
    </div>
  );
}

function lowestNeed(s: Snapshot['sprouts'][number]) {
  const list = [
    { key: 'hunger', label: 'hungry', val: s.needs.hunger },
    { key: 'hydration', label: 'thirsty', val: s.needs.hydration },
    { key: 'energy', label: 'tired', val: s.needs.energy },
    { key: 'comfort', label: 'wants company', val: s.needs.comfort },
  ];
  list.sort((a, b) => a.val - b.val);
  return list[0].val < 55 ? list[0] : { key: 'ok', label: 'content', val: 100 };
}

/* ================================================================== */
/*  Dialogue                                                           */
/* ================================================================== */

function DialogueBox({ dialogue, onOption, onClose }: { dialogue: DialogueData; onOption: (id: string) => void; onClose: () => void }) {
  const optIcons: Record<string, IconName> = { listen: 'talk', wonder: 'energy', sit: 'calm' };
  return (
    <div className="dialogue-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialogue" role="dialog" aria-live="polite">
        <div className="dlg-top">
          <div className="dlg-avatar">
            <SproutPortrait id={dialogue.sproutId} mood={dialogue.mood} size={54} stage={3} />
          </div>
          <div className="row between grow">
            <div>
              <div className="dlg-name">
                {dialogue.name}
                <span className="dlg-mood">{MOOD_LABEL[dialogue.mood] ?? dialogue.mood}</span>
              </div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close dialogue">
              <PixelIcon name="close" size={11} />
            </button>
          </div>
        </div>
        <div className="dlg-text">{dialogue.text}</div>
        {dialogue.options.length > 0 ? (
          <div className="dlg-options">
            {dialogue.options.map((o) => (
              <button key={o.id} className="dlg-option" onClick={() => onOption(o.id)}>
                <span className="opt-icon">
                  <PixelIcon name={optIcons[o.id] ?? 'talk'} size={14} />
                </span>
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="dlg-foot">
            <span className="thanks-note">
              <PixelIcon name="heart" size={11} /> You listened. That matters.
            </span>
            <button className="btn btn-paper btn-sm" onClick={onClose}>
              Let them rest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Story / Letter                                                     */
/* ================================================================== */

function StoryModal({ story, onDone }: { story: StoryData; onDone: () => void }) {
  return (
    <div className="scrim">
      <div className="modal story-modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">A STORY FOR {story.name.toUpperCase()}</div>
            <div className="modal-sub">{story.title}</div>
          </div>
          <button className="modal-close" onClick={onDone} aria-label="Close story">
            <PixelIcon name="close" size={13} />
          </button>
        </div>
        <div className="story-art">
          <StoryArt />
        </div>
        <div className="story-body">
          {story.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="story-foot">
          <span className="muted">Reading helps calm and trust grow.</span>
          <button className="btn btn-primary" onClick={onDone}>
            Turn the page to sleep
          </button>
        </div>
      </div>
    </div>
  );
}

function StoryArt() {
  return (
    <svg viewBox="0 0 180 70" width="100%" height="100%" style={{ imageRendering: 'pixelated' }} aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2f0" />
          <stop offset="1" stopColor="#9fc4d8" />
        </linearGradient>
      </defs>
      <rect width="180" height="70" fill="url(#sky)" />
      <circle cx="140" cy="18" r="10" fill="#f4e6ac" />
      <circle cx="140" cy="18" r="10" fill="#fff2c9" opacity="0.6" />
      <path d="M20 46 Q 26 34 40 34 Q 56 34 58 48 Q 44 52 20 46 Z" fill="#eef3f6" />
      <ellipse cx="60" cy="62" rx="50" ry="9" fill="#7fa663" />
      <ellipse cx="140" cy="64" rx="46" ry="7" fill="#6f9757" />
      <rect x="88" y="38" width="3" height="20" fill="#5a7d44" />
      <circle cx="89" cy="34" r="7" fill="#f2b5c8" />
      <circle cx="86" cy="31" r="4" fill="#f7d7df" />
      <rect x="14" y="58" width="4" height="2" fill="#cb5b62" />
      <rect x="17" y="57" width="3" height="3" fill="#e07079" />
    </svg>
  );
}

function LetterModal({ letter, onClose }: { letter: LetterData; onClose: () => void }) {
  return (
    <div className="scrim">
      <div className="modal" style={{ width: 'min(600px,100%)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">A LETTER</div>
            <div className="modal-sub">{letter.title}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close letter">
            <PixelIcon name="close" size={13} />
          </button>
        </div>
        <div className="modal-body">
          <div className="letter-paper">{letter.body}</div>
          <div className="letter-from">— {letter.from}</div>
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Keep it in the journal
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Big modals: journal, map, shop, settings                           */
/* ================================================================== */

function BigModal({
  modal,
  snap,
  onClose,
  engine,
  onSelect,
  onSwitch,
}: {
  modal: 'journal' | 'map' | 'shop' | 'settings' | 'help' | 'arcade';
  snap: Snapshot;
  onClose: () => void;
  engine: Engine | null;
  onSelect: (id: string) => void;
  onSwitch: (m: 'journal' | 'map' | 'shop' | 'settings' | 'help' | 'arcade') => void;
}) {
  const titles = { journal: 'Journal & Tasks', map: 'Garden Map', shop: 'Garden Shop', settings: 'Settings', help: 'How to play', arcade: 'Lantern Arcade' };
  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={titles[modal]}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{titles[modal].toUpperCase()}</div>
            <div className="modal-sub">
              {modal === 'shop' ? `You have ${snap.seeds} seeds and ${snap.harmony} harmony` : modal === 'map' ? 'Somewhere is always waiting to wake' : modal === 'settings' ? 'Make the garden comfortable for you' : 'A record of small kindnesses'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <PixelIcon name="close" size={13} />
          </button>
        </div>
        <div className="modal-body">
          {modal === 'journal' && <Journal snap={snap} engine={engine} onSelect={onSelect} />}
          {modal === 'map' && <MapView snap={snap} engine={engine} />}
          {modal === 'shop' && <Shop snap={snap} engine={engine} onClose={onClose} />}
          {modal === 'settings' && <Settings snap={snap} engine={engine} onHelp={() => onSwitch('help')} />}
          {modal === 'help' && <Help />}
        </div>
      </div>
    </div>
  );
}

function Journal({ snap, engine, onSelect }: { snap: Snapshot; engine: Engine | null; onSelect: (id: string) => void }) {
  const [tab, setTab] = useState<'current' | 'letters' | 'stats'>('current');
  const current = snap.chapters.find((c) => c.id === (snap.flags.chapterSeen || snap.chapters[0]?.id) || (snap.quest && c.id === snap.quest.id));
  const [chosen, setChosen] = useState(current?.id ?? snap.chapters[0]?.id);
  useEffect(() => {
    if (current && !chosen) setChosen(current.id);
  }, [current]);
  const active = snap.chapters.find((c) => c.id === chosen) ?? current ?? snap.chapters[0];
  const letters = snap.flags.letters ?? [];
  const chapterLetters = snap.chapters.filter((c) => c.claimed);
  return (
    <div>
      <div className="tabs" style={{ margin: '-16px -16px 14px', paddingTop: 0 }}>
        <button className={`tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>
          Chapters
        </button>
        <button className={`tab ${tab === 'letters' ? 'active' : ''}`} onClick={() => setTab('letters')}>
          Letters ({chapterLetters.length})
        </button>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          Garden stats
        </button>
      </div>

      {tab === 'current' && (
        <>
          <div className="chapter-tabs">
            {snap.chapters.map((c, i) => {
              const prevDone = i === 0 || snap.chapters[i - 1]?.claimed;
              return (
                <button
                  key={c.id}
                  className={`chapter-pill ${active?.id === c.id ? 'active' : ''} ${c.claimed ? 'done' : ''} ${!prevDone && c.id !== current?.id ? 'locked' : ''}`}
                  onClick={() => setChosen(c.id)}
                >
                  {i + 1}. {c.title}
                </button>
              );
            })}
          </div>
          {active && (
            <>
              <div className="chapter-head">
                <div>
                  <h4>{active.title.toUpperCase()}</h4>
                  <p>{active.intro}</p>
                </div>
                <div className="reward-box">
                  <div className="rb-label">Reward</div>
                  <div className="rb-value">
                    <PixelIcon name="seeds" size={12} /> {active.reward.seeds}
                  </div>
                  {active.reward.item && <div className="muted" style={{ fontSize: 10 }}>+ {SHOP_BY_ID[active.reward.item]?.name ?? active.reward.item}</div>}
                </div>
              </div>
              <div className="stack">
                {active.tasks.map((t) => (
                  <div key={t.id} className={`task-row ${t.done ? 'done' : ''}`} style={{ fontSize: 13 }}>
                    <span className="task-check">{t.done ? '✓' : ''}</span>
                    <span>{t.label}</span>
                    <span className="task-count">
                      {t.progress}/{t.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="row between mt-12">
                <span className="muted">
                  {active.tasks.filter((t) => t.done).length}/{active.tasks.length} complete
                </span>
                {active.done && !active.claimed ? (
                  <button
                    className="btn btn-gold"
                    onClick={() => {
                      engine?.claimChapter(active.id);
                      setTab('letters');
                    }}
                  >
                    Read the letter & claim
                  </button>
                ) : active.claimed ? (
                  <span className="tag gold">Claimed</span>
                ) : (
                  <span className="muted">Keep tending</span>
                )}
              </div>
              {snap.daily && (
                <>
                  <hr className="hairline" />
                  <div className="row between">
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#4a3d27' }}>DAILY TENDING</div>
                    <span className="muted">
                      {snap.daily.tasks.filter((t) => t.done).length}/{snap.daily.tasks.length}
                    </span>
                  </div>
                  <div className="stack mt-8">
                    {snap.daily.tasks.map((t) => (
                      <div key={t.def.id} className={`task-row ${t.done ? 'done' : ''}`} style={{ fontSize: 13 }}>
                        <span className="task-check">{t.done ? '✓' : ''}</span>
                        <span>{t.def.label}</span>
                        <span className="task-count">
                          {t.progress}/{t.def.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  {snap.daily.allDone && !snap.daily.rewardClaimed ? (
                    <button className="btn btn-gold mt-8" onClick={() => engine?.claimDaily()}>
                      Claim daily reward (+20 seeds)
                    </button>
                  ) : snap.daily.rewardClaimed ? (
                    <div className="muted mt-8">Daily reward claimed. A new list arrives tomorrow.</div>
                  ) : (
                    <div className="muted mt-8">Finish all three to earn +20 seeds.</div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'letters' && (
        <div className="stack">
          {chapterLetters.length === 0 && <div className="empty-note">No letters yet. The Old Willow writes when a chapter closes.</div>}
          {chapterLetters.map((c) => (
            <div key={c.id} className="chapter-head" style={{ alignItems: 'flex-start' }}>
              <div>
                <h4>{c.title.toUpperCase()}</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{c.letter}</p>
                <div className="letter-from">— The Old Willow</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'stats' && (
        <div className="stack">
          <div className="chapter-head">
            <div>
              <h4>THE GARDEN REMEMBERS</h4>
              <p>Every small kindness leaves a mark, even when no one is watching.</p>
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {[
              ['Day', snap.day],
              ['Harmony', snap.harmony],
              ['Sprouts', snap.sprouts.length],
              ['Blooms', snap.stats.blooms],
              ['Feeds', snap.stats.feeds],
              ['Waters', snap.stats.waters],
              ['Talks', snap.stats.talks],
              ['Cuddles', snap.stats.cuddles],
              ['Playtimes', snap.stats.plays],
              ['Stories', snap.stats.stories],
              ['Hard moments soothed', snap.stats.soothed],
              ['Breaths shared', snap.stats.breathes],
              ['Decorations placed', snap.stats.decorPlaced],
              ['Berries gathered', snap.stats.harvests],
            ].map(([label, val]) => (
              <div key={label as string} className="bond-cell" style={{ minWidth: 108, flex: '0 0 auto' }}>
                <div className="bc-label">{label}</div>
                <div className="bc-value">{val as number}</div>
              </div>
            ))}
          </div>
          <hr className="hairline" />
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#4a3d27', marginBottom: 8 }}>YOUR SPROUTS</div>
          <div className="stack">
            {snap.sprouts.map((s) => (
              <button key={s.id} className="sprout-card" onClick={() => onSelect(s.id)} style={{ gridTemplateColumns: '40px 1fr auto' }}>
                <div className="sc-avatar" style={{ width: 40, height: 40 }}>
                  <SproutPortrait id={s.id} mood={s.mood} size={36} stage={s.stage} />
                </div>
                <div>
                  <div className="sc-name">{s.name}</div>
                  <div className="sc-mood">
                    {STAGE_NAMES[s.stage]} · heart {Math.round(s.heart)} · trust {Math.round(s.trust)}
                  </div>
                </div>
                <span className="muted">{ZONES[s.zone]?.name}</span>
              </button>
            ))}
          </div>
          <div className="muted mt-8">Letters kept: {(snap.flags.letters ?? []).length}</div>
        </div>
      )}
    </div>
  );
}

function MapView({ snap, engine }: { snap: Snapshot; engine: Engine | null }) {
  return (
    <div>
      <div className="stack" style={{ gap: 10 }}>
        {ZONE_ORDER.map((id) => {
          const z = snap.zoneUnlocks.find((zz) => zz.id === id);
          if (!z) return null;
          const unlocked = z.unlocked;
          const current = snap.zone === id;
          const ready = unlocked;
          return (
            <div key={id} className={`map-zone ${unlocked ? 'unlocked' : 'locked'} ${current ? 'current' : ''}`}>
              <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="mz-name">{z.name}</div>
                  <div className="mz-sub">{z.subtitle}</div>
                  <div className="mz-blurb">{z.blurb}</div>
                  {unlocked ? (
                    <span className="mz-status">● Awake{current ? ' · you are here' : ''}</span>
                  ) : (
                    <span className="mz-status">◌ Sleeping</span>
                  )}
                  {!unlocked && (
                    <div className="mz-cost">
                      <span className={z.canAfford ? '' : 'muted'}>
                        <PixelIcon name="seeds" size={10} /> {z.seeds}
                      </span>
                      <span className={z.meetsHarmony ? '' : 'muted'}>
                        <PixelIcon name="harmony" size={10} /> {z.harmony}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <ZoneThumb zone={id} size={88} locked={!unlocked} />
                  {unlocked ? (
                    <button className="btn btn-paper btn-sm" disabled={current} onClick={() => engine?.teleportToZone(id)}>
                      {current ? 'Here' : 'Travel'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!ready || snap.seeds < z.seeds || snap.harmony < z.harmony}
                      onClick={() => engine?.unlockZone(id)}
                      title={snap.seeds < z.seeds || snap.harmony < z.harmony ? 'Not enough seeds or harmony yet' : 'Wake this part of the garden'}
                    >
                      Wake
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted mt-12">
        Garden gates also open as you walk through them. Unlocking a new area adds its sprouts, props and quiet corners to your world.
      </div>
    </div>
  );
}

function Shop({ snap, engine, onClose }: { snap: Snapshot; engine: Engine | null; onClose: () => void }) {
  const [tab, setTab] = useState<'all' | 'cosy' | 'garden' | 'pantry'>('all');
  const items = SHOP_ITEMS.filter((i) => tab === 'all' || i.category === tab);
  return (
    <div>
      <div className="tabs" style={{ margin: '-16px -16px 14px', paddingTop: 0 }}>
        {(['all', 'cosy', 'garden', 'pantry'] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'Everything' : t === 'cosy' ? 'Cosy' : t === 'garden' ? 'Garden' : 'Pantry'}
          </button>
        ))}
      </div>
      <div className="shop-grid">
        {items.map((item) => (
          <ShopCard key={item.id} item={item} snap={snap} engine={engine} onPlaced={onClose} />
        ))}
      </div>
    </div>
  );
}

function ShopCard({ item, snap, engine, onPlaced }: { item: ShopItem; snap: Snapshot; engine: Engine | null; onPlaced: () => void }) {
  const owned = snap.owned[item.id] ?? 0;
  const affordable = snap.seeds >= item.price;
  return (
    <div className="shop-card">
      {owned > 0 && <span className="owned-chip">×{owned}</span>}
      <div className="shop-art">
        <DecorPreview kind={item.kind} size={64} />
      </div>
      <div className="shop-name">{item.name.toUpperCase()}</div>
      <div className="shop-desc">{item.description}</div>
      <div className="shop-meta">
        <span className="price">
          <PixelIcon name="seeds" size={12} /> {item.price}
        </span>
        <span className="harmony-pip">
          <PixelIcon name="harmony" size={10} /> +{item.harmony}
        </span>
      </div>
      <div className="shop-actions">
        <button
          className="btn btn-paper btn-sm"
          disabled={!affordable}
          onClick={() => {
            engine?.buyItem(item.id);
          }}
        >
          Buy
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={owned <= 0 && !affordable}
          onClick={() => {
            if (owned > 0) {
              engine?.selectPlacement(item.id);
              onPlaced();
            } else if (affordable) {
              engine?.buyItem(item.id);
              engine?.selectPlacement(item.id);
              onPlaced();
            }
          }}
        >
          {owned > 0 ? 'Place' : 'Buy & place'}
        </button>
      </div>
    </div>
  );
}

function Settings({ snap, engine, onHelp }: { snap: Snapshot; engine: Engine | null; onHelp: () => void }) {
  const rows: { key: keyof Snapshot['settings']; name: string; desc: string }[] = [
    { key: 'music', name: 'Music box', desc: 'A slow, generative melody that follows the garden.' },
    { key: 'sfx', name: 'Gentle sounds', desc: 'Soft chimes, water, and little leaf noises.' },
    { key: 'gentle', name: 'Gentle pacing', desc: 'Needs fall 40% more slowly. The garden is never in a rush.' },
    { key: 'hints', name: 'Helpful hints', desc: 'Show tutorial cards and interaction tips.' },
  ];
  return (
    <div>
      {rows.map((r) => (
        <div key={r.key} className="settings-row">
          <div>
            <div className="sr-name">{r.name}</div>
            <div className="sr-desc">{r.desc}</div>
          </div>
          <button className={`switch ${snap.settings[r.key] ? 'on' : ''}`} onClick={() => engine?.setSetting(r.key, !snap.settings[r.key])} aria-label={`Toggle ${r.name}`} />
        </div>
      ))}
      <hr className="hairline" />
      <div className="stack">
        <button className="btn btn-paper" onClick={onHelp}>
          How to play
        </button>
        <button className="btn btn-paper" onClick={() => engine?.save()}>
          Save now
        </button>
        <button
          className="btn btn-ghost"
          style={{ color: '#5a4530', borderColor: '#b39a6f', background: 'rgba(160,120,80,0.1)' }}
          onClick={() => {
            if (confirm('Start a brand new garden? This clears your current save.')) engine?.resetSave();
          }}
        >
          Start a new garden
        </button>
        <div className="muted center">
          Little Sprouts keeps your garden in this browser. Nothing is uploaded anywhere.
        </div>
      </div>
    </div>
  );
}

function Help() {
  return (
    <div className="stack">
      <div className="chapter-head">
        <div>
          <h4>YOU ARE THE KEEPER</h4>
          <p>
            Baby plants live in this garden. They walk, run, cry, nap and grow. Your job is not to make everything perfect — it is to be here,
            notice them, and stay when things are hard.
          </p>
        </div>
      </div>
      <div className="stack">
        {[
          ['Walk & run', 'WASD or arrow keys to walk. Hold Shift to run. Click the ground to walk there automatically.'],
          ['Care', 'Press E near a sprout (or click them) to open their care sheet. Feed, water, cuddle, play and tuck them in.'],
          ['Talk', 'Press T to talk. Listening and validating feelings builds heart, calm and trust — and it helps them grow.'],
          ['Breathe', 'A short guided breathing pause. Everything in the garden calms a little.'],
          ['Grow', 'Each sprout has four stages: Seedling, Sprout, Budling, Bloomed. Growth needs care and calm, not speed.'],
          ['Gates', 'Areas unlock with seeds and garden harmony. Harmony comes from decorations, bonds and blooms.'],
          ['Decorate', 'Buy from the shop and place items in your garden. Every item adds harmony and a little more safety.'],
          ['Arcade', 'Once the Lantern Arcade wakes, press L (or use the tent button) to play four little games. Nerdy keeps the scores, and games earn seeds and berries for the garden.'],
          ['Sleep', 'The cottage lets you rest. A new day arrives with fresh weather and its own small tasks.'],
        ].map(([title, body]) => (
          <div key={title} className="chapter-head" style={{ padding: 11 }}>
            <div>
              <h4>{title.toUpperCase()}</h4>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="chapter-head">
        <div>
          <h4>THERE IS NO FAILING</h4>
          <p>
            Sprouts may cry, wilt, or have grey days. Nothing is lost by taking your time. Gentle pacing can be found in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tutorial, breath, mobile                                           */
/* ================================================================== */

function TutorialCard({ snap, onDismiss }: { snap: Snapshot; onDismiss: () => void; onSkip: () => void }) {
  const step = Math.min(TUTORIAL.length - 1, snap.tutorialStep);
  const t = TUTORIAL[step];
  return (
    <div className="tutorial-card">
      <div className="row between">
        <span className="tc-step">
          Step {step + 1} of {TUTORIAL.length}
        </span>
        <button className="panel-link" onClick={onDismiss}>
          close
        </button>
      </div>
      <h4>{t.title.toUpperCase()}</h4>
      <p>{t.body}</p>
      <div className="tc-hint">
        <PixelIcon name="growth" size={10} /> {t.hint}
      </div>
    </div>
  );
}

function BreathOverlay({ breath, onClose }: { breath: Snapshot['breath']; onClose: () => void }) {
  const scale = breath.phase === 'in' ? 0.72 + Math.min(1, breath.progress % 2.4 / 2.4) * 0.4 : breath.phase === 'hold' ? 1.12 : 1.08;
  const phaseText = breath.phase === 'in' ? 'Breathe in' : breath.phase === 'hold' ? 'Hold' : 'Breathe out';
  const cycle = Math.floor(breath.progress / 6);
  return (
    <div className="breath-overlay">
      <div className="breath-ring">
        <div className="breath-circle" style={{ transform: `scale(${scale})` }} />
        <div className="breath-circle" style={{ transform: `scale(${scale * 0.7})`, opacity: 0.5 }} />
        <div className="breath-inner">
          <div className="breath-phase">{phaseText.toUpperCase()}</div>
          <div className="breath-count">
            {cycle + 1} of 3 · the garden breathes with you
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Finish early
        </button>
      </div>
    </div>
  );
}

function MobileControls({ engine, snap }: { engine: Engine | null; snap: Snapshot }) {
  const holdRef = useRef<{ x: number; y: number } | null>(null);
  const [run, setRun] = useState(false);
  const start = (x: number, y: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    holdRef.current = { x, y };
    engine?.touchMove(x, y, run);
  };
  const end = () => {
    holdRef.current = null;
    engine?.touchMove(0, 0, false);
  };
  useEffect(() => {
    const up = () => engine?.touchMove(0, 0, false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [engine]);
  return (
    <div className="mobile-controls">
      <div className="dpad">
        <button className="up" onPointerDown={start(0, -1)}>
          ▲
        </button>
        <button className="left" onPointerDown={start(-1, 0)}>
          ◀
        </button>
        <button
          className="run"
          onPointerDown={(e) => {
            e.preventDefault();
            setRun((r) => {
              const nr = !r;
              if (holdRef.current) engine?.touchMove(holdRef.current.x, holdRef.current.y, nr);
              return nr;
            });
          }}
        >
          RUN
        </button>
        <button className="right" onPointerDown={start(1, 0)}>
          ▶
        </button>
        <button className="down" onPointerDown={start(0, 1)}>
          ▼
        </button>
      </div>
      <div className="touch-actions">
        <button
          className="primary-touch"
          onPointerDown={(e) => {
            e.preventDefault();
            engine?.interact();
          }}
        >
          <PixelIcon name="talk" size={16} />
          CARE
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!snap.breath.active) engine?.startBreathing();
          }}
        >
          <PixelIcon name="breathe" size={14} />
          breathe
        </button>
      </div>
    </div>
  );
}

function MobileNav({
  snap,
  active,
  engine,
  onTab,
  onSelect,
}: {
  snap: Snapshot;
  active: string;
  engine: Engine | null;
  onTab: (t: 'spouts' | 'quest' | 'garden') => void;
  onSelect: (id: string) => void;
}) {
  const [sheet, setSheet] = useState<null | 'spouts' | 'quest' | 'garden'>(null);
  const sorted = [...snap.sprouts].sort((a, b) => urgency(b) - urgency(a));
  return (
    <>
      {sheet && (
        <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="modal" style={{ width: 'min(480px,100%)', maxHeight: '80dvh' }}>
            <div className="modal-head">
              <div className="modal-title">{sheet === 'spouts' ? 'YOUR SPROUTS' : sheet === 'quest' ? 'TASKS' : 'GARDEN'}</div>
              <button className="modal-close" onClick={() => setSheet(null)} aria-label="Close">
                <PixelIcon name="close" size={12} />
              </button>
            </div>
            <div className="modal-body">
              {sheet === 'spouts' && (
                <div className="sprout-list">
                  {sorted.map((s) => (
                    <button
                      key={s.id}
                      className={`sprout-card ${s.isCrying ? 'crying' : ''}`}
                      onClick={() => {
                        setSheet(null);
                        onSelect(s.id);
                      }}
                    >
                      <div className="sc-avatar">
                        <SproutPortrait id={s.id} mood={s.mood} size={40} stage={s.stage} />
                      </div>
                      <div>
                        <div className="sc-name">{s.name}</div>
                        <div className="sc-mood">{s.moodLabel}</div>
                      </div>
                      <div className="sc-stage">{ZONES[s.zone]?.name.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              )}
              {sheet === 'quest' && snap.quest && (
                <>
                  <div className="chapter-head">
                    <div>
                      <h4>{snap.quest.title.toUpperCase()}</h4>
                      <p>{snap.quest.intro}</p>
                    </div>
                  </div>
                  {snap.quest.tasks.map((t) => (
                    <div key={t.id} className={`task-row ${t.done ? 'done' : ''}`} style={{ fontSize: 13 }}>
                      <span className="task-check">{t.done ? '✓' : ''}</span>
                      <span>{t.label}</span>
                      <span className="task-count">
                        {t.progress}/{t.count}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {sheet === 'garden' && (
                <div className="stack">
                  {snap.zoneUnlocks.map((z) => (
                    <div key={z.id} className="row between" style={{ padding: '7px 0', borderBottom: '1px dashed #d3bf9b' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{z.name}</div>
                        <div className="muted">
                          {z.unlocked ? 'Awake' : `${z.seeds} seeds · ${z.harmony} harmony`}
                        </div>
                      </div>
                      {z.unlocked ? (
                        <button
                          className="btn btn-paper btn-sm"
                          onClick={() => {
                            setSheet(null);
                            engine?.teleportToZone(z.id);
                          }}
                        >
                          Travel
                        </button>
                      ) : (
                        <span className="tag">Sleeping</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <nav style={{ display: 'contents' }}>
        <button className={active === 'spouts' ? 'active' : ''} onClick={() => setSheet('spouts')}>
          <PixelIcon name="growth" size={16} />
          Sprouts
        </button>
        <button className={active === 'quest' ? 'active' : ''} onClick={() => setSheet('quest')}>
          <PixelIcon name="journal" size={16} />
          Tasks
        </button>
        <button className={active === 'garden' ? 'active' : ''} onClick={() => setSheet('garden')}>
          <PixelIcon name="map" size={16} />
          Garden
        </button>
        <button onClick={() => engine?.openShop?.()}>
          <PixelIcon name="seedbag" size={16} />
          Shop
        </button>
      </nav>
    </>
  );
}

/* ================================================================== */
/*  Title                                                              */
/* ================================================================== */

function TitleScreen({ hasSave, name, setName, onStart, onContinue }: { hasSave: boolean; name: string; setName: (v: string) => void; onStart: () => void; onContinue: () => void }) {
  return (
    <div className="title-screen">
      <div className="title-inner">
        <div className="title-sprites">
          <SproutPortrait id="pip" mood="joyful" size={62} stage={2} />
          <SproutPortrait id="fern" mood="content" size={62} stage={2} flip />
          <SproutPortrait id="tilly" mood="joyful" size={58} stage={2} />
          <SproutPortrait id="wisp" mood="content" size={58} stage={2} flip />
        </div>
        <div className="title-logo">
          LITTLE <span className="accent">SPROUTS</span>
        </div>
        <p className="title-tag">
          A cosy pixel garden where baby plants walk, run, cry, and grow. Feed them, sit with them, and talk them through the big feelings.
        </p>
        {!hasSave && (
          <div className="title-name">
            <label htmlFor="keeper">What should they call you?</label>
            <input id="keeper" value={name} onChange={(e) => setName(e.target.value)} placeholder="Keeper" maxLength={16} onKeyDown={(e) => e.key === 'Enter' && onStart()} />
          </div>
        )}
        <div className="title-btns">
          {hasSave ? (
            <>
              <button className="btn btn-primary" onClick={onContinue}>
                Continue your garden
              </button>
              <button className="btn btn-ghost" onClick={onStart}>
                Start a new garden
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onStart}>
              Open the garden gate
            </button>
          )}
        </div>
        <div className="title-foot">
          Best with sound on. Walk with WASD or arrows, hold Shift to run.
          <br />
          There is no failing here — only small plants who are glad you came.
        </div>
      </div>
    </div>
  );
}