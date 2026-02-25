import { randomUUID } from "node:crypto";

const USER_AGENT = "spritz-mcp-server/0.1.0";
const ORIGIN = "https://mcp.spritz.finance";
const SESSION_TTL_MS = 15 * 60 * 1000;

export class SpritzClient {
  private apiKey: string;
  private baseUrl: string;
  private sessionId: string;
  private sessionCreatedAt: number;

  constructor() {
    this.apiKey = process.env.SPRITZ_API_KEY || "";
    this.baseUrl =
      process.env.SPRITZ_API_BASE_URL || "https://platform.spritz.finance";
    this.sessionId = randomUUID();
    this.sessionCreatedAt = Date.now();

    if (!this.apiKey) {
      throw new Error("SPRITZ_API_KEY must be set in environment variables");
    }
  }

  private getSessionId(): string {
    if (Date.now() - this.sessionCreatedAt >= SESSION_TTL_MS) {
      this.sessionId = randomUUID();
      this.sessionCreatedAt = Date.now();
    }
    return this.sessionId;
  }

  async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ) {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Origin: ORIGIN,
        "session-id": this.getSessionId(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Spritz API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    if (response.status === 204) return undefined;
    return response.json();
  }
}
