// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let currentModel = 'gpt';
let chats        = [];
let activeChatId = null;
let isLoading    = false;

// autosave debounce timers
const _debounce = {};

// ═══════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════
(function init() {
  loadSettings();
  loadChats();
  renderHistoryList();
  if (chats.length === 0) newChat(false);
  else loadChat(chats[0].id);

  // wire up AUTOSAVE on every settings field
  const autoFields = [
    { id:'gpt-keys',    key:'gpt_keys'    },
    { id:'gpt-model',   key:'gpt_model'   },
    { id:'gpt-system',  key:'gpt_system'  },
    { id:'claude-keys', key:'claude_keys' },
    { id:'claude-model',key:'claude_model'},
    { id:'claude-system',key:'claude_system'},
  ];
  autoFields.forEach(({id, key}) => {
    const el = document.getElementById(id);
    if (!el) return;
    const provider = id.startsWith('gpt') ? 'gpt' : 'claude';
    el.addEventListener('input', () => autosave(key, el.value, provider));
    el.addEventListener('change', () => autosave(key, el.value, provider));
  });
})();

// autosave with 800ms debounce
function autosave(storageKey, value, provider) {
  clearTimeout(_debounce[storageKey]);
  _debounce[storageKey] = setTimeout(() => {
    setLs(storageKey, value.trim ? value.trim() : value);
    showSaveMsg(provider, '✓ Автосохранено', false);
    updateTopbar();
  }, 800);
}

function loadSettings() {
  document.getElementById('gpt-keys').value     = ls('gpt_keys')     || '';
  document.getElementById('gpt-model').value    = ls('gpt_model')    || 'chatgpt-4o-latest';
  document.getElementById('gpt-system').value   = ls('gpt_system')   || '';
  document.getElementById('claude-keys').value  = ls('claude_keys')  || '';
  document.getElementById('claude-model').value = ls('claude_model') || 'claude-opus-4-7';
  document.getElementById('claude-system').value= ls('claude_system')|| '';
}

// ═══════════════════════════════════════════════════════════
//  DRAWER
// ═══════════════════════════════════════════════════════════
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
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

function showSaveMsg(provider, txt, isErr) {
  const e = document.getElementById('save-msg-' + provider);
  if (!e) return;
  e.style.color = isErr ? 'var(--err)' : 'var(--ok)';
  e.textContent = txt;
  clearTimeout(e._t);
  e._t = setTimeout(() => e.textContent = '', 2500);
}

// Manual save button (optional, still works)
function saveSettings(m) {
  const keys = ['keys','model','system'];
  keys.forEach(k => {
    const el = document.getElementById(m + '-' + k);
    if (el) setLs(m + '_' + k, el.value.trim ? el.value.trim() : el.value);
  });
  showSaveMsg(m, '✓ Сохранено навсегда', false);
  updateTopbar();
}

function clearKeys(m) {
  document.getElementById(m + '-keys').value = '';
  setLs(m + '_keys', '');
  showSaveMsg(m, 'Ключи удалены', true);
  updateTopbar();
}

// ═══════════════════════════════════════════════════════════
//  MODEL SWITCHER
// ═══════════════════════════════════════════════════════════
function selectModel(m) {
  currentModel = m;
  ['gpt','claude'].forEach(x =>
    document.getElementById('msw-' + x).classList.toggle('active', x === m)
  );
  updateTopbar();
  const chat = getActiveChat();
  if (chat) { chat.model = m; saveChats(); }
}

function updateTopbar() {
  const model = currentModel === 'gpt'
    ? (ls('gpt_model')    || 'chatgpt-4o-latest')
    : (ls('claude_model') || 'claude-opus-4-7');
  document.getElementById('current-model-name').textContent = model;
}

// ═══════════════════════════════════════════════════════════
//  CHAT MANAGEMENT
// ═══════════════════════════════════════════════════════════
function newChat(render = true) {
  const id = 'c' + Date.now();
  chats.unshift({ id, model: currentModel, title: 'Новый чат', history: [] });
  activeChatId = id;
  saveChats();
  if (render) { renderHistoryList(); renderMessages(); closeDrawer(); }
}

