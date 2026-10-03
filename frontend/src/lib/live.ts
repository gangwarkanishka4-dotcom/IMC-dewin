import type { LivePerson } from "@/lib/api";

// Placeholder labels that mean "not identified". An unrecognised person gets
// no overlay at all; this guards against one of these arriving as a name.
const NON_IDENTITY_LABELS = new Set([
  "unknown",
  "person",
  "unidentified",
  "face",
  "no match",
  "no_match",
]);

/** The name to show for a detection, or null when face recognition hasn't
 * confidently identified them — in which case nothing is drawn. */
export function recognizedName(p: LivePerson): string | null {
  if (!p.employee_id) return null;
  const name = p.name?.trim() ?? "";
  if (!name || NON_IDENTITY_LABELS.has(name.toLowerCase())) return null;
  return name;
}
