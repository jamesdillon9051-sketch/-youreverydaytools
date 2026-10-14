import { errorMessage } from "./browser";

/** A message that names the file and says what to do, not a parser trace. */
export function describePdfFailure(error: unknown, fileName: string) {
  const message = error instanceof Error ? error.message : "";
  if (/encrypted/i.test(message))
    return `"${fileName}" is password-protected. Remove the protection in a PDF viewer, then try again.`;
  // errorMessage rewrites only failures the browser itself reports (memory,
  // unreadable files); report those as such, never as a bad PDF.
  const friendly = errorMessage(error);
  if (friendly !== message) return `"${fileName}": ${friendly}`;
  if (
    /no pdf header|failed to parse|invalid|unexpected|expected instance of|trying to parse/i.test(
      message,
    )
  )
    return `"${fileName}" is not a valid PDF, or the file is damaged.`;
  return `"${fileName}": ${friendly}`;
}
