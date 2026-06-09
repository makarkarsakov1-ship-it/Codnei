// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let currentModel = 'gpt';          // 'gpt' | 'claude'
let chats        = [];             // [{ id, model, title, history:[] }]
let activeChatId = null;
let isLoading    = false;

// ═══════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════
(function init() {
  loadSettings();
  loadChats();
  renderHistoryList();
  if (chats.length === 0) newChat(false);
  else loadChat(chats[0].id);
})();

// ═══════════════════════════════════════════════════════════════
//  DRAWER
// ═══════════════════════════════════════════════════════════════
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════
function openSettings() {
  closeDrawer();
  document.getElementById('settings-overlay').classList.add('open');
  document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
  document.getElementById('settings-modal').classList.remove('open');
}

function switchMTab(m) {
  ['gpt','claude'].forEach(x => {
    document.getElementById('mtab-' + x).classList.toggle('active', x === m);
    document.getElementById('mpanel-' + x).classList.toggle('active', x === m);
  });
}

function loadSettings() {
  el('gpt-keys').value    = ls('gpt_keys')    || '';
  el('gpt-model').value   = ls('gpt_model')   || 'chatgpt-4o-latest';
  el('gpt-system').value  = ls('gpt_system')  || '';
  el('claude-keys').value   = ls('claude_keys')   || '';
  el('claude-model').value  = ls('claude_model')  || 'claude-opus-4-7';
  el('claude-system').value = ls('claude_system') || '';
}

function saveSettings(m) {
  if (m === 'gpt') {
    setLs('gpt_keys',   el('gpt-keys').value.trim());
    setLs('gpt_model',  el('gpt-model').value);
    setLs('gpt_system', el('gpt-system').value.trim());
  } else {
    setLs('claude_keys',   el('claude-keys').value.trim());
    setLs('claude_model',  el('claude-model').value);
    setLs('claude_system', el('claude-system').value.trim());
  }
  showSaveMsg(m, '✓ Сохранено', false);
  updateTopbar();
}

function clearKeys(m) {
  if (m === 'gpt') { el('gpt-keys').value = ''; setLs('gpt_keys', ''); }
  else             { el('claude-keys').value = ''; setLs('claude_keys', ''); }
  showSaveMsg(m, 'Ключи удалены', true);
  updateTopbar();
}

function showSaveMsg(m, txt, isErr) {
  const e = el('save-msg-' + m);
  e.style.color = isErr ? 'var(--err)' : 'var(--ok)';
  e.textContent = txt;
  setTimeout(() => e.textContent = '', 2500);
}

// ═══════════════════════════════════════════════════════════════
//  MODEL SWITCHER (topbar)
// ═══════════════════════════════════════════════════════════════
function selectModel(m) {
  currentModel = m;
  ['gpt','claude'].forEach(x =>
    el('msw-' + x).classList.toggle('active', x === m)
  );
  updateTopbar();
  // switch active chat's model too
  const chat = getActiveChat();
  if (chat) { chat.model = m; saveChats(); }
}

function updateTopbar() {
  const model = currentModel === 'gpt'
    ? (ls('gpt_model')    || 'chatgpt-4o-latest')
    : (ls('claude_model') || 'claude-opus-4-7');
  el('current-model-name').textContent = model;
}

// ═══════════════════════════════════════════════════════════════
//  CHAT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function newChat(render = true) {
  const id = 'chat_' + Date.now();
  const chat = { id, model: currentModel, title: 'Новый чат', history: [] };
  chats.unshift(chat);
  activeChatId = id;
  saveChats();
  if (render) {
    renderHistoryList();
    renderMessages();
    closeDrawer();
  }
}

function loadChat(id) {
  activeChatId = id;
  const chat = getActiveChat();
  if (!chat) return;
  currentModel = chat.model || 'gpt';
  ['gpt','claude'].forEach(x =>
    el('msw-' + x).classList.toggle('active', x === currentModel)
  );
  updateTopbar();
  renderMessages();
  renderHistoryList();
}

function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  if (activeChatId === id) {
    activeChatId = chats.length ? chats[0].id : null;
    if (!activeChatId) newChat(false);
  }
  saveChats();
  renderHistoryList();
  if (activeChatId) loadChat(activeChatId);
  else renderMessages();
}

