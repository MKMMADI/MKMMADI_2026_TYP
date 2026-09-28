import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerMessages from "./ManagerMessages";
import { apiFetch, getSocketAccessToken } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  API_SOCKET_URL: "http://localhost:4000",
  apiFetch: vi.fn(),
  getSocketAccessToken: vi.fn().mockResolvedValue("manager-token"),
}));
vi.mock("@/components/ManagerLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => {
    const socket = {
      auth: {},
      listeners: {} as Record<string, (event?: any) => void>,
      on(event: string, listener: (event?: any) => void) {
        this.listeners[event] = listener;
        return this;
      },
      connect() {
        this.listeners.connect?.();
      },
      disconnect: vi.fn(),
    };
    (globalThis as typeof globalThis & { __managerMessageSocket?: typeof socket }).__managerMessageSocket = socket;
    return socket;
  }),
}));

const mockedApiFetch = vi.mocked(apiFetch);
const currentUser = { id: 8, name: "Manager Mina", email: "mina@example.com", role: "MANAGER" as const };
const employee = { id: 9, name: "Employee Evan", role: "EMPLOYEE" as const };
const conversation = {
  id: 4,
  participant: employee,
  createdAt: "2026-09-28T08:00:00.000Z",
  updatedAt: "2026-09-28T08:01:00.000Z",
  unreadCount: 1,
  lastMessage: null,
};
const firstMessage = {
  id: 31,
  conversationId: 4,
  senderId: 9,
  recipientId: 8,
  body: "Please approve the room setup",
  createdAt: "2026-09-28T08:01:00.000Z",
  readAt: null,
  sender: employee,
  recipient: { ...currentUser },
};

describe("ManagerMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as typeof globalThis & { __managerMessageSocket?: unknown }).__managerMessageSocket;
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/me") return currentUser as never;
      if (path === "/conversations/contacts") return [employee] as never;
      if (path === "/conversations") return [conversation] as never;
      if (path === "/conversations/4/messages?limit=50") {
        return { messages: [firstMessage], nextBeforeId: null } as never;
      }
      if (path === "/conversations/4/read") return { markedRead: 1 } as never;
      if (path === "/conversations" && mockedApiFetch.mock.calls.length > 0) return [conversation] as never;
      if (path === "/conversations/4/messages") return { ...firstMessage, id: 32, senderId: 8 } as never;
      return [] as never;
    });
    vi.mocked(getSocketAccessToken).mockResolvedValue("manager-token");
  });

  it("loads conversation history, sends messages, and renders socket updates", async () => {
    render(
      <MemoryRouter>
        <ManagerMessages />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Please approve the room setup")).toBeTruthy();
    expect(screen.getAllByText("Employee Evan")).toHaveLength(2);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Write a message"), { target: { value: "I will check it" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith(
      "/conversations/4/messages",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ body: "I will check it" }) }),
    ));

    const socket = (globalThis as typeof globalThis & {
      __managerMessageSocket?: { listeners: Record<string, (event?: any) => void> };
    }).__managerMessageSocket;
    expect(socket).toBeTruthy();
    socket?.listeners["message:new"]?.({
      conversationId: 4,
      message: { ...firstMessage, id: 33, body: "Live manager update" },
    });
    expect(await screen.findByText("Live manager update")).toBeTruthy();
  });
});