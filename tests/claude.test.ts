import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateJSON, generateText } from "@/lib/ai/claude";

/**
 * The Claude client is the drafting pipeline's only dependency on the network,
 * so what matters is: a tool-use response yields the tool's input untouched, a
 * missing key or a dead API degrades to null rather than throwing, and a
 * malformed-request error is not retried three times for nothing.
 */

const toolUseOk = (input: unknown) =>
  new Response(
    JSON.stringify({ content: [{ type: "tool_use", name: "respond", input }], stop_reason: "tool_use" }),
    { status: 200 },
  );

const textOk = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: 200 });

const overloaded = () =>
  new Response(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }), {
    status: 529,
  });

const badRequest = () =>
  new Response(
    JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad model" } }),
    { status: 400 },
  );

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("structured output", () => {
  it("returns the tool call's input as the result", async () => {
    fetchMock.mockResolvedValueOnce(toolUseOk({ title: "Hello", body_md: "Body" }));

    const result = await generateJSON<{ title: string; body_md: string }>("write something");
    expect(result).toEqual({ title: "Hello", body_md: "Body" });
  });

  it("forces the tool call rather than trusting free text", async () => {
    fetchMock.mockResolvedValueOnce(toolUseOk({ ok: true }));
    await generateJSON("write something");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tool_choice).toEqual({ type: "tool", name: "respond" });
  });

  it("returns null when the model replies without calling the tool", async () => {
    fetchMock.mockResolvedValueOnce(textOk("I'd rather just answer directly."));
    expect(await generateJSON("write something")).toBeNull();
  });
});

describe("missing configuration", () => {
  it("degrades to null instead of throwing when there is no key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await generateJSON("write something")).toBeNull();
    expect(await generateText("write something")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("failure handling", () => {
  it("retries an overloaded response and succeeds on the next attempt", async () => {
    fetchMock.mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(toolUseOk({ ok: true }));
    const result = await generateJSON("write something");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request that is wrong however many times it is sent", async () => {
    fetchMock.mockResolvedValue(badRequest());
    expect(await generateJSON("write something")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after repeated failures rather than retrying forever", async () => {
    fetchMock.mockResolvedValue(overloaded());
    expect(await generateJSON("write something")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("plain text", () => {
  it("joins text blocks and trims the result", async () => {
    fetchMock.mockResolvedValueOnce(textOk("  hello there  "));
    expect(await generateText("say hi")).toBe("hello there");
  });
});
