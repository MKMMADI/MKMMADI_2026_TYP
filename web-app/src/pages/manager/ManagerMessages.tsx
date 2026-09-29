import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import ManagerLayout from "@/components/ManagerLayout";
import { API_SOCKET_URL, apiFetch, getSocketAccessToken } from "@/lib/api";
import "@/styles/manager-messages.css";

type Role = "EMPLOYEE" | "CLERK" | "MANAGER";

interface Participant {
  id: number;
  name: string;
  role: Role;
}

interface DirectMessage {
  id: number;
  conversationId: number;
  senderId: number;
  recipientId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  sender: Participant;
  recipient: Participant;
}

interface ConversationSummary {
  id: number;
  participant: Participant;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: DirectMessage | null;
}

interface MessagePage {
  messages: DirectMessage[];
  nextBeforeId: number | null;
}

interface CurrentUser extends Participant {
  email: string;
}

type SocketStatus = "connecting" | "connected" | "offline";

function mergeMessages(current: DirectMessage[], incoming: DirectMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, { ...byId.get(message.id), ...message }));
  return [...byId.values()].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime() || first.id - second.id,
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const previewUser: CurrentUser = {
  id: 1,
  name: "Lerato Mokoena",
  email: "lerato@example.com",
  role: "MANAGER",
};

const previewContacts: Participant[] = [
  { id: 2, name: "Thabo Ndlovu", role: "EMPLOYEE" },
  { id: 3, name: "Amara Dlamini", role: "CLERK" },
  { id: 4, name: "Neo Khumalo", role: "MANAGER" },
];

function previewMessage(
  id: number,
  conversationId: number,
  sender: Participant,
  recipient: Participant,
  body: string,
  createdAt: string,
): DirectMessage {
  return {
    id,
    conversationId,
    senderId: sender.id,
    recipientId: recipient.id,
    body,
    createdAt,
    readAt: null,
    sender,
    recipient,
  };
}

const previewConversations: ConversationSummary[] = [
  {
    id: 101,
    participant: previewContacts[0],
    createdAt: "2026-09-27T08:00:00.000Z",
    updatedAt: "2026-09-28T08:42:00.000Z",
    unreadCount: 1,
    lastMessage: previewMessage(1002, 101, previewContacts[0], previewUser, "The Riverside room is ready for review.", "2026-09-28T08:42:00.000Z"),
  },
  {
    id: 102,
    participant: previewContacts[1],
    createdAt: "2026-09-25T08:00:00.000Z",
    updatedAt: "2026-09-28T08:17:00.000Z",
    unreadCount: 0,
    lastMessage: previewMessage(1003, 102, previewUser, previewContacts[1], "Thanks, please check the projector too.", "2026-09-28T08:17:00.000Z"),
  },
  {
    id: 103,
    participant: previewContacts[2],
    createdAt: "2026-09-23T08:00:00.000Z",
    updatedAt: "2026-09-28T07:55:00.000Z",
    unreadCount: 0,
    lastMessage: previewMessage(1004, 103, previewContacts[2], previewUser, "I have updated the facilities report.", "2026-09-28T07:55:00.000Z"),
  },
];

const previewMessages: Record<number, DirectMessage[]> = {
  101: [
    previewMessage(1001, 101, previewUser, previewContacts[0], "How is the Riverside setup going?", "2026-09-28T08:34:00.000Z"),
    previewMessage(1002, 101, previewContacts[0], previewUser, "The Riverside room is ready for review.", "2026-09-28T08:42:00.000Z"),
  ],
  102: [
    previewMessage(1003, 102, previewUser, previewContacts[1], "Thanks, please check the projector too.", "2026-09-28T08:17:00.000Z"),
  ],
  103: [
    previewMessage(1004, 103, previewContacts[2], previewUser, "I have updated the facilities report.", "2026-09-28T07:55:00.000Z"),
  ],
};

export default function ManagerMessages() {
  const isPresentationPreview = new URLSearchParams(window.location.search).get("demo") === "1";
  return isPresentationPreview ? <ManagerMessagesPreview /> : <ManagerMessagesLive />;
}

