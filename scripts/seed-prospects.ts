/**
 * Loads data/dubai-b2b-leads.csv into the `prospects` table.
 *
 * This is an outbound research list for individual, relevant approaches to
 * businesses that plausibly need company documents, translations or a website.
 * It is not a mailing list: bulk unsolicited messaging would breach UAE
 * anti-spam rules and would not work anyway.
 *
 * Run: npm run seed:prospects
 */

import { readFileSync } from "fs";
import path from "path";
import { supabaseAdmin } from "../lib/supabase/admin";

/** Minimal CSV reader that respects quoted fields containing commas — the maps
 *  links in this file are quoted and contain them. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.trim());
    if (row.some((c) => c !== "")) rows.push(row);
  }

  return rows;
}

async function main() {
  const file = path.join(process.cwd(), "data", "dubai-b2b-leads.csv");
  const [header, ...rows] = parseCsv(readFileSync(file, "utf-8"));
  console.log(`Read ${rows.length} rows (columns: ${header.join(", ")})`);

  const records = rows
    .map(([business_name, category, phone, website, area, street, maps_link]) => ({
      business_name: business_name?.trim(),
      category: category?.trim() || null,
      phone: phone?.replace(/\s+/g, "") || null,
      website: website?.trim() || null,
      area: area?.trim() || null,
      street: street?.trim() || null,
      maps_link: maps_link?.trim() || null,
    }))
    .filter((r) => r.business_name);

  const { data, error } = await supabaseAdmin()
    .from("prospects")
    .upsert(records, { onConflict: "business_name,phone", ignoreDuplicates: true })
    .select("id");

  if (error) throw new Error(error.message);
  console.log(`Inserted ${data?.length ?? 0} new prospects.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
