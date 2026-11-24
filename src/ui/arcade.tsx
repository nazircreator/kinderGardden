import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MINI_GAME_BY_ID } from '../game/content';
import type { MiniGameId } from '../game/types';
import { PixelIcon } from './icons';

export interface MiniGameResult {
  score: number;
  won: boolean;
  detail: string;
}

interface Props {
  id: MiniGameId;
  best: number;
  onFinish: (r: MiniGameResult) => void;
  onExit: () => void;
}

export function MiniGame({ id, best, onFinish, onExit }: Props) {
  const def = MINI_GAME_BY_ID[id];
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const [round, setRound] = useState(0);
  const finish = useCallback(
    (r: MiniGameResult) => {
      setResult(r);
    },
    [],
  );
  const again = () => {
    setResult(null);
    setRound((r) => r + 1);
  };

  return (
    <div className="scrim arcade-scrim">
      <div className="modal arcade-modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">{def?.name.toUpperCase() ?? 'ARCADE'}</div>
            <div className="modal-sub">{def?.blurb}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="arcade-best">
              <PixelIcon name="trust" size={11} /> best {best}
            </span>
            <button className="modal-close" onClick={onExit} aria-label="Leave the game">
              <PixelIcon name="close" size={13} />
            </button>
          </div>
        </div>

        {result ? (
          <div className="arcade-result">
            <div className={`ar-badge ${result.won ? 'win' : ''}`}>{result.won ? '✿' : '·'}</div>
            <h3>{result.won ? 'Lovely playing!' : 'Nice try!'}</h3>
            <p>{result.detail}</p>
            <div className="ar-score">
              <span className="ar-num">{result.score}</span>
              <span className="ar-label">points</span>
            </div>
            <div className="ar-actions">
              <button className="btn btn-primary" onClick={again}>
                Play again
              </button>
              <button
                className="btn btn-gold"
                onClick={() => {
                  onFinish(result);
                  onExit();
                }}
              >
                Collect & leave
              </button>
            </div>
            <p className="ar-hint">Nerdy writes your score in the little book.</p>
          </div>
        ) : (
          <>
            <div className="arcade-howto">{def?.howTo}</div>
            <div className="arcade-stage">
              {id === 'berrycatch' && <BerryCatch key={round} onEnd={finish} />}
              {id === 'memory' && <MemoryGarden key={round} onEnd={finish} />}
              {id === 'firefly' && <FireflyGlow key={round} onEnd={finish} />}
              {id === 'melody' && <MelodyBlooms key={round} onEnd={finish} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  1. Berry Catch — catch falling berries, dodge stones               */
/* ================================================================== */

interface Faller {
  x: number;
  y: number;
  vy: number;
  kind: 'berry' | 'stone' | 'gold';
  spin: number;
}

function BerryCatch({ onEnd }: { onEnd: (r: MiniGameResult) => void }) {
  const W = 460;
  const H = 300;
  const [basketX, setBasketX] = useState(W / 2);
  const [items, setItems] = useState<Faller[]>([]);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [paused, setPaused] = useState(false);
  const keys = useRef<Set<string>>(new Set());
  const basketRef = useRef(W / 2);
  const endedRef = useRef(false);

  useEffect(() => {
    basketRef.current = basketX;
  }, [basketX]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd', ' '].includes(k)) e.preventDefault();
      keys.current.add(k);
      if (k === ' ') setPaused((p) => !p);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    let spawnT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // basket steering
      const k = keys.current;
      let dir = 0;
      if (k.has('arrowleft') || k.has('a')) dir -= 1;
      if (k.has('arrowright') || k.has('d')) dir += 1;
      if (dir) setBasketX((x) => Math.max(30, Math.min(W - 30, x + dir * 340 * dt)));
      // spawn
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 0.42 + Math.random() * 0.4;
        const roll = Math.random();
        const kind: Faller['kind'] = roll < 0.62 ? 'berry' : roll < 0.9 ? 'stone' : 'gold';
        setItems((prev) => [
          ...prev,
          { x: 24 + Math.random() * (W - 48), y: -12, vy: 90 + Math.random() * 70, kind, spin: Math.random() * 6 },
        ]);
      }
      setItems((prev) => {
        const bx = basketRef.current;
        const next: Faller[] = [];
        for (const it of prev) {
          const ny = it.y + it.vy * dt;
          const inBasket = ny > H - 34 && ny < H - 6 && Math.abs(it.x - bx) < 30;
          if (inBasket) {
            if (it.kind === 'berry') setCaught((c) => c + 1);
            else if (it.kind === 'gold') setCaught((c) => c + 3);
            else setHits((h) => h + 1);
            continue;
          }
          if (ny > H + 10) {
            if (it.kind !== 'stone') setMissed((m) => m + 1);
            continue;
          }
          next.push({ ...it, y: ny });
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (timeLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    const score = Math.max(0, caught * 10 - hits * 12 - missed * 3);
    onEnd({
      score,
      won: caught >= 10,
      detail: `You caught ${caught} berries${hits ? ` and bumped ${hits} stones` : ''}.${missed ? ` ${missed} rolled past.` : ''}`,
    });
  }, [timeLeft, caught, hits, missed, onEnd]);

  return (
    <div className="mg-berry">
      <div className="mg-hud">
        <span className="mg-stat">
          <PixelIcon name="berries" size={12} /> {caught}
        </span>
        <span className="mg-stat warn">
          <PixelIcon name="close" size={11} /> {hits}
        </span>
        <span className="mg-timer">{timeLeft}s</span>
        <button className="mg-pause" onClick={() => setPaused((p) => !p)}>
          {paused ? 'resume' : 'pause'}
        </button>
      </div>
      <div
        className="mg-field"
        style={{ height: H }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          setBasketX(Math.max(30, Math.min(W - 30, x)));
        }}
      >
        <div className="mg-sky" />
        {items.map((it, i) => (
          <span
            key={i}
            className={`mg-faller ${it.kind}`}
            style={{ left: `${(it.x / W) * 100}%`, top: it.y }}
          />
        ))}
        <div className="mg-basket" style={{ left: `${(basketX / W) * 100}%` }}>
          <span className="mg-basket-lip" />
          <span className="mg-basket-body" />
        </div>
      </div>
      <p className="mg-controls">Move: mouse, ◀ ▶, or A/D · Space pauses</p>
    </div>
  );
}

/* ================================================================== */
/*  2. Memory Garden — match the leaf pairs                            */
/* ================================================================== */

const MEMORY_FACES = ['✿', '❀', '☘', '✤', '❁', '✾'];

function MemoryGarden({ onEnd }: { onEnd: (r: MiniGameResult) => void }) {
  const [deck, setDeck] = useState(() => makeDeck());
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [flips, setFlips] = useState(0);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);

  function makeDeck() {
    const pairs = MEMORY_FACES.map((f, i) => [
      { face: f, pair: i },
      { face: f, pair: i },
    ]).flat();
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
  }

  // Refs mirror state so two fast clicks in one frame can never clobber each other.
  const openRef = useRef<number[]>([]);
  const matchedRef = useRef<number[]>([]);
  const lockRef = useRef(false);

  const click = (i: number) => {
    if (lockRef.current || openRef.current.includes(i) || matchedRef.current.includes(i)) return;
    const next = [...openRef.current, i];
    openRef.current = next;
    setOpen(next);
    setFlips((f) => f + 1);
    if (next.length < 2) return;
    const [a, b] = next;
    if (deck[a].pair === deck[b].pair) {
      const m = [...matchedRef.current, a, b];
      matchedRef.current = m;
      setMatched(m);
      openRef.current = [];
      setOpen([]);
    } else {
      lockRef.current = true;
      setLock(true);
      setTimeout(() => {
        openRef.current = [];
        setOpen([]);
        lockRef.current = false;
        setLock(false);
      }, 720);
    }
  };

  useEffect(() => {
    if (matched.length !== deck.length || endedRef.current) return;
    endedRef.current = true;
    const perfect = MEMORY_FACES.length * 2;
    const score = Math.max(10, Math.round((perfect / Math.max(perfect, flips)) * 120));
    onEnd({
      score,
      won: true,
      detail: `All pairs found in ${flips} flips. ${flips <= perfect + 4 ? 'Nerdy says that is excellent recall.' : 'A steady, thoughtful round.'}`,
    });
  }, [matched, deck.length, flips, onEnd]);

  return (
    <div className="mg-memory">
      <div className="mg-hud">
        <span className="mg-stat">
          <PixelIcon name="journal" size={12} /> {matched.length / 2}/{MEMORY_FACES.length} pairs
        </span>
        <span className="mg-stat">flips {flips}</span>
      </div>
      <div className="mg-grid">
        {deck.map((card, i) => {
          const isOpen = open.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              className={`mg-card ${isOpen ? 'open' : ''} ${matched.includes(i) ? 'matched' : ''}`}
              onClick={() => click(i)}
              aria-label={isOpen ? card.face : 'Hidden card'}
            >
              <span className="mg-card-inner">{isOpen ? card.face : ''}</span>
            </button>
          );
        })}
      </div>
      <p className="mg-controls">Click two cards to find a matching pair</p>
    </div>
  );
}

/* ================================================================== */
/*  3. Firefly Glow — click the drifting lights                        */
/* ================================================================== */

interface Fly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: string;
}

function FireflyGlow({ onEnd }: { onEnd: (r: MiniGameResult) => void }) {
  const W = 460;
  const H = 300;
  const [flies, setFlies] = useState<Fly[]>([]);
  const [caught, setCaught] = useState(0);
  const [escaped, setEscaped] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [flash, setFlash] = useState<{ x: number; y: number; id: number } | null>(null);
  const endedRef = useRef(false);
  const spawnRef = useRef(1.1);
  const idRef = useRef(1);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const difficulty = 1 + caught * 0.06;
      spawnRef.current -= dt;
      if (spawnRef.current <= 0) {
        spawnRef.current = Math.max(0.32, 1.05 - caught * 0.02);
        const life = Math.max(1.5, 3.6 - caught * 0.05);
        setFlies((prev) => [
          ...prev.slice(-16),
          {
            id: idRef.current++,
            x: 30 + Math.random() * (W - 60),
            y: 30 + Math.random() * (H - 60),
            vx: (Math.random() - 0.5) * 46 * difficulty,
            vy: (Math.random() - 0.5) * 40 * difficulty,
            life,
            maxLife: life,
            hue: Math.random() < 0.5 ? '#d9f7a8' : Math.random() < 0.5 ? '#b6f2e4' : '#f8e6a4',
          },
        ]);
      }
      setFlies((prev) => {
        const next: Fly[] = [];
        let lost = 0;
        for (const f of prev) {
          const life = f.life - dt;
          if (life <= 0) {
            lost++;
            continue;
          }
          let x = f.x + f.vx * dt;
          let y = f.y + f.vy * dt;
          if (x < 20 || x > W - 20) f.vx *= -1;
          if (y < 20 || y > H - 20) f.vy *= -1;
          x = Math.max(20, Math.min(W - 20, x));
          y = Math.max(20, Math.min(H - 20, y));
          next.push({ ...f, x, y, vx: f.vx, vy: f.vy, life });
        }
        if (lost) setEscaped((e) => e + lost);
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [caught]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timeLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    const score = caught * 10 + combo * 2;
    onEnd({
      score,
      won: caught >= 12,
      detail: `You caught ${caught} fireflies. ${caught >= 20 ? 'The hollow is glowing.' : caught >= 12 ? 'A lovely warm evening.' : 'The quick ones got away — try again?'}`,
    });
  }, [timeLeft, caught, combo, onEnd]);

  const tap = (f: Fly) => {
    setFlies((prev) => prev.filter((x) => x.id !== f.id));
    setCaught((c) => c + 1);
    setCombo((c) => c + 1);
    setFlash({ x: f.x, y: f.y, id: f.id });
    setTimeout(() => setFlash(null), 240);
  };

  return (
    <div className="mg-firefly">
      <div className="mg-hud">
        <span className="mg-stat">
          <PixelIcon name="trust" size={12} /> {caught}
        </span>
        <span className="mg-stat">combo {combo}</span>
        <span className="mg-stat warn">missed {escaped}</span>
        <span className="mg-timer">{timeLeft}s</span>
      </div>
      <div className="mg-night" style={{ height: H }}>
        {flies.map((f) => (
          <button
            key={f.id}
            className="mg-fly"
            style={{
              left: `${(f.x / W) * 100}%`,
              top: `${(f.y / H) * 100}%`,
              opacity: 0.35 + (f.life / f.maxLife) * 0.65,
              background: f.hue,
              boxShadow: `0 0 ${8 + (f.life / f.maxLife) * 8}px ${f.hue}`,
            }}
            onClick={() => tap(f)}
            aria-label="Catch firefly"
          />
        ))}
        {flash && <span className="mg-pop" style={{ left: `${(flash.x / W) * 100}%`, top: `${(flash.y / H) * 100}%` }} />}
        <div className="mg-moon" />
      </div>
      <p className="mg-controls">Click or tap the fireflies before they fade</p>
    </div>
  );
}

/* ================================================================== */
/*  4. Melody Blooms — repeat the flower song                          */
/* ================================================================== */

const FLOWER_COLORS = ['#e0606b', '#f2c14e', '#7fb069', '#7fa7d9', '#d983b0', '#b9a7e0'];

function MelodyBlooms({ onEnd }: { onEnd: (r: MiniGameResult) => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);
  const [wrong, setWrong] = useState(false);
  const endedRef = useRef(false);
  const timers = useRef<number[]>([]);

  const playSequence = useCallback((s: number[]) => {
    setPlaying(true);
    setInput([]);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    s.forEach((note, i) => {
      const t1 = window.setTimeout(() => setLit(note), i * 620 + 200);
      const t2 = window.setTimeout(() => setLit(null), i * 620 + 200 + 380);
      timers.current.push(t1, t2);
    });
    const done = window.setTimeout(() => {
      setPlaying(false);
      setLit(null);
    }, s.length * 620 + 320);
    timers.current.push(done);
  }, []);

  useEffect(() => {
    if (seq.length === 0 && !playing && level === 0) {
      const first = [Math.floor(Math.random() * FLOWER_COLORS.length)];
      setSeq(first);
      setLevel(1);
      playSequence(first);
    }
  }, [seq.length, playing, level, playSequence]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tap = (note: number) => {
    if (playing || endedRef.current) return;
    setLit(note);
    setTimeout(() => setLit(null), 180);
    const next = [...input, note];
    setInput(next);
    const idx = next.length - 1;
    if (next[idx] !== seq[idx]) {
      // wrong note: round ends
      setWrong(true);
      setPlaying(true);
      const t = window.setTimeout(() => {
        const reached = seq.length - 1;
        onEnd({
          score: reached * 14,
          won: reached >= 4,
          detail: `You remembered ${reached} note${reached === 1 ? '' : 's'} in the song.${reached >= 4 ? ' Nerdy is humming it.' : ''}`,
        });
      }, 900);
      timers.current.push(t);
      return;
    }
    if (next.length === seq.length) {
      // completed round -> extend
      setPlaying(true);
      const t = window.setTimeout(() => {
        const grown = [...seq, Math.floor(Math.random() * FLOWER_COLORS.length)];
        setSeq(grown);
        setLevel((l) => l + 1);
        if (grown.length > 9) {
          endedRef.current = true;
          onEnd({ score: grown.length * 14 + 40, won: true, detail: 'Nine notes and not one mistake. The whole garden is listening.' });
          return;
        }
        playSequence(grown);
      }, 800);
      timers.current.push(t);
    }
  };

  return (
    <div className="mg-melody">
      <div className="mg-hud">
        <span className="mg-stat">
          <PixelIcon name="sing" size={12} /> round {level}
        </span>
        <span className="mg-stat">notes {seq.length}</span>
        <span className="mg-timer">{playing ? 'listen…' : 'your turn'}</span>
      </div>
      <div className={`mg-flowers ${wrong ? 'wrong' : ''}`}>
        {FLOWER_COLORS.map((c, i) => (
          <button
            key={i}
            className={`mg-flower ${lit === i ? 'lit' : ''}`}
            style={{ ['--petal' as string]: c }}
            onClick={() => tap(i)}
            disabled={playing}
            aria-label={`Flower ${i + 1}`}
          >
            <span className="mf-petals" />
            <span className="mf-core" />
          </button>
        ))}
      </div>
      <div className="mg-progress">
        {seq.map((_, i) => (
          <span key={i} className={`mg-pip ${i < input.length ? 'done' : ''}`} />
        ))}
      </div>
      <p className="mg-controls">{playing ? 'Watch and listen…' : 'Repeat the song by clicking the flowers'}</p>
    </div>
  );
}

export function ArcadeHub({
  miniGames,
  onPlay,
  onClose,
  seeds,
}: {
  miniGames: Record<string, { plays: number; best: number }>;
  onPlay: (id: MiniGameId) => void;
  onClose: () => void;
  seeds: number;
}) {
  const games = useMemo(() => Object.values(MINI_GAME_BY_ID), []);
  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Lantern Arcade">
        <div className="modal-head">
          <div>
            <div className="modal-title">LANTERN ARCADE</div>
            <div className="modal-sub">Four little games. Nerdy keeps the book of scores.</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <PixelIcon name="close" size={13} />
          </button>
        </div>
        <div className="modal-body">
          <div className="arcade-hub-grid">
            {games.map((g) => {
              const rec = miniGames[g.id];
              return (
                <button key={g.id} className="arcade-card" style={{ ['--accent' as string]: g.color }} onClick={() => onPlay(g.id)}>
                  <span className="ac-icon">
                    <PixelIcon name={g.icon} size={22} />
                  </span>
                  <span className="ac-name">{g.name}</span>
                  <span className="ac-blurb">{g.blurb}</span>
                  <span className="ac-foot">
                    <span className="ac-best">best {rec?.best ?? 0}</span>
                    <span className="ac-plays">{rec?.plays ?? 0} plays</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="arcade-note">
            <PixelIcon name="seeds" size={12} /> Every game earns seeds and berries for the garden. You have {seeds} seeds.
          </div>
        </div>
      </div>
    </div>
  );
}