function ManagerMessagesPreview() {
  const [conversations, setConversations] = useState(previewConversations);
  const [selectedConversationId, setSelectedConversationId] = useState(101);
  const [messagesByConversation, setMessagesByConversation] = useState(previewMessages);
  const [contactSearch, setContactSearch] = useState("");
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversation = conversations.find(({ id }) => id === selectedConversationId) ?? null;
  const messages = messagesByConversation[selectedConversationId] ?? [];
  const filteredContacts = previewContacts.filter((contact) =>
    `${contact.name} ${contact.role}`.toLowerCase().includes(contactSearch.trim().toLowerCase()),
  );

  useEffect(() => {
    const messagesEnd = messagesEndRef.current;
    if (typeof messagesEnd?.scrollIntoView === "function") {
      messagesEnd.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  function selectContact(contact: Participant) {
    const existing = conversations.find(({ participant }) => participant.id === contact.id);
    if (existing) {
      setSelectedConversationId(existing.id);
    } else {
      const conversationId = 104;
      setConversations((current) => [{
        id: conversationId,
        participant: contact,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        lastMessage: null,
      }, ...current]);
      setMessagesByConversation((current) => ({ ...current, [conversationId]: [] }));
      setSelectedConversationId(conversationId);
    }
    setContactSearch("");
  }

  function sendPreviewMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversation) return;
    const message = previewMessage(
      Date.now(),
      selectedConversation.id,
      previewUser,
      selectedConversation.participant,
      body,
      new Date().toISOString(),
    );
    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [...(current[selectedConversation.id] ?? []), message],
    }));
    setConversations((current) => current.map((conversation) =>
      conversation.id === selectedConversation.id
        ? { ...conversation, updatedAt: message.createdAt, lastMessage: message }
        : conversation,
    ));
    setDraft("");
  }

  return (
    <ManagerLayout>
      <main className="manager-messages-page">
        <header className="manager-messages-heading">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Messages</h1>
            <p>Conversations with employees, clerks, and managers.</p>
          </div>
          <span className="message-connection message-connection--connected"><i /> Presentation preview</span>
        </header>
        <p className="message-preview-banner">Sample conversations. Messages you send here stay in this preview and are not delivered.</p>
        <div className="manager-messages-layout">
          <aside className="message-sidebar" aria-label="Conversations and contacts">
            <h2>People you can message</h2>
            <label className="message-search-label" htmlFor="message-contact-search">Filter by name or role</label>
            <input
              id="message-contact-search"
              className="message-search-input"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Filter by name or role"
            />
            <div className="message-contact-results">
              {filteredContacts.map((contact) => (
                <button key={contact.id} type="button" className="message-contact-row" onClick={() => selectContact(contact)}>
                  <span className="message-avatar" aria-hidden="true">{contact.name.slice(0, 1).toUpperCase()}</span>
                  <span className="message-contact-copy"><span>{contact.name}</span><small>{contact.role.toLowerCase()}</small></span>
                  <span className="message-contact-action">Message</span>
                </button>
              ))}
              {filteredContacts.length === 0 ? <p className="message-muted">No permitted contacts found.</p> : null}
            </div>
            <h2>Conversations <span>{conversations.length}</span></h2>
            <div className="message-conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`message-conversation${selectedConversationId === conversation.id ? " active" : ""}`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <span className="message-avatar" aria-hidden="true">{conversation.participant.name.slice(0, 1)}</span>
                  <span className="message-conversation-copy">
                    <strong>{conversation.participant.name}</strong>
                    <small>{conversation.lastMessage?.body ?? conversation.participant.role.toLowerCase()}</small>
                  </span>
                  {conversation.unreadCount ? <span className="message-unread">{conversation.unreadCount}</span> : null}
                </button>
              ))}
            </div>
          </aside>
          <section className="message-thread-panel" aria-label="Message conversation">
            {selectedConversation ? (
              <>
                <header className="message-thread-header">
                  <span className="message-avatar" aria-hidden="true">{selectedConversation.participant.name.slice(0, 1)}</span>
                  <div><h2>{selectedConversation.participant.name}</h2><p>{selectedConversation.participant.role.toLowerCase()}</p></div>
                </header>
                <div className="message-thread" aria-live="polite">
                  {messages.map((message) => {
                    const mine = message.senderId === previewUser.id;
                    return (
                      <article key={message.id} className={`message-bubble${mine ? " mine" : ""}`}>
                        <p>{message.body}</p><small>{formatMessageTime(message.createdAt)}{mine && message.readAt ? " · Read" : ""}</small>
                      </article>
                    );
                  })}
                  {messages.length === 0 ? <p className="message-muted message-empty-thread">No messages yet. Say hello.</p> : null}
                  <div ref={messagesEndRef} />
                </div>
                <form className="message-composer" onSubmit={sendPreviewMessage}>
                  <textarea aria-label="Write a message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" rows={2} />
                  <button type="submit" disabled={!draft.trim()}>Send</button>
                </form>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </ManagerLayout>
  );
}

