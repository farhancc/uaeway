/**
 * Landing a door's vocabulary inside the pack behind it.
 *
 * A `subject` door's phrases exist to get a visitor through the door. They are
 * not phrases of anything *inside* the pack, so a message that matched the
 * door could then match nothing — and `lib/chat/flow/serve.ts` walks a miss
 * back out to the main flow's fallback, which is the model. Measured on the
 * own-work pack before this existed: 51 of its 88 door phrasings produced a
 * paid, hedged reply to a question the pack had a written answer for, and
 * nothing anywhere reported it.
 *
 * The obvious fix — copy the door's list onto the pack's hub — is wrong on its
 * own, and the tests caught it immediately. A hub is authored first and
 * `matchByPhrase` walks candidates in order, so a phrase copied onto the hub
 * takes it away from the specific entry that already had it: "should I make a
 * will here" stopped reaching the will answer and started reaching the menu.
 * Forty phrasings moved that way in one edit.
 *
 * So the landing is **computed, not copied**. Only the phrasings no other
 * entry in the pack already claims go onto the hub; the rest were never the
 * problem, because they were already answered. Computed rather than curated
 * because the right subset changes every time an entry is added, and a curated
 * list would be correct on the day it was written and wrong a month later.
 */

import { foldText } from "../../lib/text";
import type { AuthoredFlow } from "../../lib/chat/flow/authored";

/**
 * Adds to `hubId` the door phrasings nothing else in `flows` answers.
 *
 * Mutates, and is called at module scope on a pack's own array before it is
 * exported — the alternative is threading a second list through every entry
 * that might need one.
 */
export function landDoorPhrases(
  flows: AuthoredFlow[],
  hubId: string,
  doorPhrases: string[],
): void {
  const hub = flows.find((f) => f.id === hubId);
  if (!hub) throw new Error(`landDoorPhrases: no entry "${hubId}" to land on`);

  // Everything every *other* entry already answers, folded the way the matcher
  // folds it so "Should I make a will here?" and the lower-case form are one.
  const claimed = new Set(
    flows
      .filter((f) => f.id !== hubId)
      .flatMap((f) => [f.question, ...f.phrases])
      .map(foldText),
  );

  hub.phrases = [
    ...new Set([...hub.phrases, ...doorPhrases.filter((p) => !claimed.has(foldText(p)))]),
  ];
}
