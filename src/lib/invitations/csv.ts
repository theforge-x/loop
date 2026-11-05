import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
const optionalId = z.union([z.uuid(), z.literal("")]).default("");
const rowSchema = z.object({
  guest_id: optionalId, group_id: optionalId,
  group_name: z.string().trim().max(200).default(""),
  group_allowance: z.string().trim().regex(/^$|^[1-9][0-9]{0,3}$/).refine(value => !value || Number(value) <= 1000).default(""),
  guest_name: z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/),
  email: z.union([z.email().max(320), z.literal("")]).default(""),
}).strict().refine(row => row.group_id || row.group_name, "Each row needs a group ID or name.");
export type GuestImportRow = z.infer<typeof rowSchema>;
export const csvColumns = ["guest_id", "group_id", "group_name", "group_allowance", "guest_name", "email"] as const;
export function parseGuestCsv(text: string): GuestImportRow[] {
  if (Buffer.byteLength(text, "utf8") > 2097152) throw new Error("CSV files must be at most 2 MiB.");
  const records: unknown = parse(text, { columns: true, bom: true, trim: true, skip_empty_lines: true, max_record_size: 10000 });
  const result = z.array(rowSchema).min(1).max(1000).safeParse(records);
  if (!result.success) throw new Error("Use the CSV template columns, valid names/emails, and allowances from 1 to 1000; import at most 1000 rows.");
  const ids = result.data.map(row => row.guest_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error("A guest ID appears more than once.");
  return result.data;
}
export function exportGuestCsv(rows: GuestImportRow[]) {
  return stringify(rows, { header: true, columns: [...csvColumns], bom: true, escape_formulas: true, record_delimiter: "\r\n" });
}