function ManagerMessagesLive() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [contacts, setContacts] = useState<Participant[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function refreshConversations() {
    const result = await apiFetch<ConversationSummary[]>("/conversations");
    setConversations(Array.isArray(result) ? result : []);
  }

  async function refreshHistory(conversationId: number) {
    const page = await apiFetch<MessagePage>(`/conversations/${conversationId}/messages?limit=50`);
    setMessages((current) => mergeMessages(current, page.messages));
    setNextBeforeId(page.nextBeforeId);
    await apiFetch(`/conversations/${conversationId}/read`, { method: "PATCH" });
    await refreshConversations();
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<CurrentUser>("/me"),
      apiFetch<Participant[]>("/conversations/contacts"),
      apiFetch<ConversationSummary[]>("/conversations"),
    ])
      .then(([currentUser, availableContacts, existingConversations]) => {
        if (!active) return;
        setUser(currentUser);
        setContacts(availableContacts);
        setConversations(existingConversations);
        if (existingConversations.length > 0) {
          setSelectedConversationId(existingConversations[0].id);
          selectedIdRef.current = existingConversations[0].id;
        }
      })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Could not load messages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setNextBeforeId(null);
      return;
    }

    let active = true;
    selectedIdRef.current = selectedConversationId;
    setLoadingHistory(true);
    setMessages([]);
    setNextBeforeId(null);
    setError(null);
    apiFetch<MessagePage>(`/conversations/${selectedConversationId}/messages?limit=50`)
      .then(async (page) => {
        if (!active) return;
        setMessages((current) => mergeMessages(page.messages, current));
        setNextBeforeId(page.nextBeforeId);
        await apiFetch(`/conversations/${selectedConversationId}/read`, { method: "PATCH" });
        await refreshConversations();
      })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : "Could not load conversation.");
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    let active = true;
    let refreshingToken = false;
    const socket = io(API_SOCKET_URL, {
      autoConnect: false,
      auth: { accessToken: "" },
      path: "/socket.io",
    });
    socketRef.current = socket;

    const connect = async () => {
      try {
        const accessToken = await getSocketAccessToken();
        if (!active) return;
        socket.auth = { accessToken };
        socket.connect();
      } catch {
        if (active) setSocketStatus("offline");
      }
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      void refreshConversations();
      if (selectedIdRef.current) void refreshHistory(selectedIdRef.current);
    });
    socket.on("disconnect", () => setSocketStatus("offline"));
    socket.on("connect_error", async () => {
      setSocketStatus("offline");
      if (refreshingToken) return;
      refreshingToken = true;
      try {
        const accessToken = await getSocketAccessToken();
        if (active) {
          socket.auth = { accessToken };
          socket.connect();
        }
      } catch {
        setSocketStatus("offline");
      } finally {
        refreshingToken = false;
      }
    });
    socket.on("message:new", (event: { conversationId: number; message: DirectMessage }) => {
      if (selectedIdRef.current === event.conversationId) {
        setMessages((current) => mergeMessages(current, [event.message]));
      }
      void refreshConversations();
    });
    socket.on("conversation:read", (event: { conversationId: number; readerId: number; readAt: string }) => {
      if (selectedIdRef.current === event.conversationId) {
        setMessages((current) => current.map((message) =>
          message.recipientId === event.readerId ? { ...message, readAt: event.readAt } : message,
        ));
      }
      void refreshConversations();
    });

    void connect();
    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const messagesEnd = messagesEndRef.current;
    if (typeof messagesEnd?.scrollIntoView === "function") {
      messagesEnd.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  async function beginConversation(participantId: number) {
    try {
      setError(null);
      const conversation = await apiFetch<ConversationSummary>("/conversations", {
        method: "POST",
        body: JSON.stringify({ participantId }),
      });
      await refreshConversations();
      setMessages([]);
      setSelectedConversationId(conversation.id);
      selectedIdRef.current = conversation.id;
      setContactSearch("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start conversation.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedConversationId || !body || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await apiFetch<DirectMessage>(`/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((current) => mergeMessages(current, [message]));
      setDraft("");
      await refreshConversations();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function loadOlderMessages() {
    if (!selectedConversationId || !nextBeforeId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await apiFetch<MessagePage>(
        `/conversations/${selectedConversationId}/messages?limit=50&beforeId=${nextBeforeId}`,
      );
      setMessages((current) => mergeMessages(page.messages, current));
      setNextBeforeId(page.nextBeforeId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Older messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  }

  const selectedConversation = conversations.find(({ id }) => id === selectedConversationId) ?? null;
  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.role}`.toLowerCase().includes(contactSearch.trim().toLowerCase()),
  );

  return (
    <ManagerLayout>
      <main className="manager-messages-page">
        <header className="manager-messages-heading">
          <div>
            <p className="manager-kicker">Operations</p>
            <h1>Messages</h1>
            <p>Conversations with employees, clerks, and managers.</p>
          </div>
          <span className={`message-connection message-connection--${socketStatus}`}>
            <i /> {socketStatus === "connected" ? "Live" : socketStatus === "connecting" ? "Connecting" : "Offline"}
          </span>
        </header>

        {error ? <p className="message-error" role="alert">{error}</p> : null}

        <div className="manager-messages-layout">
          <aside className="message-sidebar" aria-label="Conversations and contacts">
            <h2>People you can message</h2>
            <label className="message-search-label" htmlFor="message-contact-search">Filter by name or role</label>
            <input
              id="message-contact-search"
              className="message-search-input"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Filter by name or role"
            />
            <div className="message-contact-results">
              {filteredContacts.map((contact) => (
                <button key={contact.id} type="button" className="message-contact-row" onClick={() => void beginConversation(contact.id)}>
                  <span className="message-avatar" aria-hidden="true">{contact.name.slice(0, 1).toUpperCase()}</span>
                  <span className="message-contact-copy"><span>{contact.name}</span><small>{contact.role.toLowerCase()}</small></span>
                  <span className="message-contact-action">Message</span>
                </button>
              ))}
              {filteredContacts.length === 0 ? <p className="message-muted">No permitted contacts found.</p> : null}
            </div>

            <h2>Conversations <span>{conversations.length}</span></h2>
            {loading ? <p className="message-muted">Loading conversations…</p> : null}
            {!loading && conversations.length === 0 ? (
              <p className="message-muted">No conversations yet. Search for someone to start one.</p>
            ) : null}
            <div className="message-conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`message-conversation${selectedConversationId === conversation.id ? " active" : ""}`}
                  onClick={() => {
                    setMessages([]);
                    setSelectedConversationId(conversation.id);
                  }}
                  aria-current={selectedConversationId === conversation.id ? "true" : undefined}
                >
                  <span className="message-avatar" aria-hidden="true">{conversation.participant.name.slice(0, 1).toUpperCase()}</span>
                  <span className="message-conversation-copy">
                    <strong>{conversation.participant.name}</strong>
                    <small>{conversation.lastMessage?.body ?? conversation.participant.role.toLowerCase()}</small>
                  </span>
                  {conversation.unreadCount > 0 ? <span className="message-unread">{conversation.unreadCount}</span> : null}
                </button>
              ))}
            </div>
          </aside>

          <section className="message-thread-panel" aria-label="Message conversation">
            {selectedConversation ? (
              <>
                <header className="message-thread-header">
                  <span className="message-avatar" aria-hidden="true">
                    {selectedConversation.participant.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{selectedConversation.participant.name}</h2>
                    <p>{selectedConversation.participant.role.toLowerCase()}</p>
                  </div>
                </header>
                <div className="message-thread" aria-live="polite">
                  {nextBeforeId ? (
                    <button type="button" className="message-load-older" onClick={() => void loadOlderMessages()} disabled={loadingOlder}>
                      {loadingOlder ? "Loading…" : "Load older messages"}
                    </button>
                  ) : null}
                  {loadingHistory && messages.length === 0 ? <p className="message-muted">Loading messages…</p> : null}
                  {messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <article key={message.id} className={`message-bubble${mine ? " mine" : ""}`}>
                        <p>{message.body}</p>
                        <small>
                          {formatMessageTime(message.createdAt)}
                          {mine && message.readAt ? " · Read" : ""}
                        </small>
                      </article>
                    );
                  })}
                  {!loadingHistory && messages.length === 0 ? <p className="message-muted message-empty-thread">No messages yet. Say hello.</p> : null}
                  <div ref={messagesEndRef} />
                </div>
                <form className="message-composer" onSubmit={sendMessage}>
                  <textarea
                    aria-label="Write a message"
                    value={draft}
                    maxLength={4000}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message…"
                    rows={2}
                  />
                  <button type="submit" disabled={!draft.trim() || sending}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="message-empty-selection">
                <h2>Choose a conversation</h2>
                <p>Select an existing conversation or search for an employee, clerk, or manager.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </ManagerLayout>
  );
}