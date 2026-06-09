// ─── State ─────────────────────────────────────────────────────────────────
let currentModel = 'gpt';
let history = [];
let isLoading = false;

// ─── Init ──────────────────────────────────────────────────────────────────
(function init() {
  loadFromStorage();
  updateModelStatus();
})();

function loadFromStorage() {
  const gptKey    = ls('gpt_key')    || '';
  const gptModel  = ls('gpt_model')  || 'gpt-4o';
  const gptSys    = ls('gpt_system') || '';
  const clKey     = ls('claude_key')    || '';
  const clModel   = ls('claude_model')  || 'claude-opus-4-5';
  const clSys     = ls('claude_system') || '';

  document.getElementById('gpt-key').value    = gptKey;
  document.getElementById('gpt-model').value  = gptModel;
  document.getElementById('gpt-system').value = gptSys;
  document.getElementById('claude-key').value    = clKey;
  document.getElementById('claude-model').value  = clModel;
  document.getElementById('claude-system').value = clSys;
}

// ─── Routing ───────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
}

// ─── Model selector ────────────────────────────────────────────────────────
function selectModel(m) {
  currentModel = m;
  document.querySelectorAll('.model-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + m).classList.add('active');
  document.getElementById('chat-model-label').textContent = m === 'gpt' ? 'ChatGPT' : 'Claude';
  updateModelStatus();
  clearChat();
}

function updateModelStatus() {
  const key = currentModel === 'gpt' ? ls('gpt_key') : ls('claude_key');
  const dot  = document.getElementById('status-dot');
  const txt  = document.getElementById('status-text');
  const hint = document.getElementById('chat-hint');
  if (key) {
    dot.classList.add('ok');
    txt.textContent = 'Ключ задан ✓';
    hint.textContent = currentModel === 'gpt'
      ? (ls('gpt_model') || 'gpt-4o')
      : (ls('claude_model') || 'claude-opus-4-5');
  } else {
    dot.classList.remove('ok');
    txt.textContent = 'Ключ не задан';
    hint.textContent = 'Вставьте API-ключ в Настройках';
  }
}

// ─── Settings tabs ─────────────────────────────────────────────────────────
function switchSettingsTab(m) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('stab-' + m).classList.add('active');
  document.getElementById('settings-' + m).classList.add('active');
}

function onKeyInput(m) { /* live feedback if needed */ }

function toggleVis(id, btn) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

function saveSettings(m) {
  if (m === 'gpt') {
    setLs('gpt_key',    document.getElementById('gpt-key').value.trim());
    setLs('gpt_model',  document.getElementById('gpt-model').value);
    setLs('gpt_system', document.getElementById('gpt-system').value.trim());
  } else {
    setLs('claude_key',    document.getElementById('claude-key').value.trim());
    setLs('claude_model',  document.getElementById('claude-model').value);
    setLs('claude_system', document.getElementById('claude-system').value.trim());
  }
  const msgEl = document.getElementById('save-msg-' + m);
  msgEl.textContent = '✓ Настройки сохранены';
  setTimeout(() => msgEl.textContent = '', 2500);
  updateModelStatus();
}

function clearKey(m) {
  if (m === 'gpt') {
    document.getElementById('gpt-key').value = '';
    setLs('gpt_key', '');
  } else {
    document.getElementById('claude-key').value = '';
    setLs('claude_key', '');
  }
  const msgEl = document.getElementById('save-msg-' + m);
  msgEl.style.color = '#f87171';
  msgEl.textContent = 'Ключ удалён';
  setTimeout(() => { msgEl.textContent = ''; msgEl.style.color = '#22c55e'; }, 2000);
  updateModelStatus();
}

// ─── Chat ──────────────────────────────────────────────────────────────────
function clearChat() {
  history = [];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">⬡</div>
      <h2>Привет! Я AI Hub.</h2>
      <p>Выберите модель слева и начните диалог.<br>
         Не забудьте вставить ключ в <button onclick="showPage('settings')" class="link-btn">Настройках</button>.</p>
    </div>`;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('user-input');
  const text  = input.value.trim();
  if (!text) return;

  const key = currentModel === 'gpt' ? ls('gpt_key') : ls('claude_key');
  if (!key) {
    showPage('settings');
    return;
  }

  appendMsg('user', text);
  history.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';

  const typingId = appendTyping();
  document.getElementById('send-btn').disabled = true;
  isLoading = true;

  try {
    let reply;
    if (currentModel === 'gpt') {
      reply = await callOpenAI(key, history);
    } else {
      reply = await callClaude(key, history);
    }
    removeTyping(typingId);
    appendMsg('assistant', reply);
    history.push({ role: 'assistant', content: reply });
  } catch (err) {
    removeTyping(typingId);
    appendMsg('error', '⚠ ' + (err.message || 'Ошибка запроса. Проверьте ключ и сеть.'));
  } finally {
    isLoading = false;
    document.getElementById('send-btn').disabled = false;
  }
}

// ─── API calls ─────────────────────────────────────────────────────────────
async function callOpenAI(key, msgs) {
  const sysPrompt = ls('gpt_system') || 'You are a helpful assistant.';
  const model     = ls('gpt_model')  || 'gpt-4o';

  const body = {
    model,
    messages: [{ role: 'system', content: sysPrompt }, ...msgs]
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '(пустой ответ)';
}

async function callClaude(key, msgs) {
  const sysPrompt = ls('claude_system') || 'You are a helpful assistant.';
  const model     = ls('claude_model')  || 'claude-opus-4-5';

  const body = {
    model,
    max_tokens: 2048,
    system: sysPrompt,
    messages: msgs
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '(пустой ответ)';
}

// ─── DOM helpers ───────────────────────────────────────────────────────────
function appendMsg(role, text) {
  const wrap = document.getElementById('messages');

  // remove welcome screen on first real message
  const welcome = wrap.querySelector('.welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = 'msg' + (role === 'user' ? ' user' : '') + (role === 'error' ? ' msg-error' : '');

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'user' ? '🧑' : (role === 'error' ? '⚠' : '⬡');

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  div.appendChild(avatar);
  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function appendTyping() {
  const wrap = document.getElementById('messages');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.className = 'msg';
  div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">⬡</div>
    <div class="msg-bubble typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── localStorage helpers ──────────────────────────────────────────────────
function ls(k)       { try { return localStorage.getItem(k); } catch { return null; } }
function setLs(k, v) { try { localStorage.setItem(k, v); }    catch {} }