function getActiveChat() {
  return chats.find(c => c.id === activeChatId) || null;
}

function renderHistoryList() {
  const wrap = el('chat-history-list');
  wrap.innerHTML = '';
  chats.forEach(chat => {
    const icon = chat.model === 'claude' ? '⬡' : '🤖';
    const div = document.createElement('div');
    div.className = 'history-item' + (chat.id === activeChatId ? ' active' : '');
    div.innerHTML = `
      <span class="history-icon">${icon}</span>
      <span class="history-label">${escHtml(chat.title)}</span>
      <button class="history-del" title="Удалить">🗑</button>
    `;
    div.addEventListener('click', () => { loadChat(chat.id); closeDrawer(); });
    div.querySelector('.history-del').addEventListener('click', (e) => deleteChat(chat.id, e));
    wrap.appendChild(div);
  });
}

function saveChats() {
  try { localStorage.setItem('ai_chats', JSON.stringify(chats)); } catch {}
}
function loadChats() {
  try {
    const raw = localStorage.getItem('ai_chats');
    if (raw) chats = JSON.parse(raw);
  } catch { chats = []; }
}

// ═══════════════════════════════════════════════════════════════
//  MESSAGES RENDER
// ═══════════════════════════════════════════════════════════════
function renderMessages() {
  const chat = getActiveChat();
  const wrap = el('messages');
  if (!chat || chat.history.length === 0) {
    wrap.innerHTML = `
      <div class="welcome" id="welcome-screen">
        <div class="welcome-hex">⬡</div>
        <h2>AI Chat Hub</h2>
        <p>Выберите модель вверху и начните диалог.<br>
          Нет ключей? <button class="link-btn" onclick="openSettings()">Откройте Настройки</button></p>
      </div>`;
    return;
  }
  wrap.innerHTML = '';
  chat.history.forEach(m => {
    if (m.role === 'user' || m.role === 'assistant') {
      appendMsgDOM(m.role, m.content, false);
    }
  });
  wrap.scrollTop = wrap.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(t) {
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 160) + 'px';
}

async function sendMessage() {
  if (isLoading) return;
  const inp  = el('user-input');
  const text = inp.value.trim();
  if (!text) return;

  // check keys
  const keys = getKeys(currentModel);
  if (keys.length === 0) {
    openSettings();
    return;
  }

  const chat = getActiveChat();
  chat.model = currentModel;
  chat.history.push({ role: 'user', content: text });
  if (chat.title === 'Новый чат') {
    chat.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
    renderHistoryList();
  }

  inp.value = ''; inp.style.height = 'auto';
  appendMsgDOM('user', text);

  const typId = appendTyping();
  el('send-btn').disabled = true;
  isLoading = true;

  try {
    const reply = await callWithRotation(currentModel, keys, chat.history);
    removeTyping(typId);
    chat.history.push({ role: 'assistant', content: reply });
    saveChats();
    appendMsgDOM('assistant', reply);
  } catch (err) {
    removeTyping(typId);
    appendErrorMsg(err.message);
  } finally {
    isLoading = false;
    el('send-btn').disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  KEY ROTATION — пробуем все ключи по очереди
// ═══════════════════════════════════════════════════════════════
function getKeys(m) {
  const raw = m === 'gpt' ? ls('gpt_keys') : ls('claude_keys');
  if (!raw) return [];
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

async function callWithRotation(model, keys, history) {
  let lastErr = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      if (model === 'gpt') return await callOpenAI(key, history);
      else                 return await callClaude(key, history);
    } catch (e) {
      lastErr = e;
      const msg = e.message || '';
      // stop rotating on non-auth errors
      if (!isKeyError(msg)) break;
      // else try next key
    }
  }
  throw lastErr || new Error('Все ключи не сработали');
}

function isKeyError(msg) {
  const m = msg.toLowerCase();
  return m.includes('401') || m.includes('403') ||
         m.includes('invalid') || m.includes('incorrect') ||
         m.includes('key') || m.includes('auth') ||
         m.includes('quota') || m.includes('rate') ||
         m.includes('billing') || m.includes('limit');
}

// ═══════════════════════════════════════════════════════════════
//  API: OpenAI
// ═══════════════════════════════════════════════════════════════
async function callOpenAI(key, history) {
  const model  = ls('gpt_model')  || 'chatgpt-4o-latest';
  const sys    = ls('gpt_system') || 'You are a helpful assistant.';

  const messages = [{ role: 'system', content: sys }, ...history];

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ model, messages })
    });
  } catch (netErr) {
    throw new Error(friendlyNetError(netErr));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(friendlyApiError(res.status, body?.error?.message, 'OpenAI'));
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '(пустой ответ)';
}

