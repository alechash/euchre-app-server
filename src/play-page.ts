export function renderPlayPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Euchre</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --felt:       #1a5c38;
      --felt-dark:  #0e3d24;
      --felt-light: #226e45;
      --card-red:   #cc2200;
      --card-black: #111111;
      --gold:       #f5c842;
      --blue:       #1d4ed8;
      --surface:    #1e293b;
      --surface2:   #0f172a;
      --text:       #e2e8f0;
      --text-dim:   #94a3b8;
      --border:     #334155;
      --success:    #22c55e;
      --danger:     #ef4444;
      --warning:    #f59e0b;
      --team1:      #60a5fa;
      --team2:      #f472b6;
    }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--surface2);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Screens ── */
    .screen { display: none; }
    .screen.active { display: flex; flex-direction: column; flex: 1; min-height: 100vh; }

    /* ══════════════════════════════════════
       AUTH SCREEN
    ══════════════════════════════════════ */
    #auth-screen {
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(ellipse at 50% 30%, #1e3a5f 0%, #0f172a 65%);
    }

    .auth-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px 36px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.7);
    }

    .auth-logo {
      text-align: center;
      margin-bottom: 6px;
    }

    .auth-logo h1 {
      font-size: 3.2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #f5c842, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -1px;
    }

    .auth-logo p {
      color: var(--text-dim);
      font-size: 0.9rem;
      margin-top: 2px;
    }

    .auth-suits {
      display: flex;
      justify-content: center;
      gap: 16px;
      font-size: 2.2rem;
      margin: 20px 0;
    }

    .suit-h, .suit-d { color: var(--card-red); }
    .suit-s, .suit-c { color: #e2e8f0; }

    .field { margin-top: 22px; }
    .field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--text-dim);
      margin-bottom: 7px;
    }

    input.f-input {
      width: 100%;
      padding: 13px 16px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 1rem;
      font-family: inherit;
      transition: border-color .2s;
    }
    input.f-input:focus { outline: none; border-color: var(--blue); }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: .9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background .15s, transform .1s, box-shadow .15s;
      white-space: nowrap;
    }
    .btn:active:not(:disabled) { transform: scale(.97); }
    .btn:disabled { opacity: .4; cursor: default; pointer-events: none; }

    .btn-primary { background: #1d4ed8; color: #fff; border-color: #2563eb; }
    .btn-primary:hover { background: #2563eb; }

    .btn-gold {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #fff;
      box-shadow: 0 0 16px rgba(245,200,66,.3);
    }
    .btn-gold:hover { background: linear-gradient(135deg, #b45309, #92400e); }

    .btn-ghost { background: transparent; border-color: var(--border); color: var(--text); }
    .btn-ghost:hover { background: var(--surface); }

    .btn-success { background: #166534; border-color: #22c55e40; color: #fff; }
    .btn-success:hover { background: #15803d; }

    .btn-danger { background: #7f1d1d; border-color: #ef444440; color: #fff; }
    .btn-danger:hover { background: #991b1b; }

    .btn-full { width: 100%; margin-top: 14px; }

    /* ══════════════════════════════════════
       LOBBY SCREEN
    ══════════════════════════════════════ */
    #lobby-screen {
      padding: 20px;
      align-items: center;
      background: radial-gradient(ellipse at 50% 0%, #1a2a40 0%, #0f172a 60%);
    }

    .lobby-header {
      text-align: center;
      padding: 20px 0 16px;
    }
    .lobby-header h2 {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: -0.5px;
    }
    .lobby-header p { color: var(--text-dim); font-size: .9rem; margin-top: 4px; }

    .lobby-inner {
      width: 100%;
      max-width: 660px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
    }
    .panel h3 {
      font-size: .75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: var(--text-dim);
      margin-bottom: 14px;
    }

    .create-join-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .create-join-row .btn { flex: 1; min-width: 130px; }
    .invite-input-wrap { display: flex; gap: 8px; flex: 1; min-width: 180px; }
    .invite-input-wrap input.f-input { text-transform: uppercase; text-align: center; letter-spacing: 5px; font-weight: 700; font-size: 1.1rem; }

    /* Invite code display */
    .code-display {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: 12px;
      text-align: center;
      color: var(--gold);
      font-variant-numeric: tabular-nums;
      background: var(--surface2);
      border-radius: 12px;
      padding: 14px;
      border: 2px dashed #334155;
      margin-bottom: 14px;
      cursor: pointer;
      transition: border-color .2s;
    }
    .code-display:hover { border-color: var(--gold); }
    .code-hint { font-size: .75rem; color: var(--text-dim); text-align: center; margin-bottom: 14px; }

    /* Player slots */
    .slots-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .slot {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 54px;
      transition: border-color .2s;
    }
    .slot.me     { border-color: #1d4ed8; }
    .slot.partner{ border-color: #166534; }
    .slot.opp    { border-color: #6d28d9; }
    .slot.empty  { border-style: dashed; opacity: .55; }

    .slot-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .6rem; font-weight: 800;
      flex-shrink: 0;
    }
    .slot-avatar.me      { background: #1e40af; }
    .slot-avatar.partner { background: #14532d; }
    .slot-avatar.opp     { background: #4c1d95; }
    .slot-avatar.empty   { background: #334155; }

    .slot-name  { font-weight: 600; font-size: .9rem; line-height: 1.2; }
    .slot-sub   { font-size: .68rem; color: var(--text-dim); }

    .lobby-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .lobby-actions .btn { flex: 1; min-width: 130px; }

    /* ══════════════════════════════════════
       GAME SCREEN
    ══════════════════════════════════════ */
    #game-screen {
      flex: 1;
      display: none;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    #game-screen.active { display: flex; }

    /* Top bar */
    .topbar {
      background: #060d1a;
      border-bottom: 1px solid #1e293b;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .scores {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .score-block { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .score-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
    .score-num   { font-size: 1.5rem; font-weight: 800; line-height: 1; }
    .score-sep   { font-size: 1rem; color: var(--text-dim); font-weight: 300; }
    .score-target { font-size: .65rem; color: var(--text-dim); align-self: flex-end; padding-bottom: 2px; }

    .trump-pill {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 5px 12px;
    }
    .trump-pill-label { font-size: .65rem; color: var(--text-dim); text-transform: uppercase; }
    .trump-sym { font-size: 1.2rem; font-weight: 700; }

    .tricks-row { display: flex; align-items: center; gap: 6px; }
    .tricks-label { font-size: .65rem; color: var(--text-dim); text-transform: uppercase; }
    .trick-pips { display: flex; gap: 3px; }
    .trick-pip {
      width: 10px; height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,.15);
    }
    .trick-pip.t1 { background: var(--team1); }
    .trick-pip.t2 { background: var(--team2); }

    .phase-chip {
      margin-left: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 11px;
      font-size: .72rem;
      color: var(--text-dim);
    }

    .conn-wrap { display: flex; align-items: center; gap: 5px; }
    .conn-dot  { width: 7px; height: 7px; border-radius: 50%; }
    .conn-dot.live   { background: var(--success); }
    .conn-dot.busy   { background: var(--warning); animation: blink 1s infinite; }
    .conn-dot.off    { background: var(--danger); }
    .conn-txt { font-size: .68rem; color: var(--text-dim); }

    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

    /* ── Table wrap ── */
    .table-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 16px 8px;
      overflow: hidden;
      position: relative;
    }

    /* Oval felt table */
    .table {
      position: relative;
      width: min(580px, 100%);
      aspect-ratio: 4/3;
      background: radial-gradient(ellipse at 40% 35%, var(--felt-light), var(--felt) 55%, var(--felt-dark));
      border-radius: 50%;
      box-shadow:
        0 0 0 10px #5c3d11,
        0 0 0 12px #3d2808,
        0 24px 70px rgba(0,0,0,.9);
      border: 3px solid #7a5230;
    }

    /* ── Player areas ── */
    .parea {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .parea.south { bottom: -6px; left: 50%; transform: translateX(-50%); }
    .parea.north { top: -6px;    left: 50%; transform: translateX(-50%); }
    .parea.west  { left: -6px;  top: 50%; transform: translateY(-50%); }
    .parea.east  { right: -6px; top: 50%; transform: translateY(-50%); }

    .nameplate {
      background: rgba(0,0,0,.72);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 20px;
      padding: 4px 10px;
      font-size: .75rem;
      font-weight: 600;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: border-color .3s, color .3s;
    }
    .nameplate.myturn {
      border-color: var(--gold);
      color: var(--gold);
      animation: glow-pulse 1.4s infinite;
    }
    @keyframes glow-pulse {
      0%,100%{ box-shadow: 0 0 0 0 rgba(245,200,66,.45); }
      50%     { box-shadow: 0 0 0 7px rgba(245,200,66,0); }
    }

    .tdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dealer-d {
      background: var(--gold); color: #000;
      font-size: .6rem; font-weight: 800;
      border-radius: 8px; padding: 1px 5px;
    }

    .opp-hand { display: flex; gap: 2px; }
    .opp-hand.vert { flex-direction: column; }

    /* ── Cards ── */
    .card {
      background: #fff;
      border-radius: 6px;
      border: 1px solid #ccc;
      box-shadow: 0 2px 8px rgba(0,0,0,.45);
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      user-select: none;
      flex-shrink: 0;
      transition: transform .15s, box-shadow .15s;
    }
    .card.sz-lg  { width: 54px; height: 78px; }
    .card.sz-md  { width: 42px; height: 62px; }
    .card.sz-sm  { width: 34px; height: 50px; }
    .card.sz-xs  { width: 28px; height: 40px; }

    .card.red   { color: var(--card-red); }
    .card.black { color: var(--card-black); }

    .card .ccorner {
      position: absolute;
      line-height: 1.1;
      font-size: .65rem;
    }
    .card .ccorner.tl { top: 3px; left: 4px; text-align: left; }
    .card .ccorner.br { bottom: 3px; right: 4px; text-align: right; transform: rotate(180deg); }
    .card .ccenter { font-size: 1.3rem; }
    .card.sz-md .ccenter { font-size: 1rem; }
    .card.sz-sm .ccenter { font-size: .8rem; }
    .card.sz-xs .ccenter { font-size: .65rem; }

    /* Back pattern */
    .card.back {
      background: #fff;
      cursor: default;
    }
    .card-back-inner {
      width: 100%; height: 100%;
      border-radius: 5px;
      background:
        repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 4px, #162e4a 4px, #162e4a 8px);
      border: 2px solid rgba(255,255,255,.08);
    }

    /* Playable card interactions */
    .card.playable { cursor: pointer; }
    .card.playable:hover {
      transform: translateY(-14px) scale(1.04);
      box-shadow: 0 14px 28px rgba(0,0,0,.7);
      z-index: 10;
    }
    .card.dimmed { opacity: .4; filter: grayscale(.5); }

    /* Trick card entrance animation */
    .trick-appear {
      animation: trick-in .28s cubic-bezier(.22,.68,0,1.3);
    }
    @keyframes trick-in {
      from { opacity: 0; transform: scale(.55) translateY(-8px); }
      to   { opacity: 1; transform: scale(1)  translateY(0); }
    }

    /* ── Trick area ── */
    .trick-area {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 190px; height: 180px;
      display: grid;
      grid-template-areas:
        ".    north ."
        "west  ctr  east"
        ".    south .";
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr 1fr;
      align-items: center;
      justify-items: center;
      gap: 3px;
    }
    .tslot        { display:flex; align-items:center; justify-content:center; }
    .tslot.north  { grid-area: north; }
    .tslot.south  { grid-area: south; }
    .tslot.west   { grid-area: west; }
    .tslot.east   { grid-area: east; }
    .tslot.ctr    { grid-area: ctr; }

    /* Trump big background symbol */
    .trump-bg {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 5rem;
      opacity: .09;
      pointer-events: none;
    }

    /* Flipped card (trump calling) */
    .flip-area {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      display: flex; flex-direction: column;
      align-items: center; gap: 6px;
    }
    .flip-label {
      font-size: .65rem;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: .06em;
      font-weight: 700;
    }

    /* ── Your hand ── */
    .hand-bar {
      flex-shrink: 0;
      background: rgba(6,13,26,.85);
      border-top: 1px solid #1e293b;
      padding: 10px 16px 14px;
    }
    .hand-label {
      font-size: .7rem;
      color: var(--gold);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      text-align: center;
      margin-bottom: 8px;
      animation: pulse-fade 1.1s infinite;
    }
    @keyframes pulse-fade { 0%,100%{opacity:1} 50%{opacity:.4} }

    .hand-cards {
      display: flex;
      justify-content: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    /* ── Action overlay ── */
    .action-overlay {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: flex;
      justify-content: center;
      z-index: 60;
      pointer-events: none;
    }
    .action-panel {
      background: rgba(6,13,26,.97);
      border: 1px solid var(--border);
      border-bottom: none;
      border-radius: 18px 18px 0 0;
      padding: 18px 20px 20px;
      pointer-events: all;
      width: 100%;
      max-width: 560px;
      backdrop-filter: blur(12px);
      animation: slide-up .28s ease-out;
    }
    @keyframes slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .action-heading {
      font-size: .8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--gold);
      text-align: center;
      margin-bottom: 14px;
    }
    .action-btns {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .action-btns .btn { min-width: 130px; flex: 1; }

    /* Suit picker */
    .suit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .suit-opt {
      padding: 16px 10px;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color .15s, transform .12s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--surface);
    }
    .suit-opt.red   { color: var(--card-red); }
    .suit-opt.black { color: #222; background: #e8e8e8; }
    .suit-opt:hover { border-color: var(--gold); transform: scale(1.03); }
    .suit-opt:active { transform: scale(.97); }
    .suit-opt:disabled { opacity: .3; pointer-events: none; }

    /* ── Toast ── */
    #toast {
      position: fixed;
      top: 66px; left: 50%;
      transform: translateX(-50%);
      background: rgba(6,13,26,.95);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 8px 20px;
      font-size: .88rem;
      font-weight: 500;
      z-index: 200;
      white-space: nowrap;
      pointer-events: none;
    }
    .toast-in  { animation: t-in .25s ease-out forwards; }
    .toast-out { animation: t-out .3s ease-in forwards; }
    @keyframes t-in  { from{opacity:0;top:46px} to{opacity:1;top:66px} }
    @keyframes t-out { from{opacity:1;top:66px} to{opacity:0;top:46px} }

    /* ── Modal ── */
    .modal-bg {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.82);
      display: flex; align-items: center; justify-content: center;
      z-index: 300;
      backdrop-filter: blur(5px);
    }
    .modal-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 34px 32px;
      max-width: 380px; width: 90%;
      text-align: center;
      animation: m-in .28s ease-out;
    }
    @keyframes m-in { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
    .modal-box h2 { font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; }
    .modal-box p  { color: var(--text-dim); font-size: .9rem; margin-bottom: 22px; }
    .modal-scores {
      display: flex; justify-content: center; gap: 36px; margin: 18px 0 24px;
    }
    .ms-block { text-align: center; }
    .ms-num   { font-size: 3rem; font-weight: 800; line-height: 1; }
    .ms-label { font-size: .75rem; color: var(--text-dim); margin-top: 3px; }

    /* Hand result flash */
    .hand-flash {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(6,13,26,.97);
      border: 2px solid var(--gold);
      border-radius: 18px;
      padding: 24px 36px;
      text-align: center;
      z-index: 250;
      pointer-events: none;
      animation: m-in .25s ease-out;
      min-width: 260px;
    }
    .hand-flash h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 6px; }
    .hand-flash p  { color: var(--text-dim); font-size: .88rem; }

    /* Responsive */
    @media (max-width: 520px) {
      .table { aspect-ratio: 1 / 1; }
      .trick-area { width: 148px; height: 140px; }
      .card.sz-lg { width: 44px; height: 64px; }
      .card.sz-md { width: 34px; height: 50px; }
      .card.sz-sm { width: 26px; height: 38px; }
      .card.sz-xs { width: 22px; height: 32px; }
      .topbar { padding: 7px 10px; gap: 9px; }
    }
  </style>
</head>
<body>

<!-- ╔═══════════════════════════════════╗
     ║         AUTH SCREEN               ║
     ╚═══════════════════════════════════╝ -->
<div id="auth-screen" class="screen active">
  <div class="auth-box">
    <div class="auth-logo">
      <h1>Euchre</h1>
      <p>Classic trick-taking card game</p>
    </div>
    <div class="auth-suits">
      <span class="suit-h">♥</span>
      <span class="suit-s">♠</span>
      <span class="suit-d">♦</span>
      <span class="suit-c">♣</span>
    </div>
    <div class="field">
      <label for="nameInput">Your Name</label>
      <input class="f-input" id="nameInput" placeholder="Enter your display name" maxlength="24" autocomplete="off" />
    </div>
    <button class="btn btn-primary btn-full" id="enterBtn" style="font-size:1rem;padding:14px">
      Enter the Table →
    </button>
    <p style="text-align:center;margin-top:14px;font-size:.75rem;color:var(--text-dim)">
      No account needed — just enter a name and play!
    </p>
  </div>
</div>

<!-- ╔═══════════════════════════════════╗
     ║         LOBBY SCREEN              ║
     ╚═══════════════════════════════════╝ -->
<div id="lobby-screen" class="screen">
  <div class="lobby-header">
    <h2>♣ Euchre ♠</h2>
    <p id="lobby-who"></p>
  </div>

  <div class="lobby-inner" style="margin:0 auto;padding:0 16px 24px">

    <!-- Create / Join panel (shown when not in a game) -->
    <div class="panel" id="panel-new">
      <h3>Join or Create a Game</h3>
      <div class="create-join-row">
        <button class="btn btn-primary" id="createBtn">+ Create Game</button>
        <div class="invite-input-wrap">
          <input class="f-input" id="codeInput" placeholder="INVITE" maxlength="6" autocomplete="off" />
          <button class="btn btn-ghost" id="joinBtn">Join</button>
        </div>
      </div>
    </div>

    <!-- Waiting room (shown when in a game, phase = waiting) -->
    <div class="panel" id="panel-waiting" style="display:none">
      <h3>Waiting Room</h3>
      <div class="code-display" id="codeDisplay" title="Click to copy">------</div>
      <p class="code-hint">Share this code with friends to invite them!</p>
      <div class="slots-grid" id="slotsGrid"></div>
      <div class="lobby-actions">
        <button class="btn btn-ghost" id="botsBtn">🤖 Fill with Bots</button>
        <button class="btn btn-success" id="startBtn">▶ Start Game</button>
      </div>
      <button class="btn btn-ghost btn-full" id="leaveBtn"
        style="margin-top:10px;opacity:.5;font-size:.8rem">Leave Game</button>
    </div>

  </div>
</div>

<!-- ╔═══════════════════════════════════╗
     ║         GAME SCREEN               ║
     ╚═══════════════════════════════════╝ -->
<div id="game-screen" class="screen">

  <!-- Top bar -->
  <div class="topbar">
    <div class="scores">
      <div class="score-block">
        <span class="score-label">Us</span>
        <span class="score-num" id="s-us" style="color:var(--team1)">0</span>
      </div>
      <span class="score-sep">–</span>
      <div class="score-block">
        <span class="score-label">Them</span>
        <span class="score-num" id="s-them" style="color:var(--team2)">0</span>
      </div>
      <span class="score-target" id="s-target"></span>
    </div>

    <div class="trump-pill" id="trump-pill" style="display:none">
      <span class="trump-pill-label">Trump</span>
      <span class="trump-sym" id="trump-sym"></span>
    </div>

    <div class="tricks-row" id="tricks-row" style="display:none">
      <span class="tricks-label">Tricks</span>
      <div class="trick-pips" id="trick-pips"></div>
    </div>

    <div class="phase-chip" id="phase-chip">Waiting</div>

    <div class="conn-wrap" style="margin-left:auto">
      <div class="conn-dot off" id="cdot"></div>
      <span class="conn-txt" id="ctxt">Offline</span>
    </div>
  </div>

  <!-- Table -->
  <div class="table-wrap">
    <div class="table" id="the-table">

      <!-- Trump background glyph -->
      <div class="trump-bg" id="trump-bg"></div>

      <!-- North player -->
      <div class="parea north" id="pa-north">
        <div class="nameplate" id="np-north">
          <span class="tdot" id="td-north"></span>
          <span id="pn-north">—</span>
        </div>
        <div class="opp-hand" id="oh-north"></div>
      </div>

      <!-- West player -->
      <div class="parea west" id="pa-west">
        <div class="opp-hand vert" id="oh-west"></div>
        <div class="nameplate" id="np-west">
          <span class="tdot" id="td-west"></span>
          <span id="pn-west">—</span>
        </div>
      </div>

      <!-- East player -->
      <div class="parea east" id="pa-east">
        <div class="nameplate" id="np-east">
          <span class="tdot" id="td-east"></span>
          <span id="pn-east">—</span>
        </div>
        <div class="opp-hand vert" id="oh-east"></div>
      </div>

      <!-- South (you) -->
      <div class="parea south" id="pa-south">
        <div class="opp-hand" id="oh-south"></div>
        <div class="nameplate" id="np-south">
          <span class="tdot" id="td-south"></span>
          <span id="pn-south">You</span>
        </div>
      </div>

      <!-- Trick area -->
      <div class="trick-area" id="trick-area">
        <div class="tslot north" id="ts-north"></div>
        <div class="tslot west"  id="ts-west"></div>
        <div class="tslot ctr"   id="ts-ctr"></div>
        <div class="tslot east"  id="ts-east"></div>
        <div class="tslot south" id="ts-south"></div>
      </div>

      <!-- Flipped card (trump calling) -->
      <div class="flip-area" id="flip-area" style="display:none">
        <div class="flip-label" id="flip-label">Flip Card</div>
        <div id="flip-card"></div>
      </div>

    </div>
  </div>

  <!-- Your hand -->
  <div class="hand-bar" id="hand-bar">
    <div class="hand-label" id="hand-label" style="display:none">YOUR TURN — Play a card</div>
    <div class="hand-cards" id="hand-cards"></div>
    <div style="text-align:center;margin-top:6px;font-size:.75rem;color:var(--gold);display:none" id="discard-hint">
      Choose a card to discard
    </div>
    <div style="text-align:center;margin-top:6px;font-size:.75rem;color:var(--text-dim);display:none" id="turn-status"></div>
  </div>

  <!-- Action overlay -->
  <div class="action-overlay" id="act-overlay" style="display:none">
    <div class="action-panel">
      <div class="action-heading" id="act-heading">Your Turn</div>
      <div id="act-body"></div>
    </div>
  </div>

</div>

<!-- Toast -->
<div id="toast" style="display:none"></div>

<!-- Modal -->
<div class="modal-bg" id="modal" style="display:none">
  <div class="modal-box" id="modal-body"></div>
</div>

<script>
// ============================================================
//  STATE
// ============================================================
var S = {
  token:     localStorage.getItem('eu_tok')  || '',
  playerId:  localStorage.getItem('eu_pid')  || '',
  dname:     localStorage.getItem('eu_name') || '',
  gameId:    localStorage.getItem('eu_gid')  || '',
  invCode:   localStorage.getItem('eu_inv')  || '',
  seat:      parseInt(localStorage.getItem('eu_seat') || '-1', 10),
  ws:        null,
  gs:        null,
  actions:   [],
  vcards:    [],
  myTurn:    false,
  rtimer:    null,
  rattempt:  0,
  ptimer:    null,
};

var SYMS  = { hearts: '\\u2665', diamonds: '\\u2666', clubs: '\\u2663', spades: '\\u2660' };
var REDS  = { hearts: true, diamonds: true };

// ============================================================
//  PERSIST
// ============================================================
function saveAuth() {
  localStorage.setItem('eu_tok',  S.token);
  localStorage.setItem('eu_pid',  S.playerId);
  localStorage.setItem('eu_name', S.dname);
}
function saveGame() {
  localStorage.setItem('eu_gid',  S.gameId);
  localStorage.setItem('eu_inv',  S.invCode);
  localStorage.setItem('eu_seat', String(S.seat));
}
function clearGame() {
  S.gameId = ''; S.invCode = ''; S.seat = -1;
  S.gs = null; S.actions = []; S.vcards = []; S.myTurn = false;
  _sendQueue = []; // discard any pending messages from the old game
  saveGame();
}

// ============================================================
//  API
// ============================================================
function api(path, opts) {
  opts = opts || {};
  var hdrs = { 'Content-Type': 'application/json' };
  if (S.token) hdrs['Authorization'] = 'Bearer ' + S.token;
  if (opts.headers) Object.assign(hdrs, opts.headers);
  opts.headers = hdrs;
  return fetch(path, opts);
}

// ============================================================
//  SCREEN
// ============================================================
function show(id) {
  var all = document.querySelectorAll('.screen');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  document.getElementById(id).classList.add('active');
}

// ============================================================
//  TOAST
// ============================================================
var _toastTimer = null;
function toast(msg, ms) {
  ms = ms || 2800;
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  el.className = 'toast-in';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    el.className = 'toast-out';
    setTimeout(function() { el.style.display = 'none'; }, 300);
  }, ms);
}

// ============================================================
//  MODAL
// ============================================================
function showModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ============================================================
//  CARD HTML
// ============================================================
function cardHTML(card, sz, extraCls) {
  sz = sz || 'sz-md';
  extraCls = extraCls || '';
  if (!card) return '';
  var sym = SYMS[card.suit];
  var col = REDS[card.suit] ? 'red' : 'black';
  return '<div class="card ' + sz + ' ' + col + ' ' + extraCls + '">'
    + '<div class="ccorner tl">' + card.rank + '<br>' + sym + '</div>'
    + '<div class="ccenter">' + sym + '</div>'
    + '<div class="ccorner br">' + card.rank + '<br>' + sym + '</div>'
    + '</div>';
}

function facedownHTML(sz, extraCls) {
  sz = sz || 'sz-xs';
  extraCls = extraCls || '';
  return '<div class="card back ' + sz + ' ' + extraCls + '"><div class="card-back-inner"></div></div>';
}

// ============================================================
//  SEAT → DIRECTION  (you always appear at south)
// ============================================================
var DIR_ORDER = ['south', 'west', 'north', 'east'];
function seatDir(seat) {
  if (S.seat < 0) return DIR_ORDER[seat % 4];
  return DIR_ORDER[((seat - S.seat) + 4) % 4];
}
function sameTeam(seat) {
  return (seat % 2) === (S.seat % 2);
}

// ============================================================
//  LOBBY RENDER
// ============================================================
function renderLobby() {
  show('lobby-screen');
  document.getElementById('lobby-who').textContent = 'Playing as: ' + S.dname;

  var hasGame = !!S.gameId;
  document.getElementById('panel-new').style.display     = hasGame ? 'none'  : 'block';
  document.getElementById('panel-waiting').style.display = hasGame ? 'block' : 'none';
  if (!hasGame) return;

  var cd = document.getElementById('codeDisplay');
  cd.textContent = S.invCode || '------';

  var gs = S.gs;
  var grid = document.getElementById('slotsGrid');
  grid.innerHTML = '';

  for (var i = 0; i < 4; i++) {
    var pl = null;
    if (gs && gs.players) {
      for (var j = 0; j < gs.players.length; j++) {
        if (gs.players[j].seat === i) { pl = gs.players[j]; break; }
      }
    }
    var isMe      = (i === S.seat);
    var isPartner = (S.seat >= 0) && ((i % 2) === (S.seat % 2)) && !isMe;
    var cls = isMe ? 'me' : isPartner ? 'partner' : pl ? 'opp' : 'empty';
    var lbl = isMe ? 'You' : isPartner ? 'Partner' : pl ? 'Opponent' : 'Open';
    var avt = isMe ? 'YOU' : isPartner ? 'PTR' : pl ? 'OPP' : '+';

    var inner = '';
    if (pl) {
      inner = '<div class="slot-avatar ' + cls + '">' + avt + '</div>'
        + '<div><div class="slot-name">' + pl.displayName + (pl.isBot ? ' \uD83E\uDD16' : '') + '</div>'
        + '<div class="slot-sub">Seat ' + i + ' \u00B7 ' + lbl + '</div></div>';
    } else {
      inner = '<div class="slot-avatar empty">+</div>'
        + '<div><div class="slot-name" style="color:var(--text-dim)">Empty Seat</div>'
        + '<div class="slot-sub">Seat ' + i + '</div></div>';
    }

    var div = document.createElement('div');
    div.className = 'slot ' + cls;
    div.innerHTML = inner;
    grid.appendChild(div);
  }
}

// ============================================================
//  GAME RENDER
// ============================================================
function renderGame() {
  var gs = S.gs;
  if (!gs) return;
  show('game-screen');

  // Scores
  var myTeam   = (S.seat % 2);          // 0 or 1  (index into scores[])
  var oppTeam  = 1 - myTeam;
  document.getElementById('s-us').textContent   = gs.scores[myTeam];
  document.getElementById('s-them').textContent = gs.scores[oppTeam];
  document.getElementById('s-target').textContent = '/' + gs.pointsToWin;

  // Phase chip
  var phaseMap = {
    waiting: 'Lobby', dealing: 'Dealing',
    trump_round1: 'Trump?', trump_round2: 'Call Trump',
    discard: 'Discard', playing: 'Playing',
    hand_over: 'Hand Over', game_over: 'Game Over'
  };
  document.getElementById('phase-chip').textContent = phaseMap[gs.phase] || gs.phase;

  // Trump
  var ts = gs.hand && gs.hand.trumpSuit;
  var tpill = document.getElementById('trump-pill');
  var tsym  = document.getElementById('trump-sym');
  var tbg   = document.getElementById('trump-bg');
  if (ts) {
    tpill.style.display = 'flex';
    var tsymbol = SYMS[ts];
    var tcol    = REDS[ts] ? 'var(--card-red)' : '#fff';
    tsym.textContent = tsymbol;
    tsym.style.color = tcol;
    tbg.textContent  = tsymbol;
    tbg.style.color  = tcol;
  } else {
    tpill.style.display = 'none';
    tbg.textContent = '';
  }

  // Tricks pips
  var trow = document.getElementById('tricks-row');
  var tpips = document.getElementById('trick-pips');
  if ((gs.phase === 'playing' || gs.phase === 'hand_over') && gs.hand) {
    trow.style.display = 'flex';
    var tw1 = gs.hand.tricksWon[myTeam];
    var tw2 = gs.hand.tricksWon[oppTeam];
    tpips.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var pip = document.createElement('div');
      pip.className = 'trick-pip';
      if (i < tw1) pip.classList.add('t1');
      else if (i < tw1 + tw2) pip.classList.add('t2');
      tpips.appendChild(pip);
    }
  } else {
    trow.style.display = 'none';
  }

  // Player nameplates
  var dirMap = {
    south: S.seat,
    north: (S.seat + 2) % 4,
    west:  (S.seat + 3) % 4,
    east:  (S.seat + 1) % 4
  };
  var dirs = ['south', 'north', 'west', 'east'];
  for (var d = 0; d < dirs.length; d++) {
    var dir  = dirs[d];
    var seat = dirMap[dir];
    var player = null;
    for (var p = 0; p < gs.players.length; p++) {
      if (gs.players[p].seat === seat) { player = gs.players[p]; break; }
    }

    var np  = document.getElementById('np-' + dir);
    var pn  = document.getElementById('pn-' + dir);
    var td  = document.getElementById('td-' + dir);
    var oh  = document.getElementById('oh-' + dir);

    if (player) {
      var label = player.displayName + (player.isBot ? ' \uD83E\uDD16' : '');
      if (dir === 'south') label = 'You';
      pn.textContent = label;

      // Team dot color
      td.style.background = sameTeam(seat) ? 'var(--team1)' : 'var(--team2)';

      // Dealer chip
      var oldD = np.querySelector('.dealer-d');
      if (oldD) oldD.remove();
      if (gs.hand && gs.hand.dealerSeat === seat) {
        var chip = document.createElement('span');
        chip.className = 'dealer-d';
        chip.textContent = 'D';
        np.appendChild(chip);
      }

      // Active turn glow
      var isActive = gs.hand && gs.hand.currentTurnSeat === seat;
      np.classList.toggle('myturn', isActive);
    } else {
      pn.textContent = '—';
      td.style.background = '#475569';
      np.classList.remove('myturn');
    }

    // Facedown cards for opponents (not south = you)
    if (dir !== 'south' && oh) {
      oh.innerHTML = '';
      if (player && gs.phase !== 'waiting' && gs.hand) {
        var numCards = Math.max(0, 5 - (gs.hand.completedTricks ? gs.hand.completedTricks.length : 0));
        for (var c = 0; c < numCards; c++) {
          oh.innerHTML += facedownHTML('sz-xs');
        }
      }
    }
  }

  // Trick area
  renderTricks(gs);

  // Flipped card
  var flipArea  = document.getElementById('flip-area');
  var flipCard  = document.getElementById('flip-card');
  var flipLabel = document.getElementById('flip-label');
  if ((gs.phase === 'trump_round1' || gs.phase === 'trump_round2') && gs.hand && gs.hand.flippedCard) {
    flipArea.style.display = 'flex';
    if (gs.phase === 'trump_round2') {
      flipCard.innerHTML = facedownHTML('sz-md');
      flipLabel.textContent = 'Turned Down';
    } else {
      flipCard.innerHTML = cardHTML(gs.hand.flippedCard, 'sz-md');
      flipLabel.textContent = 'Flip Card';
    }
  } else {
    flipArea.style.display = 'none';
  }

  // Your hand
  renderHand(gs);

  // Action panel
  renderActions(gs);
}

function renderTricks(gs) {
  var slots = ['north','south','east','west','ctr'];
  for (var i = 0; i < slots.length; i++) {
    var el = document.getElementById('ts-' + slots[i]);
    if (el) el.innerHTML = '';
  }
  if (!gs.hand || !gs.hand.currentTrick) return;
  var trick = gs.hand.currentTrick;
  for (var c = 0; c < trick.cards.length; c++) {
    var play = trick.cards[c];
    var dir  = seatDir(play.seat);
    var slot = document.getElementById('ts-' + dir);
    if (slot) slot.innerHTML = cardHTML(play.card, 'sz-sm', 'trick-appear');
  }
}

function renderHand(gs) {
  var handEl    = document.getElementById('hand-cards');
  var labelEl   = document.getElementById('hand-label');
  var discHint  = document.getElementById('discard-hint');
  var statusEl  = document.getElementById('turn-status');
  handEl.innerHTML = '';

  var cards   = (gs.hand && gs.hand.yourCards) ? gs.hand.yourCards : [];
  var phase   = gs.phase;
  // Use currentTurnSeat as the authoritative signal — S.myTurn can be stale
  var myActualTurn = gs.hand && gs.hand.currentTurnSeat === S.seat;
  var isDiscard = phase === 'discard' && myActualTurn && S.actions.indexOf('discard') !== -1;
  var isPlay    = phase === 'playing' && myActualTurn && S.actions.indexOf('play_card') !== -1;

  labelEl.style.display  = isPlay ? 'block' : 'none';
  discHint.style.display = isDiscard ? 'block' : 'none';

  // Show who we're waiting on (or hide if it's our turn / no hand in progress)
  if (statusEl) {
    if (gs.hand && gs.hand.currentTurnSeat !== null && !myActualTurn
        && phase !== 'waiting' && phase !== 'hand_over' && phase !== 'game_over') {
      var waitSeat = gs.hand.currentTurnSeat;
      var waitName = '';
      for (var w = 0; w < gs.players.length; w++) {
        if (gs.players[w].seat === waitSeat) { waitName = gs.players[w].displayName; break; }
      }
      statusEl.textContent = waitName ? '\u23F3 Waiting for ' + waitName + '\u2026' : '';
      statusEl.style.display = waitName ? 'block' : 'none';
    } else {
      statusEl.style.display = 'none';
    }
  }

  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      var playable = false;
      for (var v = 0; v < S.vcards.length; v++) {
        if (S.vcards[v].suit === card.suit && S.vcards[v].rank === card.rank) {
          playable = true; break;
        }
      }
      var canClick = (isPlay || isDiscard) && playable;
      var dimmed   = (isPlay || isDiscard) && !playable;

      var sym  = SYMS[card.suit];
      var col  = REDS[card.suit] ? 'red' : 'black';
      var cls  = 'card sz-lg ' + col + (canClick ? ' playable' : '') + (dimmed ? ' dimmed' : '');

      var wrap = document.createElement('div');
      wrap.style.position = 'relative';
      wrap.innerHTML = '<div class="' + cls + '">'
        + '<div class="ccorner tl">' + card.rank + '<br>' + sym + '</div>'
        + '<div class="ccenter">' + sym + '</div>'
        + '<div class="ccorner br">' + card.rank + '<br>' + sym + '</div>'
        + '</div>';

      if (canClick) {
        wrap.querySelector('.card').addEventListener('click', function() {
          var type = isDiscard ? 'discard' : 'play_card';
          sendAction({ type: type, card: card });
          S.vcards = []; S.myTurn = false;
          renderGame();
        });
      }
      handEl.appendChild(wrap);
    })(cards[i]);
  }
}

function renderActions(gs) {
  var overlay  = document.getElementById('act-overlay');
  var heading  = document.getElementById('act-heading');
  var body     = document.getElementById('act-body');
  var phase    = gs.phase;

  // Use the actions list to determine what kind of decision is needed.
  // (gs.trumpCall is not part of ClientGameState so we can't use it.)
  var acts     = S.actions;
  var hasOrderUp   = acts.indexOf('order_up')          !== -1;
  var hasCallTrump = acts.indexOf('call_trump')         !== -1;
  var hasDiscard   = acts.indexOf('discard')            !== -1;
  var hasPlayCard  = acts.indexOf('play_card')          !== -1;
  var hasGoAlone   = acts.indexOf('go_alone')           !== -1;
  var hasPartner   = acts.indexOf('play_with_partner')  !== -1;
  var hasPass      = acts.indexOf('pass')               !== -1;

  // Nothing for this player to decide right now
  if (acts.length === 0 || phase === 'waiting' || phase === 'dealing') {
    overlay.style.display = 'none';
    return;
  }

  // Discard / play-card: handled by clicking cards in hand
  if (hasDiscard || hasPlayCard) {
    overlay.style.display = 'none';
    return;
  }

  // ── Trump Round 1 ──────────────────────────────────────────
  // validActions: ['pass', 'order_up', (optional) 'go_alone']
  // go_alone here = order up AND declare alone (no suit needed)
  if (hasOrderUp || (hasPass && phase === 'trump_round1')) {
    var fc    = gs.hand && gs.hand.flippedCard;
    var fcTxt = fc ? (fc.rank + ' of ' + fc.suit) : 'the card';
    heading.textContent = 'Order up the ' + fcTxt + '?';
    var html = '<div class="action-btns">';
    if (hasOrderUp)
      html += '<button class="btn btn-gold" data-a="order_up">Order Up \u2191</button>';
    if (hasGoAlone)
      html += '<button class="btn btn-gold" data-a="go_alone" style="background:linear-gradient(135deg,#7c3aed,#5b21b6)">'
        + 'Go Alone! \uD83C\uDFAF</button>';
    if (hasPass)
      html += '<button class="btn btn-ghost" data-a="pass">Pass</button>';
    html += '</div>';
    body.innerHTML = html;
    overlay.style.display = 'flex';
    return;
  }

  // ── Trump Round 2 ──────────────────────────────────────────
  // validActions: ['call_trump', (optional) 'go_alone', (optional) 'pass']
  // go_alone here = call THAT suit AND play alone — needs a suit, so we
  // show a second row of suit buttons labelled "Alone".
  if (hasCallTrump) {
    var disabled = gs.hand && gs.hand.flippedCard ? gs.hand.flippedCard.suit : null;
    var suitDefs = [
      { suit: 'hearts',   sym: '\u2665', col: 'red'   },
      { suit: 'diamonds', sym: '\u2666', col: 'red'   },
      { suit: 'clubs',    sym: '\u2663', col: 'black' },
      { suit: 'spades',   sym: '\u2660', col: 'black' }
    ];

    if (hasGoAlone) {
      heading.textContent = 'Name trump — or go alone';
      var html = '<div style="font-size:.7rem;color:var(--text-dim);margin-bottom:6px;text-align:center">With partner:</div>'
        + '<div class="suit-grid">';
      for (var s = 0; s < suitDefs.length; s++) {
        var sd  = suitDefs[s];
        var dis = sd.suit === disabled ? ' disabled' : '';
        html += '<button class="suit-opt ' + sd.col + '"' + dis
          + ' data-suit="' + sd.suit + '">'
          + sd.sym + ' ' + sd.suit.charAt(0).toUpperCase() + sd.suit.slice(1)
          + '</button>';
      }
      html += '</div>';
      html += '<div style="font-size:.7rem;color:var(--gold);margin:10px 0 6px;text-align:center">\uD83C\uDFAF Go Alone:</div>'
        + '<div class="suit-grid">';
      for (var s = 0; s < suitDefs.length; s++) {
        var sd  = suitDefs[s];
        var dis = sd.suit === disabled ? ' disabled' : '';
        html += '<button class="suit-opt ' + sd.col + '"' + dis
          + ' style="border-color:#7c3aed;opacity:.85"'
          + ' data-alone-suit="' + sd.suit + '">'
          + sd.sym + ' Alone</button>';
      }
      html += '</div>';
    } else {
      heading.textContent = 'Name a trump suit';
      var html = '<div class="suit-grid">';
      for (var s = 0; s < suitDefs.length; s++) {
        var sd  = suitDefs[s];
        var dis = sd.suit === disabled ? ' disabled' : '';
        html += '<button class="suit-opt ' + sd.col + '"' + dis
          + ' data-suit="' + sd.suit + '">'
          + sd.sym + ' ' + sd.suit.charAt(0).toUpperCase() + sd.suit.slice(1)
          + '</button>';
      }
      html += '</div>';
    }

    if (hasPass)
      html += '<div class="action-btns" style="margin-top:10px">'
        + '<button class="btn btn-ghost" data-a="pass">Pass</button></div>';
    body.innerHTML = html;
    overlay.style.display = 'flex';
    return;
  }

  // ── Standalone go_alone / play_with_partner ────────────────
  // Only reached if validActions has ONLY those (not mixed with trump actions).
  if (hasGoAlone || hasPartner) {
    heading.textContent = 'Go Alone?';
    var html = '<div class="action-btns">';
    if (hasGoAlone)
      html += '<button class="btn btn-gold" data-a="go_alone"'
        + ' style="background:linear-gradient(135deg,#7c3aed,#5b21b6)">Go Alone! \uD83C\uDFAF</button>';
    if (hasPartner)
      html += '<button class="btn btn-ghost" data-a="play_with_partner">Play with Partner</button>';
    html += '</div>';
    body.innerHTML = html;
    overlay.style.display = 'flex';
    return;
  }

  overlay.style.display = 'none';
}

// ============================================================
//  ACTIONS
// ============================================================
function doAct(type) {
  sendAction({ type: type });
  S.actions = []; S.myTurn = false;
  if (S.gs) renderGame();
}
function doCallTrump(suit) {
  sendAction({ type: 'call_trump', suit: suit });
  S.actions = []; S.myTurn = false;
  if (S.gs) renderGame();
}
function doGoAlone(suit) {
  // suit is only needed in round 2; in round 1 go_alone has no suit
  var action = suit ? { type: 'go_alone', suit: suit } : { type: 'go_alone' };
  sendAction(action);
  S.actions = []; S.myTurn = false;
  if (S.gs) renderGame();
}
// Delegated listener for all action-panel buttons (avoids inline onclick quoting issues)
document.getElementById('act-body').addEventListener('click', function(e) {
  var btn = e.target;
  while (btn && btn !== this) {
    var a         = btn.getAttribute && btn.getAttribute('data-a');
    var suit      = btn.getAttribute && btn.getAttribute('data-suit');
    var aloneSuit = btn.getAttribute && btn.getAttribute('data-alone-suit');
    if (a)         { doAct(a);            return; }
    if (suit)      { doCallTrump(suit);   return; }
    if (aloneSuit) { doGoAlone(aloneSuit); return; }
    btn = btn.parentNode;
  }
});

// ============================================================
//  WEBSOCKET
// ============================================================
function setConn(state) {
  var dot = document.getElementById('cdot');
  var txt = document.getElementById('ctxt');
  if (!dot) return;
  var map = { live: ['live','Live'], busy: ['busy','Connecting…'], off: ['off','Offline'] };
  dot.className = 'conn-dot ' + map[state][0];
  txt.textContent = map[state][1];
}

var _sendQueue = [];
function send(msg) {
  if (S.ws && S.ws.readyState === WebSocket.OPEN) {
    S.ws.send(JSON.stringify(msg));
  } else {
    _sendQueue.push(msg); // hold until socket opens
  }
}
function flushQueue() {
  while (_sendQueue.length && S.ws && S.ws.readyState === WebSocket.OPEN) {
    S.ws.send(JSON.stringify(_sendQueue.shift()));
  }
}
function sendAction(action) { send({ type: 'action', action: action }); }

function clearTimers() {
  clearTimeout(S.rtimer); S.rtimer = null;
  clearInterval(S.ptimer); S.ptimer = null;
}
function scheduleReconnect() {
  if (!S.gameId || !S.token || S.rtimer) return;
  var delay = Math.min(10000, 1000 * Math.pow(2, S.rattempt));
  S.rattempt++;
  S.rtimer = setTimeout(function() { S.rtimer = null; connectWs(); }, delay);
}

function connectWs() {
  if (!S.gameId || !S.token) return;
  if (S.ws && (S.ws.readyState === WebSocket.OPEN || S.ws.readyState === WebSocket.CONNECTING)) return;
  setConn('busy');
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  var url   = proto + '//' + location.host + '/api/games/' + S.gameId + '/ws?authToken=' + encodeURIComponent(S.token);
  var ws    = new WebSocket(url);
  S.ws = ws;

  ws.onopen = function() {
    S.rattempt = 0; clearTimers();
    S.ptimer = setInterval(function() { send({ type: 'ping', ts: Date.now() }); }, 25000);
    setConn('live');
    flushQueue();
    toast('\u2705 Connected!');
  };
  ws.onclose = function() { clearTimers(); setConn('off'); scheduleReconnect(); };
  ws.onerror = function() { setConn('off'); };
  ws.onmessage = function(ev) {
    var msg; try { msg = JSON.parse(ev.data); } catch(e) { return; }
    handleMsg(msg);
  };
}

// ============================================================
//  MESSAGE HANDLER
// ============================================================
function handleMsg(msg) {
  switch (msg.type) {

    case 'game_state':
      S.gs = msg.state;
      // Detect my seat from players list
      if (S.seat < 0 && msg.state.players) {
        for (var i = 0; i < msg.state.players.length; i++) {
          if (msg.state.players[i].playerId === S.playerId) {
            S.seat = msg.state.players[i].seat; saveGame(); break;
          }
        }
      }
      // Clear stale turn state whenever the server says it's not our turn.
      // This prevents old actions/panels from lingering after another player acts.
      var gsTurnSeat = msg.state.hand ? msg.state.hand.currentTurnSeat : null;
      if (gsTurnSeat !== S.seat) {
        S.myTurn = false; S.actions = []; S.vcards = [];
      }
      route();
      break;

    case 'your_turn':
      S.actions = msg.validActions || [];
      S.vcards  = msg.validCards   || [];
      S.myTurn  = true;
      // Notify contextually
      if (S.actions.indexOf('play_card') !== -1)       toast('\u2B50 Your turn \u2014 play a card!');
      else if (S.actions.indexOf('order_up') !== -1)   toast('\uD83C\uDCCF Order up or pass?');
      else if (S.actions.indexOf('call_trump') !== -1) toast('\u2660 Call a trump suit');
      else if (S.actions.indexOf('discard') !== -1)    toast('\u267B\uFE0F Pick a card to discard');
      if (S.gs) renderGame();
      break;

    case 'player_joined':
      toast(msg.displayName + ' joined the table!');
      break;

    case 'hand_dealt':
      S.myTurn = false; S.actions = []; S.vcards = [];
      toast('\uD83C\uDCCF Cards dealt \u2014 here we go!');
      break;

    case 'trump_called':
      var sym2 = SYMS[msg.suit] || msg.suit;
      var who  = playerName(msg.seat);
      toast(who + ' called ' + sym2 + (msg.alone ? ' \u2014 going alone!' : ''));
      break;

    case 'trick_won':
      var winner = playerName(msg.seat);
      var isMe   = msg.seat === S.seat;
      var isPtnr = sameTeam(msg.seat) && !isMe;
      var icon   = isMe ? '\uD83C\uDF89' : isPtnr ? '\u2705' : '\u274C';
      toast(icon + ' ' + winner + ' took the trick');
      break;

    case 'hand_result':
      showHandResult(msg.result);
      break;

    case 'score_update':
      if (S.gs) S.gs.scores = msg.scores;
      break;

    case 'game_over':
      showGameOver(msg.winningTeam, msg.scores);
      break;

    case 'error':
      toast('\u26A0\uFE0F ' + msg.message, 5000);
      break;

    case 'pong': break;
  }
}

function playerName(seat) {
  if (!S.gs || !S.gs.players) return 'Seat ' + seat;
  for (var i = 0; i < S.gs.players.length; i++) {
    if (S.gs.players[i].seat === seat) return S.gs.players[i].displayName;
  }
  return 'Seat ' + seat;
}

// ============================================================
//  ROUTING
// ============================================================
function route() {
  var gs = S.gs;
  if (!gs) { renderLobby(); return; }
  if (gs.phase === 'waiting') { renderLobby(); return; }
  renderGame();
}

// ============================================================
//  HAND RESULT FLASH
// ============================================================
function showHandResult(result) {
  if (!result) return;
  var myTeam  = (S.seat % 2) + 1;
  var weWon   = result.pointsToTeam === myTeam;
  var pts     = result.pointsAwarded;
  var callerIsUs = ((result.calledBySeat % 2) + 1) === myTeam;

  var msg = '';
  if (weWon) {
    if (result.wentAlone && pts === 4)   msg = '\uD83C\uDFAF Loner! +4 points!';
    else if (pts === 2 && callerIsUs)    msg = '\uD83D\uDE80 March! +2 points!';
    else if (pts === 2 && !callerIsUs)   msg = '\uD83D\uDE08 Euchred them! +2!';
    else                                 msg = '\u2705 We take the hand \u2014 +1 point';
  } else {
    if (pts === 2 && callerIsUs)         msg = '\uD83D\uDE2C Euchred! They get +2';
    else                                 msg = '\u274C They win the hand';
  }

  var flash = document.createElement('div');
  flash.className = 'hand-flash';
  flash.innerHTML = '<h3>' + (weWon ? '\uD83C\uDCCF We scored!' : '\uD83C\uDCCF Hand over') + '</h3>'
    + '<p>' + msg + '</p>'
    + '<p style="margin-top:8px;font-size:.75rem;color:var(--text-dim)">Next hand starting\u2026</p>';
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 4000);
}

// ============================================================
//  GAME OVER MODAL
// ============================================================
function showGameOver(winningTeam, scores) {
  var myTeam  = (S.seat % 2) + 1;
  var weWon   = winningTeam === myTeam;
  var ourScore  = scores[myTeam - 1];
  var theirScore = scores[myTeam === 1 ? 1 : 0];

  showModal(
    '<h2>' + (weWon ? '\uD83C\uDFC6 You Win!' : '\uD83D\uDE14 Game Over') + '</h2>'
    + '<p>' + (weWon ? 'Congratulations! Your team won the game.' : 'Better luck next time!') + '</p>'
    + '<div class="modal-scores">'
    +   '<div class="ms-block"><div class="ms-num" style="color:var(--team1)">' + ourScore + '</div>'
    +   '<div class="ms-label">Your Team</div></div>'
    +   '<div class="ms-block"><div class="ms-num" style="color:var(--team2)">' + theirScore + '</div>'
    +   '<div class="ms-label">Opponents</div></div>'
    + '</div>'
    + '<button class="btn btn-primary btn-full" onclick="newGame()">Play Again</button>'
  );
}

function newGame() {
  closeModal();
  clearGame();
  renderLobby();
}
window.newGame = newGame;

// ============================================================
//  AUTH
// ============================================================
async function doEnter() {
  var nameEl = document.getElementById('nameInput');
  var name   = nameEl.value.trim() || 'Player';
  var btn    = document.getElementById('enterBtn');
  btn.disabled = true; btn.textContent = 'Joining\u2026';

  try {
    // Reuse existing token if available
    if (S.token) {
      S.dname = name; saveAuth(); renderLobby();
      if (S.gameId) { await fetchGs(); connectWs(); }
      return;
    }

    var res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name })
    });
    var data = await res.json();

    if (!res.ok) { toast('Registration failed \u2014 ' + (data.error || 'try again')); return; }

    S.token    = data.authToken;
    S.playerId = data.playerId;
    S.dname    = data.displayName;
    saveAuth();
    renderLobby();
  } catch(e) {
    toast('\u26A0\uFE0F Could not connect \u2014 check your connection');
  } finally {
    btn.disabled = false; btn.textContent = 'Enter the Table \u2192';
  }
}

document.getElementById('enterBtn').addEventListener('click', doEnter);
document.getElementById('nameInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doEnter();
});