function loadChat(id) {
  activeChatId = id;
  const chat = getActiveChat();
  if (!chat) return;
  currentModel = chat.model || 'gpt';
  ['gpt','claude'].forEach(x =>
    document.getElementById('msw-' + x).classList.toggle('active', x === currentModel)
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
  const wrap = document.getElementById('chat-history-list');
  wrap.innerHTML = '';
  chats.forEach(chat => {
    const icon = chat.model === 'claude' ? '⬡' : '🤖';
    const div  = document.createElement('div');
    div.className = 'history-item' + (chat.id === activeChatId ? ' active' : '');
    div.innerHTML = `
      <span class="history-icon">${icon}</span>
      <span class="history-label">${escHtml(chat.title)}</span>
      <button class="history-del" title="Удалить">🗑</button>`;
    div.addEventListener('click', () => { loadChat(chat.id); closeDrawer(); });
    div.querySelector('.history-del').addEventListener('click', e => deleteChat(chat.id, e));
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

// ═══════════════════════════════════════════════════════════
//  RENDER MESSAGES
// ═══════════════════════════════════════════════════════════
function renderMessages() {
  const chat = getActiveChat();
  const wrap = document.getElementById('messages');
  if (!chat || chat.history.length === 0) {
    wrap.innerHTML = `
      <div class="welcome">
        <div class="welcome-hex">⬡</div>
        <h2>AI Chat Hub</h2>
        <p>Выберите модель вверху и начните диалог.<br>
          Нет ключей? <button class="link-btn" onclick="openSettings()">Открыть Настройки</button></p>
      </div>`;
    return;
  }
  wrap.innerHTML = '';
  chat.history.forEach(m => {
    if (m.role === 'user' || m.role === 'assistant')
      appendMsgDOM(m.role, m.content, false);
  });
  wrap.scrollTop = wrap.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════════════════════
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(t) {
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
}

async function sendMessage() {
  if (isLoading) return;
  const inp  = document.getElementById('user-input');
  const text = inp.value.trim();
  if (!text) return;

  const keys = getKeys(currentModel);
  if (keys.length === 0) { openSettings(); return; }

  const chat = getActiveChat();
  chat.model = currentModel;
  chat.history.push({ role: 'user', content: text });
  if (chat.title === 'Новый чат')
    chat.title = text.slice(0, 42) + (text.length > 42 ? '…' : '');

  inp.value = ''; inp.style.height = 'auto';
  appendMsgDOM('user', text);
  renderHistoryList();

  const typId = appendTyping();
  document.getElementById('send-btn').disabled = true;
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
    document.getElementById('send-btn').disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
//  KEY ROTATION
// ═══════════════════════════════════════════════════════════
function getKeys(m) {
  const raw = m === 'gpt' ? ls('gpt_keys') : ls('claude_keys');
  if (!raw) return [];
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

async function callWithRotation(model, keys, history) {
  let lastErr = null;
  for (const key of keys) {
    try {
      return model === 'gpt'
        ? await callOpenAI(key, history)
        : await callClaude(key, history);
    } catch (e) {
      lastErr = e;
      if (!isKeyError(e.message || '')) break; // non-auth → don't rotate
    }
  }
  throw lastErr || new Error('Все ключи не сработали');
}

function isKeyError(msg) {
  const m = msg.toLowerCase();
  return m.includes('401') || m.includes('403') || m.includes('invalid') ||
         m.includes('incorrect') || m.includes('key') || m.includes('auth') ||
         m.includes('quota') || m.includes('rate') || m.includes('billing') ||
         m.includes('limit') || m.includes('payment');
}

// ═══════════════════════════════════════════════════════════
//  API: OpenAI
// ═══════════════════════════════════════════════════════════
async function callOpenAI(key, history) {
  const model = ls('gpt_model')  || 'chatgpt-4o-latest';
  const sys   = ls('gpt_system') || 'You are a helpful assistant.';
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+key },
      body: JSON.stringify({ model, messages:[{role:'system',content:sys},...history] })
    });
  } catch (e) { throw new Error(friendlyNet(e)); }
  if (!res.ok) {
    const b = await res.json().catch(()=>({}));
    throw new Error(friendlyApi(res.status, b?.error?.message, 'OpenAI'));
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '(пустой ответ)';
}

// ═══════════════════════════════════════════════════════════
//  API: Claude
// ═══════════════════════════════════════════════════════════
async function callClaude(key, history) {
  const model  = ls('claude_model')  || 'claude-opus-4-7';
  const system = ls('claude_system') || 'You are a helpful assistant.';
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens:2048, system, messages:history })
    });
  } catch (e) { throw new Error(friendlyNet(e)); }
  if (!res.ok) {
    const b = await res.json().catch(()=>({}));
    throw new Error(friendlyApi(res.status, b?.error?.message, 'Claude'));
  }
  const d = await res.json();
  return d.content?.[0]?.text || '(пустой ответ)';
}

