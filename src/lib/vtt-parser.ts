/**
 * Parses a WebVTT (.vtt) file into plain readable transcript text,
 * preserving speaker identities which are critical for the AI grounding rules.
 *
 * What is STRIPPED (pure noise, no value to DCS agents):
 *   - WEBVTT header line
 *   - NOTE / STYLE / REGION metadata blocks
 *   - Timestamp lines  (00:00:01.000 --> 00:00:04.500)
 *   - Cue sequence numbers (bare integers)
 *   - Inline timestamp tags <00:00:01.234>
 *   - Formatting tags <b>, <i>, <u>, <c.color>, etc.
 *
 * What is PRESERVED and CONVERTED (critical for speaker filtering):
 *   - <v Speaker Name>dialogue</v>  →  "Speaker Name: dialogue"
 *   - <v Speaker Name>dialogue      →  "Speaker Name: dialogue"  (unclosed tag)
 *   - Plain cue text with no voice tag is kept as-is
 *
 * Speaker identity is required by:
 *   - Router Agent  : filters workloads to customer-only mentions
 *   - Slicer Agent  : Stage 1 removes MongoDB employee lines
 *   - Commercial Agent : excludes MongoDB personnel from stakeholder map
 *   - MongoDB Contribution Analyst : identifies MongoDB team dialogue
 */
export function parseVTT(vttContent: string): string {
  const lines = vttContent.split(/\r?\n/);
  const outputLines: string[] = [];

  // Timestamp line: hh:mm:ss.mmm --> hh:mm:ss.mmm (with optional positioning after arrow)
  const TIMESTAMP_RE = /^\d{1,2}:\d{2}[:.]\d{2,3}\s*-->/;

  // Bare cue sequence number: whole line is a positive integer
  const SEQUENCE_NUM_RE = /^\d+\s*$/;

  // Block-level headers whose content should be skipped until next blank line
  const BLOCK_HEADER_RE = /^(NOTE|STYLE|REGION)\b/;

  let skipUntilBlank = false;
  let seenWebvttHeader = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip until the WEBVTT header is found
    if (!seenWebvttHeader) {
      if (line.startsWith('WEBVTT')) seenWebvttHeader = true;
      continue;
    }

    // Skip NOTE / STYLE / REGION blocks
    if (BLOCK_HEADER_RE.test(line)) {
      skipUntilBlank = true;
      continue;
    }
    if (skipUntilBlank) {
      if (line === '') skipUntilBlank = false;
      continue;
    }

    // Skip timestamp lines
    if (TIMESTAMP_RE.test(line)) continue;

    // Skip bare sequence numbers
    if (SEQUENCE_NUM_RE.test(line)) continue;

    // Blank line — keep one for readability but collapse consecutive blanks
    if (line === '') {
      if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
        outputLines.push('');
      }
      continue;
    }

    // Process the cue text line, preserving speaker identity
    const cleaned = processCueLine(line);
    if (cleaned) outputLines.push(cleaned);
  }

  // Trim leading/trailing blank lines
  let start = 0;
  let end = outputLines.length - 1;
  while (start <= end && outputLines[start] === '') start++;
  while (end >= start && outputLines[end] === '') end--;

  return outputLines.slice(start, end + 1).join('\n');
}

/**
 * Processes a single VTT cue text line.
 *
 * Priority:
 * 1. Convert <v Speaker>text</v> → "Speaker: text"   (speaker identity preserved)
 * 2. Strip inline timestamp cues <00:00:01.234>
 * 3. Strip any remaining HTML-like markup tags
 * 4. Decode common HTML entities
 */
function processCueLine(line: string): string {
  let result = line;

  // <v Speaker Name>dialogue text</v>  →  "Speaker Name: dialogue text"
  result = result.replace(
    /<v\s+([^>]+)>([\s\S]*?)<\/v>/gi,
    (_, speaker, text) => `${speaker.trim()}: ${text.trim()}`
  );

  // <v Speaker Name>dialogue text  (unclosed — common in real-world VTT files)
  result = result.replace(
    /<v\s+([^>]+)>([\s\S]*)/gi,
    (_, speaker, text) => `${speaker.trim()}: ${text.trim()}`
  );

  // Remove inline timestamp tags e.g. <00:00:01.234>
  result = result.replace(/<\d{1,2}:\d{2}[:.]\d{2,3}>/g, '');

  // Remove remaining HTML-like tags (<b>, <i>, <c.green>, <ruby>, etc.)
  result = result.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  return result.trim();
}
