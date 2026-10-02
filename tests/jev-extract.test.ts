import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two constrained model calls.
 *
 * Both exist to do one narrow thing and to be untrusted afterwards: JEV must
 * return one of a list we gave it, and extraction's every value passes the same
 * validator a typed answer does. These tests are mostly about what happens when
 * the model does not cooperate — which is the case that reaches a customer.
 */

const generateJSON = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({ generateJSON }));

const { chooseIntent } = await import("@/lib/chat/flow/jev");
const { extractFields } = await import("@/lib/chat/qualify/extract");
const { qualificationField } = await import("@/lib/chat/qualify/schema");

const field = (over: Record<string, unknown>) =>
  qualificationField.parse({ key: "k", label: "L", question: "Q?", type: "text", ...over });

const topics = [
  { id: "translation", name: "legal translation", phrases: [], hintKeywords: [] },
  { id: "attestation", name: "certificate attestation", phrases: [], hintKeywords: [] },
  { id: "notary", name: "notarisation", phrases: [], hintKeywords: [] },
];

beforeEach(() => generateJSON.mockReset());

describe("JEV", () => {
  it("returns the intent behind the number it picked", async () => {
    generateJSON.mockResolvedValue({ choice: 2 });
    expect(await chooseIntent("make my papers legal for Dubai", topics)).toBe("attestation");
  });

  it("takes 0 as none of them", async () => {
    generateJSON.mockResolvedValue({ choice: 0 });
    expect(await chooseIntent("what is the weather", topics)).toBeNull();
  });

  // The point of the list: a model that answers outside it has not chosen, and
  // treating an invented option as a choice is how a visitor is routed to a
  // service that does not exist.
  it("refuses a number that is not on the list", async () => {
    generateJSON.mockResolvedValue({ choice: 9 });
    expect(await chooseIntent("anything", topics)).toBeNull();
  });

  it("refuses a reply of the wrong shape", async () => {
    for (const reply of [null, {}, { choice: "attestation" }, { intent: 1 }, "2"]) {
      generateJSON.mockResolvedValue(reply);
      expect(await chooseIntent("anything", topics)).toBeNull();
    }
  });

  // Not a choice, and not worth a call.
  it("does not call the model for fewer than two candidates", async () => {
    expect(await chooseIntent("anything", topics.slice(0, 1))).toBeNull();
    expect(generateJSON).not.toHaveBeenCalled();
  });
});

describe("extraction", () => {
  const missing = [
    field({ key: "issuing_country", label: "Country", type: "country" }),
    field({ key: "current_location", label: "Location", type: "country" }),
    field({ key: "phone", label: "Phone", type: "phone" }),
  ];

  it("takes several answers out of one sentence", async () => {
    generateJSON.mockResolvedValue({ issuing_country: "india", current_location: "Dubai" });
    expect(
      await extractFields("I'm from India and I'm currently in Dubai for a job", missing),
    ).toEqual({ issuing_country: "India", current_location: "United Arab Emirates" });
  });

  // Extraction earns no special trust: a field the model guessed wrong is a
  // salesperson calling the wrong number.
  it("puts every value through the same validator a typed one passes", async () => {
    generateJSON.mockResolvedValue({ phone: "not sure yet", issuing_country: "India" });
    expect(await extractFields("I am not sure about my number, I am from India", missing)).toEqual({
      issuing_country: "India",
    });
  });

  it("ignores keys that were not asked for", async () => {
    generateJSON.mockResolvedValue({ issuing_country: "India", service: "attestation", price: "500" });
    expect(await extractFields("my degree is from India and I need it attested", missing)).toEqual({
      issuing_country: "India",
    });
  });

  it("ignores anything that is not a string", async () => {
    generateJSON.mockResolvedValue({ issuing_country: ["India"], current_location: 5 });
    expect(await extractFields("my degree is from India and I live here", missing)).toEqual({});
  });

  it("returns nothing when the model fails", async () => {
    generateJSON.mockResolvedValue(null);
    expect(await extractFields("I'm from India and currently in Dubai", missing)).toEqual({});
  });

  // With one field left the question we are about to ask collects it for
  // nothing, and a short message holds one fact at most.
  it("does not call the model when it could not save a question", async () => {
    expect(await extractFields("I am from India and live in Dubai", missing.slice(0, 1))).toEqual({});
    expect(await extractFields("India", missing)).toEqual({});
    expect(generateJSON).not.toHaveBeenCalled();
  });
});