// ═══════════════════════════════════════════════════════════════
//  API: Claude (Anthropic)
// ═══════════════════════════════════════════════════════════════
async function callClaude(key, history) {
  const model  = ls('claude_model')  || 'claude-opus-4-7';
  const system = ls('claude_system') || 'You are a helpful assistant.';

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens: 2048, system, messages: history })
    });
  } catch (netErr) {
    throw new Error(friendlyNetError(netErr));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(friendlyApiError(res.status, body?.error?.message, 'Claude'));
  }

  const data = await res.json();
  return data.content?.[0]?.text || '(пустой ответ)';
}

// ═══════════════════════════════════════════════════════════════
//  HUMAN-READABLE ERRORS
// ═══════════════════════════════════════════════════════════════
function friendlyNetError(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    return '🌐 Нет соединения — проверьте интернет или VPN.\n(Failed to fetch)';
  }
  if (m.includes('cors')) {
    return '🚫 CORS-блокировка: браузер запрещает запрос напрямую.\nОткройте приложение через GitHub Pages или локальный сервер.';
  }
  return '🌐 Ошибка сети: ' + (e?.message || 'неизвестно');
}

function friendlyApiError(status, apiMsg, provider) {
  const m = (apiMsg || '').toLowerCase();
  const p = provider;
  if (status === 401 || m.includes('invalid') || m.includes('incorrect') || m.includes('auth')) {
    return `🔑 Ключ не работает (${p} 401): неверный или отозванный ключ.\n${apiMsg || ''}`;
  }
  if (status === 403) {
    return `🚫 Доступ запрещён (${p} 403): ключ не имеет прав или заблокирован.\n${apiMsg || ''}`;
  }
  if (status === 429 || m.includes('rate') || m.includes('quota') || m.includes('limit')) {
    return `⏱ Лимит запросов (${p} 429): слишком много запросов или кончились кредиты.\n${apiMsg || ''}`;
  }
  if (status === 402 || m.includes('billing') || m.includes('payment')) {
    return `💳 Проблема с оплатой (${p} 402): проверьте баланс на платформе.\n${apiMsg || ''}`;
  }
  if (status === 404) {
    return `❓ Модель не найдена (${p} 404): выбранная модель недоступна для вашего ключа.\n${apiMsg || ''}`;
  }
  if (status >= 500) {
    return `🔥 Сервер ${p} упал (${status}): подождите пару минут и попробуйте снова.\n${apiMsg || ''}`;
  }
  return `⚠ Ошибка ${p} ${status}: ${apiMsg || 'неизвестно'}`;
}

// ═══════════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════════
function appendMsgDOM(role, text, scroll = true) {
  const wrap = el('messages');
  const welcome = wrap.querySelector('.welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'user' ? '🧑' : (currentModel === 'claude' ? '⬡' : '🤖');

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  div.appendChild(avatar);
  div.appendChild(bubble);
  wrap.appendChild(div);
  if (scroll) wrap.scrollTop = wrap.scrollHeight;
}

function appendErrorMsg(text) {
  const wrap = el('messages');
  const div  = document.createElement('div');
  div.className = 'msg error';
  div.innerHTML = `
    <div class="msg-avatar">⚠</div>
    <div class="msg-bubble" style="background:#f8717115;border:1px solid #f8717140;color:var(--err);white-space:pre-wrap;">${escHtml(text)}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function appendTyping() {
  const wrap = el('messages');
  const id   = 'typing_' + Date.now();
  const div  = document.createElement('div');
  div.className = 'msg'; div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">${currentModel === 'claude' ? '⬡' : '🤖'}</div>
    <div class="msg-bubble typing-bubble">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}

function removeTyping(id) {
  const e = document.getElementById(id);
  if (e) e.remove();
}

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
function el(id) { return document.getElementById(id); }
function ls(k)  { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function setLs(k, v) { try { localStorage.setItem(k, v); } catch {} }
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
