'use client';

import { useRef, useState } from 'react';

import { ApiError, api } from '@/lib/api';
import { toastError } from '@/lib/toast';

type ChatMessage = { role: 'user' | 'assistant'; text: string };

/**
 * AI product chat — the storefront half of the source system's `ai-chat`
 * endpoint. Answers are grounded in the product record by the backend.
 */
export function AiChatPanel({ productId, productName }: { productId: number; productName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: `Hi! Ask me anything about ${productName} 👋` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = input.trim();
    if (!message || busy) return;

    setMessages((current) => [...current, { role: 'user', text: message }]);
    setInput('');
    setBusy(true);

    try {
      const data = await api<{ reply: string }>('/ai/chat', {
        method: 'POST',
        body: { product_id: productId, message },
      });

      setMessages((current) => [...current, { role: 'assistant', text: data.reply }]);
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : 'The assistant is unavailable right now. Please try again shortly.';

      setMessages((current) => [...current, { role: 'assistant', text }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  return (
    <div className="ai-panel ai-chat-box" data-product-id={productId}>
      <h5 className="ai-panel__title">
        <i className="las la-robot" /> Ask VIPURI about this part
      </h5>

      <div className="ai-chat__log" ref={logRef}>
        {messages.map((message, index) => (
          <div className={`ai-chat__bubble ${message.role}`} key={index}>
            {message.text}
          </div>
        ))}
        {busy && <div className="ai-chat__bubble assistant">Thinking…</div>}
      </div>

      <form className="ai-chat__form" onSubmit={send}>
        <input
          className="form-control form--control"
          type="text"
          placeholder="Will this fit my 2020 Hilux?"
          value={input}
          maxLength={1000}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="btn btn--base" type="submit" disabled={busy || input.trim().length === 0}>
          Send
        </button>
      </form>
    </div>
  );
}

/** AI summary of approved reviews, matching the source `ai-review-summary`. */
export function AiReviewSummary({ productId }: { productId: number }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; average: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);

    try {
      const data = await api<{ summary: string; total_reviews: number; average_rating: number }>(
        '/ai/review-summary',
        // The endpoint is signed-in only, so the customer's token goes with it.
        { method: 'POST', body: { product_id: productId }, auth: 'user' },
      );

      setSummary(data.summary);
      setMeta({ total: data.total_reviews, average: data.average_rating });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not generate a summary');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-panel">
      <h5 className="ai-panel__title">
        <i className="las la-magic" /> AI Review Summary
      </h5>
      <p className="mb-0">
        Let VIPURI read every approved review for this part and tell you, in a few lines, whether it is worth buying.
      </p>

      <button className="btn btn--base btn--sm mt-3" type="button" onClick={generate} disabled={busy}>
        {busy ? 'Summarising…' : summary ? 'Regenerate summary' : 'Generate summary'}
      </button>

      {summary && (
        <>
          {meta && (
            <p className="mt-3 mb-0" style={{ fontSize: 14 }}>
              Based on {meta.total} review{meta.total === 1 ? '' : 's'} · average {meta.average}/5
            </p>
          )}
          <div className="ai-panel__output">{summary}</div>
        </>
      )}
    </div>
  );
}