// ============================================================
//  LOBBY ACTIONS
// ============================================================
document.getElementById('createBtn').addEventListener('click', async function() {
  if (!S.token) { toast('Enter your name first!'); return; }
  try {
    var res  = await api('/api/games', { method: 'POST', body: JSON.stringify({}) });
    var data = await res.json();
    if (!res.ok) { toast('Could not create game: ' + (data.error || 'try again')); return; }
    S.gameId = data.gameId; S.invCode = data.inviteCode; S.seat = data.seat;
    saveGame(); renderLobby(); connectWs(); await fetchGs();
  } catch(e) { toast('\u26A0\uFE0F Connection error \u2014 try again'); }
});

async function doJoin() {
  if (!S.token) { toast('Enter your name first!'); return; }
  var code = document.getElementById('codeInput').value.trim().toUpperCase();
  if (!code) { toast('Enter an invite code!'); return; }
  try {
    var res  = await api('/api/games/join', { method: 'POST', body: JSON.stringify({ inviteCode: code }) });
    var data = await res.json();
    if (!res.ok) { toast('Could not join: ' + (data.error || 'Invalid code')); return; }
    S.gameId = data.gameId; S.invCode = data.inviteCode; S.seat = data.seat;
    saveGame(); renderLobby(); connectWs(); await fetchGs();
  } catch(e) { toast('\u26A0\uFE0F Connection error \u2014 try again'); }
}

