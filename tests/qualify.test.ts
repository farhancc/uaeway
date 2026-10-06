import { describe, expect, it } from "vitest";
import {
  acceptValue,
  collected,
  isQualified,
  missingRequired,
  nextRequired,
} from "@/lib/chat/qualify/engine";
import { serviceDefinition, type QualificationField } from "@/lib/chat/qualify/schema";

/**
 * What counts as a lead.
 *
 * Pure on purpose: this decides whether a conversation is worth a salesperson's
 * time, so the rules are tested without a database, a model or a browser.
 */

const field = (over: Partial<QualificationField>): QualificationField => ({
  key: "f",
  label: "Field",
  question: "What?",
  type: "text",
  required: true,
  options: [],
  order: 50,
  ...over,
});

const attestation = serviceDefinition.parse({
  serviceId: "attestation",
  name: "Certificate Attestation",
  fields: [
    {
      key: "document_type",
      label: "Document",
      question: "What needs attesting?",
      type: "enum",
      options: ["Degree or diploma certificate", "Marriage certificate"],
      order: 10,
    },
    { key: "issuing_country", label: "Country", question: "Which country issued it?", type: "country", order: 20 },
    { key: "purpose", label: "Purpose", question: "What is it for?", type: "text", required: false, order: 30 },
    { key: "phone", label: "Phone", question: "What number can we call?", type: "phone", order: 90 },
  ],
});

describe("accepting an answer", () => {
  it("takes a choice the visitor half-typed", () => {
    const f = field({ type: "enum", options: ["Degree or diploma certificate", "Marriage certificate"] });
    expect(acceptValue(f, "degree")).toEqual({ value: "Degree or diploma certificate" });
    expect(acceptValue(f, "MARRIAGE CERTIFICATE")).toEqual({ value: "Marriage certificate" });
  });

  it("names the options when the answer is none of them", () => {
    const f = field({ type: "enum", options: ["A", "B"] });
    expect(acceptValue(f, "something else")).toEqual({ error: "Please pick one of: A, B." });
  });

  // Three spellings of one country must become one lead field, or the CRM
  // reports three markets where there is one.
  it("folds the spellings of a country together", () => {
    const f = field({ type: "country" });
    for (const raw of ["India", "india", "IN", "Indian"]) {
      expect(acceptValue(f, raw)).toEqual({ value: "India" });
    }
    expect(acceptValue(f, "dubai")).toEqual({ value: "United Arab Emirates" });
  });

  // Rejecting an unlisted country to tidy a string would turn away a customer.
  it("keeps a country it has never heard of", () => {
    expect(acceptValue(field({ type: "country" }), "bhutan")).toEqual({ value: "Bhutan" });
  });

  it("normalises a phone number the way the lead form does", () => {
    const f = field({ type: "phone" });
    expect(acceptValue(f, "+971 50 123 4567")).toEqual({ value: "971501234567" });
    expect(acceptValue(f, "050 123 4567")).toEqual({ value: "971501234567" });
    expect(acceptValue(f, "hello")).toMatchObject({ error: expect.stringContaining("reach you") });
  });

  it("checks an email looks like one", () => {
    const f = field({ type: "email" });
    expect(acceptValue(f, "Ahmed@Example.com ")).toEqual({ value: "ahmed@example.com" });
    expect(acceptValue(f, "ahmed at example")).toMatchObject({ error: expect.any(String) });
  });

  it("refuses an empty answer whatever the type", () => {
    expect(acceptValue(field({}), "   ")).toMatchObject({ error: expect.any(String) });
  });
});

describe("what to ask next", () => {
  it("asks required fields in their own order", () => {
    expect(nextRequired(attestation, {})?.key).toBe("document_type");
    expect(nextRequired(attestation, { document_type: "Degree" })?.key).toBe("issuing_country");
  });

  // The one ordering decision worth being deliberate about: asking for a number
  // before anything useful has been said is how a conversation ends.
  it("leaves the phone number until last", () => {
    const known = { document_type: "Degree", issuing_country: "India" };
    expect(nextRequired(attestation, known)?.key).toBe("phone");
  });

  // Every question is a chance for the conversation to end. Spending one on a
  // field we already decided was not needed trades a lead for a nicety.
  it("never asks an optional field", () => {
    const known = { document_type: "Degree", issuing_country: "India", phone: "971501234567" };
    expect(nextRequired(attestation, known)).toBeNull();
    expect(missingRequired(attestation, known)).toEqual([]);
  });
});

describe("qualified", () => {
  it("is false until every required field has a value", () => {
    expect(isQualified(attestation, {})).toBe(false);
    expect(isQualified(attestation, { document_type: "Degree", issuing_country: "India" })).toBe(false);
  });

  it("is true with the required fields and no optional one", () => {
    expect(
      isQualified(attestation, {
        document_type: "Degree",
        issuing_country: "India",
        phone: "971501234567",
      }),
    ).toBe(true);
  });
});

describe("what reaches the lead", () => {
  it("takes this service's fields and nothing else the conversation collected", () => {
    const known = {
      document_type: "Degree",
      issuing_country: "India",
      service_id: "attestation",
      something_else: "noise",
    };
    expect(collected(attestation, known)).toEqual({
      document_type: "Degree",
      issuing_country: "India",
    });
  });
});

describe("the definition itself", () => {
  it("refuses a choice field with no options", () => {
    const result = serviceDefinition.safeParse({
      serviceId: "x",
      name: "X",
      fields: [{ key: "a", label: "A", question: "A?", type: "enum" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuses two fields on one key", () => {
    const result = serviceDefinition.safeParse({
      serviceId: "x",
      name: "X",
      fields: [
        { key: "a", label: "A", question: "A?", type: "text" },
        { key: "a", label: "B", question: "B?", type: "text" },
      ],
    });
    expect(result.success).toBe(false);
  });
});
