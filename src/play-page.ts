export function renderPlayPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Euchre Play Client</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    main { max-width: 1000px; margin: 0 auto; padding: 20px; display: grid; gap: 16px; }
    section { background: #1e293b; border-radius: 12px; padding: 14px; }
    h1, h2 { margin: 0 0 10px; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    input, select, button, textarea { border: 1px solid #334155; background: #0b1220; color: #e2e8f0; border-radius: 8px; padding: 8px 10px; }
    button { cursor: pointer; background: #1d4ed8; border-color: #1d4ed8; }
    button.secondary { background: #334155; border-color: #334155; }
    button:disabled { opacity: 0.4; cursor: default; }
    pre { background: #020617; border-radius: 8px; padding: 10px; overflow: auto; margin: 0; white-space: pre-wrap; }
    #log { max-height: 220px; }
    #actions, #cards { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill { display: inline-block; border: 1px solid #475569; border-radius: 20px; padding: 2px 10px; margin: 2px; }
  </style>
</head>
<body>
  <main>
    <h1>Euchre /play client</h1>

    <section>
      <h2>1) Player</h2>
      <div class="row">
        <input id="displayName" placeholder="Display name" maxlength="30" value="Player" />
        <button id="registerBtn">Register / Login</button>
      </div>
      <div id="authInfo"></div>
    </section>

    <section>
      <h2>2) Lobby</h2>
      <div class="row">
        <button id="createBtn">Create Game</button>
        <input id="inviteCode" placeholder="Invite code" maxlength="6" style="text-transform:uppercase" />
        <button id="joinBtn" class="secondary">Join by code</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button id="addBotsBtn" class="secondary">Fill empty seats with bots</button>
        <button id="startBtn">Start Game</button>
      </div>
      <div id="gameInfo"></div>
    </section>

    <section>
      <h2>3) Play</h2>
      <div>Valid actions:</div>
      <div id="actions"></div>
      <div style="margin-top:8px">Your cards:</div>
      <div id="cards"></div>
    </section>

    <section>
      <h2>State</h2>
      <pre id="state"></pre>
    </section>

    <section>
      <h2>Log</h2>
      <pre id="log"></pre>
    </section>
  </main>

  <script>
    const authInfoEl = document.getElementById('authInfo');
    const gameInfoEl = document.getElementById('gameInfo');
    const stateEl = document.getElementById('state');
    const logEl = document.getElementById('log');
    const actionsEl = document.getElementById('actions');
    const cardsEl = document.getElementById('cards');

    const state = {
      token: localStorage.getItem('euchre_auth_token') || '',
      playerId: localStorage.getItem('euchre_player_id') || '',
      displayName: localStorage.getItem('euchre_display_name') || '',
      gameId: localStorage.getItem('euchre_game_id') || '',
      inviteCode: localStorage.getItem('euchre_invite_code') || '',
      seat: Number(localStorage.getItem('euchre_seat') || '-1'),
      ws: null,
      gameState: null,
      validActions: [],
      validCards: [],
      reconnectTimer: null,
      reconnectAttempt: 0,
      pingTimer: null,
    };

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

    function log(message, obj) {
      const now = new Date().toLocaleTimeString();
      const line = '[' + now + '] ' + message + (obj ? ' ' + JSON.stringify(obj) : '');
      logEl.textContent = line + '\\n' + logEl.textContent;
    }

    function saveAuth() {
      localStorage.setItem('euchre_auth_token', state.token);
      localStorage.setItem('euchre_player_id', state.playerId);
      localStorage.setItem('euchre_display_name', state.displayName);
    }

    function saveGame() {
      localStorage.setItem('euchre_game_id', state.gameId);
      localStorage.setItem('euchre_invite_code', state.inviteCode);
      localStorage.setItem('euchre_seat', String(state.seat));
    }

    function api(path, init = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
      if (state.token) headers.Authorization = 'Bearer ' + state.token;
      return fetch(path, Object.assign({}, init, { headers }));
    }

    function cardLabel(card) {
      if (!card) return '';
      return card.rank + ' of ' + card.suit;
    }

    function render() {
      authInfoEl.innerHTML = state.token
        ? '<span class="pill">Logged in as ' + state.displayName + '</span>'
        : '<span class="pill">Not logged in</span>';

      gameInfoEl.innerHTML = state.gameId
        ? '<span class="pill">Game: ' + state.gameId + '</span><span class="pill">Invite: ' + state.inviteCode + '</span><span class="pill">Seat: ' + state.seat + '</span>'
        : '<span class="pill">No active game</span>';

      stateEl.textContent = JSON.stringify(state.gameState, null, 2);

      actionsEl.innerHTML = '';
      for (const action of state.validActions) {
        const btn = document.createElement('button');
        btn.textContent = action;
        btn.className = 'secondary';
        btn.onclick = () => sendActionFromName(action);
        actionsEl.appendChild(btn);
      }

      cardsEl.innerHTML = '';
      const cards = state.validCards.length ? state.validCards : (state.gameState?.hand?.yourCards || []);
      for (const card of cards) {
        const btn = document.createElement('button');
        btn.textContent = cardLabel(card);
        btn.onclick = () => sendAction({ type: 'play_card', card });
        cardsEl.appendChild(btn);
      }
    }

    function send(message) {
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        log('WebSocket not connected');
        return;
      }
      state.ws.send(JSON.stringify(message));
    }

    function sendAction(action) {
      send({ type: 'action', action });
    }

    function sendActionFromName(actionName) {
      if (actionName === 'call_trump') {
        const suit = prompt('Suit? hearts/diamonds/clubs/spades', 'hearts');
        if (suit && suits.includes(suit)) sendAction({ type: 'call_trump', suit });
        return;
      }
      if (actionName === 'play_card' || actionName === 'discard') {
        log('Use card buttons for ' + actionName);
        return;
      }
      sendAction({ type: actionName });
    }


    function clearReconnectTimer() {
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }
    }

    function clearPingTimer() {
      if (state.pingTimer) {
        clearInterval(state.pingTimer);
        state.pingTimer = null;
      }
    }

    function scheduleReconnect() {
      if (!state.gameId || !state.token || state.reconnectTimer) return;
      const delay = Math.min(10000, 1000 * (2 ** state.reconnectAttempt));
      state.reconnectAttempt += 1;
      log('Reconnecting WebSocket in ' + delay + 'ms');
      state.reconnectTimer = setTimeout(() => {
        state.reconnectTimer = null;
        connectWs();
      }, delay);
    }

    function connectWs() {
      if (!state.gameId || !state.token) return;
      if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = protocol + '//' + location.host + '/api/games/' + state.gameId + '/ws?authToken=' + encodeURIComponent(state.token);
      const ws = new WebSocket(url);
      state.ws = ws;

      ws.onopen = () => {
        state.reconnectAttempt = 0;
        clearReconnectTimer();
        clearPingTimer();
        state.pingTimer = setInterval(() => {
          send({ type: 'ping', ts: Date.now() });
        }, 25000);
        log('WebSocket connected');
      };
      ws.onclose = () => {
        clearPingTimer();
        log('WebSocket disconnected');
        scheduleReconnect();
      };
      ws.onerror = () => log('WebSocket error');
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        log('recv ' + msg.type, msg);

        if (msg.type === 'game_state') {
          state.gameState = msg.state;
          if (typeof msg.state?.hand?.currentTurnSeat === 'number') {
            state.seat = state.seat >= 0 ? state.seat : msg.state.hand.currentTurnSeat;
          }
        }
        if (msg.type === 'your_turn') {
          state.validActions = msg.validActions || [];
          state.validCards = msg.validCards || [];
        }
        if (msg.type === 'pong') {
          return;
        }
        if (msg.type === 'error') {
          alert(msg.message);
        }
        render();
      };
    }

    async function fetchGameState() {
      if (!state.gameId || !state.token) return;
      const res = await api('/api/games/' + state.gameId);
      if (res.ok) {
        state.gameState = await res.json();
        render();
      }
    }

    document.getElementById('registerBtn').onclick = async () => {
      const displayName = document.getElementById('displayName').value.trim() || 'Player';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        log('register failed', data);
        return;
      }
      state.token = data.authToken;
      state.playerId = data.playerId;
      state.displayName = data.displayName;
      saveAuth();
      render();
      log('Registered', data);
    };

    document.getElementById('createBtn').onclick = async () => {
      if (!state.token) return alert('Register first');
      const res = await api('/api/games', { method: 'POST', body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) return log('create failed', data);

      state.gameId = data.gameId;
      state.inviteCode = data.inviteCode;
      state.seat = data.seat;
      saveGame();
      render();
      connectWs();
      fetchGameState();
      log('Game created', data);
    };

    document.getElementById('joinBtn').onclick = async () => {
      if (!state.token) return alert('Register first');
      const code = document.getElementById('inviteCode').value.trim().toUpperCase();
      const res = await api('/api/games/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) return log('join failed', data);

      state.gameId = data.gameId;
      state.inviteCode = data.inviteCode;
      state.seat = data.seat;
      saveGame();
      render();
      connectWs();
      fetchGameState();
      log('Joined game', data);
    };

    document.getElementById('addBotsBtn').onclick = () => {
      for (let seat = 0; seat < 4; seat++) {
        if (seat !== state.seat) send({ type: 'add_bot', seat, difficulty: 'medium' });
      }
    };

    document.getElementById('startBtn').onclick = () => send({ type: 'start_game' });

    if (state.displayName) document.getElementById('displayName').value = state.displayName;
    render();
    fetchGameState().then(connectWs);
  </script>
</body>
</html>`;
}
