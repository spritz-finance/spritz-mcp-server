export class SpritzClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SPRITZ_API_KEY || "";
    this.baseUrl =
      process.env.SPRITZ_API_BASE_URL || "https://platform.spritz.finance";

    if (!this.apiKey) {
      throw new Error("SPRITZ_API_KEY must be set in environment variables");
    }
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
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Spritz API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }
}
