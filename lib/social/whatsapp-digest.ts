import { listJobs } from "../content/queries";
import { SITE, whatsappNumber } from "../site";

/**
 * Ready-to-paste text for the WhatsApp Channel.
 *
 * Carried over from the prototype's script, now reading approved jobs from the
 * database rather than a JSON file. It deliberately produces text for a person
 * to post rather than posting by itself: WhatsApp Channels have no publishing
 * API, and a human glance before posting is worth having anyway.
 */
export async function buildDigest(limit = 5): Promise<string | null> {
  const jobs = await listJobs({ limit });
  if (jobs.length === 0) return null;

  const lines = [`*${SITE.name} — today's openings*`, ""];

  jobs.forEach((job, i) => {
    lines.push(`${i + 1}. *${job.title}*`);
    if (job.emirate) lines.push(`${job.emirate}${job.company ? ` · ${job.company}` : ""}`);
    if (job.summary) lines.push(job.summary);
    lines.push(`${SITE.url}/en/jobs/${job.slug}`);
    lines.push("");
  });

  lines.push("——————————————");
  lines.push(
    "Applying for a job in the UAE? Most employers need your degree and experience certificates translated and attested before a work permit is issued. Send us the document and we will tell you what it needs and who can do it.",
  );

  const number = whatsappNumber();
  if (number) lines.push(`https://wa.me/${number}`);
  lines.push("");
  lines.push("Never pay a fee to be given a job.");

  return lines.join("\n");
}
