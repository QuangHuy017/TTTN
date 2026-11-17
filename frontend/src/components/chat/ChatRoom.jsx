import { useEffect, useRef, useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import '../../styles/chat.css';

export default function ChatRoom({ conversationId, user, token, onConversation }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [older, setOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [retry, setRetry] = useState(0);
  const panel = useRef(null), newest = useRef(0), oldest = useRef(null), marked = useRef(0), nonce = useRef(null), controller = useRef(null), scroll = useRef(true);
  const callback = useRef(onConversation); callback.current = onConversation;
  const base = `/chat/conversations/${conversationId}`;
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => { setDraft(''); nonce.current = null; }, [conversationId, token]);
  function merge(items) { setMessages(previous => [...new Map([...previous, ...items].map(item => [item._id, item])).values()].sort((a, b) => a.sequence - b.sequence)); }
  useEffect(() => {
    const active = new AbortController(); controller.current = active;
    let pending = false;
    newest.current = 0; oldest.current = null; marked.current = 0; scroll.current = true;
    setMessages([]); setSendError(''); setError(''); setLoading(true); setSending(false); setHasOlder(false); setOlder(false);
    async function load() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const initial = newest.current === 0;
        const result = await apiRequest(`${base}/messages${initial ? '' : `?after=${newest.current}`}`, { signal: active.signal, headers: { Authorization: `Bearer ${token}` } });
        if (active.signal.aborted) return;
        callback.current?.(result.conversation);
        if (initial) { oldest.current = result.nextBefore; setHasOlder(result.hasMore); }
        if (result.data.length) {
          const element = panel.current;
          scroll.current = initial || !element || element.scrollHeight - element.scrollTop - element.clientHeight < 90;
          merge(result.data);
          newest.current = Math.max(newest.current, result.data.at(-1).sequence);
        }
        const through = newest.current;
        if (through > marked.current) {
          await apiRequest(`${base}/read`, { signal: active.signal, method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ throughSequence: through }) });
          if (!active.signal.aborted) { marked.current = through; window.dispatchEvent(new Event('techrental-chat-updated')); }
        }
        setError('');
      } catch (err) { if (err.name !== 'AbortError') setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : 'Chưa kết nối được cuộc trò chuyện. Vui lòng thử lại.'); }
      finally { pending = false; if (!active.signal.aborted) setLoading(false); }
    }
    load(); const timer = setInterval(load, 4000);
    window.addEventListener('focus', load); document.addEventListener('visibilitychange', load);
    return () => { active.abort(); clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [conversationId, token, retry, base]);
  useEffect(() => { if (scroll.current && panel.current) panel.current.scrollTop = panel.current.scrollHeight; }, [messages]);
  async function loadOlder() {
    if (older || !oldest.current) return;
    setOlder(true);
    const active = controller.current;
    try {
      const oldHeight = panel.current?.scrollHeight || 0;
      const result = await apiRequest(`${base}/messages?before=${oldest.current}`, { signal: active.signal, headers });
      if (active.signal.aborted) return;
      scroll.current = false; merge(result.data); oldest.current = result.nextBefore; setHasOlder(result.hasMore);
      requestAnimationFrame(() => { if (!active.signal.aborted && panel.current) panel.current.scrollTop += panel.current.scrollHeight - oldHeight; });
    } catch (err) { if (err.name !== 'AbortError') setError('Chưa tải được tin nhắn cũ. Hãy thử lại.'); }
    finally { if (!active.signal.aborted) setOlder(false); }
  }
  async function send(event) {
    event.preventDefault(); if (!draft.trim() || sending) return;
    const active = controller.current;
    if (!active || active.signal.aborted) return;
    const content = draft.trim();
    if (!nonce.current || nonce.current.content !== content) nonce.current = { content, clientId: crypto.randomUUID() };
    setSending(true); setSendError('');
    try {
      const result = await apiRequest(`${base}/messages`, { signal: active.signal, method: 'POST', headers, body: JSON.stringify(nonce.current) });
      if (active.signal.aborted) return;
      scroll.current = true; merge([result.data]); setDraft(''); nonce.current = null;
      // Poll from the previous received sequence so concurrent incoming messages cannot be skipped.
      window.dispatchEvent(new Event('techrental-chat-updated'));
    } catch (err) { if (err.name !== 'AbortError') setSendError(err.status === 401 ? 'Vui lòng đăng nhập lại để gửi tin.' : err.message); }
    finally { if (!active.signal.aborted) setSending(false); }
  }
  return <div className="chat-room">{error && <div className="chat-error" role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={13} />Thử lại</button></div>}<div ref={panel} className="chat-timeline" aria-label="Lịch sử tin nhắn" aria-live="polite">{hasOlder && <button className="chat-load-older" disabled={older} onClick={loadOlder}>{older ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}</button>}{loading ? <p className="chat-state" role="status">Đang tải cuộc trò chuyện…</p> : !messages.length && !error ? <div className="chat-welcome"><span>Chào bạn 👋</span><p>Bạn cần tư vấn thiết bị hoặc hỗ trợ đơn thuê? Hãy để lại tin nhắn, nhân viên sẽ phản hồi tại đây.</p></div> : null}{messages.map(message => { const mine = String(message.sender) === String(user._id); return <article key={message._id} className={`chat-message ${mine ? 'mine' : 'theirs'}`}><small>{mine ? 'Bạn' : `${message.senderRole === 'renter' ? '' : 'Nhân viên · '}${message.senderName}`}</small><p>{message.content}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</time></article>; })}</div><form className="chat-compose" onSubmit={send}>{sendError && <p className="chat-error" role="alert">{sendError}</p>}<div><textarea aria-label="Nội dung tin nhắn" rows={2} maxLength={2000} disabled={sending || loading} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder="Nhập tin nhắn cho nhân viên…" /><button type="submit" aria-label="Gửi tin nhắn" disabled={sending || loading || !draft.trim()}><Send size={18} /></button></div><small>{sending ? 'Đang gửi…' : 'Enter để gửi · Shift + Enter để xuống dòng'}<span>{draft.length}/2000</span></small></form></div>;
}