// ═══════════════════════════════════════════════════════════
//  ERROR MESSAGES (на русском)
// ═══════════════════════════════════════════════════════════
function friendlyNet(e) {
  const m = (e?.message||'').toLowerCase();
  if (m.includes('failed to fetch')||m.includes('networkerror')||m.includes('load failed'))
    return '🌐 Нет соединения. Проверьте интернет или VPN.\n(Failed to fetch)';
  if (m.includes('cors'))
    return '🚫 CORS-блокировка: браузер запрещает прямой запрос к API.\nОткройте через GitHub Pages.';
  return '🌐 Ошибка сети: '+(e?.message||'неизвестно');
}

function friendlyApi(status, msg, prov) {
  const m = (msg||'').toLowerCase();
  if (status===401||m.includes('invalid')||m.includes('incorrect')||m.includes('auth'))
    return `🔑 Неверный ключ (${prov} 401): ключ отозван или неправильный.\n${msg||''}`;
  if (status===403)
    return `🚫 Доступ запрещён (${prov} 403): ключ заблокирован.\n${msg||''}`;
  if (status===429||m.includes('rate')||m.includes('quota')||m.includes('limit'))
    return `⏱ Лимит запросов (${prov} 429): слишком много запросов или кончился баланс.\n${msg||''}`;
  if (status===402||m.includes('billing')||m.includes('payment'))
    return `💳 Проблема с оплатой (${prov} 402): проверьте баланс на платформе.\n${msg||''}`;
  if (status===404)
    return `❓ Модель не найдена (${prov} 404): эта модель недоступна для вашего ключа.\n${msg||''}`;
  if (status>=500)
    return `🔥 Сервер ${prov} не отвечает (${status}): подождите и повторите.\n${msg||''}`;
  return `⚠ Ошибка ${prov} ${status}: ${msg||'неизвестно'}`;
}

// ═══════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════
function appendMsgDOM(role, text, scroll=true) {
  const wrap = document.getElementById('messages');
  const welcome = wrap.querySelector('.welcome');
  if (welcome) welcome.remove();

  const div    = document.createElement('div');
  div.className= 'msg ' + (role==='user' ? 'user' : 'assistant');

  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = role==='user' ? '🧑' : (currentModel==='claude' ? '⬡' : '🤖');

  const bub = document.createElement('div');
  bub.className = 'msg-bubble';
  bub.textContent = text;

  div.appendChild(av); div.appendChild(bub);
  wrap.appendChild(div);
  if (scroll) wrap.scrollTop = wrap.scrollHeight;
}

function appendErrorMsg(text) {
  const wrap = document.getElementById('messages');
  const div  = document.createElement('div');
  div.className = 'msg error';
  div.innerHTML = `
    <div class="msg-avatar">⚠</div>
    <div class="msg-bubble" style="background:#f8717112;border:1px solid #f8717138;color:var(--err);white-space:pre-wrap;">${escHtml(text)}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function appendTyping() {
  const wrap = document.getElementById('messages');
  const id   = 't'+Date.now();
  const div  = document.createElement('div');
  div.className='msg'; div.id=id;
  div.innerHTML=`
    <div class="msg-avatar">${currentModel==='claude'?'⬡':'🤖'}</div>
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

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function ls(k)       { try{return localStorage.getItem(k)||'';}catch{return '';} }
function setLs(k,v)  { try{localStorage.setItem(k,v);}catch{} }
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
