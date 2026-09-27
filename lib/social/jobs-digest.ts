import { listJobs } from "../content/queries";
import { SITE } from "../site";

/**
 * Ready-to-paste text for wherever the day's openings get posted.
 *
 * Carried over from the prototype's script, now reading approved jobs from the
 * database rather than a JSON file. It deliberately produces text for a person
 * to post rather than posting by itself — a human glance before a broadcast
 * goes out is worth having, and no channel worth posting to has an API that
 * would make it automatic anyway.
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
    "Applying for a job in the UAE? Most employers need your degree and experience certificates translated and attested before a work permit is issued. Ask our assistant what your document needs and who can do it.",
  );
  lines.push(`${SITE.url}/en/services/attestation`);
  lines.push("");
  lines.push("Never pay a fee to be given a job.");

  return lines.join("\n");
}