document.getElementById('joinBtn').addEventListener('click', doJoin);
document.getElementById('codeInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doJoin();
});

document.getElementById('botsBtn').addEventListener('click', function() {
  if (!S.gameId) return;
  var players = (S.gs && S.gs.players) ? S.gs.players : [];
  for (var i = 0; i < 4; i++) {
    // Never add a bot to the user's own seat, even when S.gs hasn't loaded yet
    var found = (S.seat >= 0 && i === S.seat);
    if (!found) {
      for (var j = 0; j < players.length; j++) { if (players[j].seat === i) { found = true; break; } }
    }
    if (!found) send({ type: 'add_bot', seat: i, difficulty: 'medium' });
  }
});

document.getElementById('startBtn').addEventListener('click', function() {
  send({ type: 'start_game' });
});

document.getElementById('leaveBtn').addEventListener('click', function() {
  clearGame(); renderLobby();
});

// Copy code on click
document.getElementById('codeDisplay').addEventListener('click', function() {
  var code = this.textContent.trim();
  if (navigator.clipboard && code && code !== '------') {
    navigator.clipboard.writeText(code).then(function() { toast('\uD83D\uDCCB Invite code copied!'); });
  }
});

// ============================================================
//  FETCH GAME STATE (REST fallback)
// ============================================================
async function fetchGs() {
  if (!S.gameId || !S.token) return;
  var res = await api('/api/games/' + S.gameId);
  if (!res.ok) return;
  S.gs = await res.json();
  if (S.seat < 0 && S.gs.players) {
    for (var i = 0; i < S.gs.players.length; i++) {
      if (S.gs.players[i].playerId === S.playerId) {
        S.seat = S.gs.players[i].seat; saveGame(); break;
      }
    }
  }
  route();
}

// ============================================================
//  INIT
// ============================================================
(function init() {
  if (S.dname) document.getElementById('nameInput').value = S.dname;
  if (S.token) {
    renderLobby();
    if (S.gameId) fetchGs().then(function() { connectWs(); });
  } else {
    show('auth-screen');
  }
})();
</script>
</body>
</html>`;
}
