const SPECIAL_SPACES_REGEX = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g;
const STRIP_CONTROL_REGEX = /[\uFFFC\uFFFD\u2060\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const INLINE_SPACE_REGEX = /[ \t\f\v]+/g;

const SMART_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/\u2026/g, '...'],
];

export function normalizeTextMedium(input: string): string {
  let output = input.replace(/\r\n?/g, '\n');
  output = output.replace(SPECIAL_SPACES_REGEX, ' ');
  output = stripAsciiControlChars(output);
  output = output.replace(STRIP_CONTROL_REGEX, '');

  for (const [pattern, replacement] of SMART_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }

  output = output
    .split('\n')
    .map((line) => line.replace(INLINE_SPACE_REGEX, ' ').trim())
    .join('\n');

  output = output.replace(/\n{3,}/g, '\n\n');
  return output.trim();
}

export function normalizeInlineText(input: string): string {
  return normalizeTextMedium(input).replace(/\n+/g, ' ').trim();
}

export function collapseBlankLines(lines: string[]): string[] {
  const collapsed: string[] = [];

  for (const line of lines) {
    if (line.length === 0 && (collapsed.length === 0 || collapsed.at(-1) === '')) {
      continue;
    }
    collapsed.push(line);
  }

  while (collapsed.at(-1) === '') {
    collapsed.pop();
  }

  return collapsed;
}

function stripAsciiControlChars(input: string): string {
  let result = '';

  for (let index = 0; index < input.length; index += 1) {
    const charCode = input.charCodeAt(index);
    const isLowControl = charCode <= 0x1f && charCode !== 0x0a;
    const isHighControl = charCode >= 0x7f && charCode <= 0x9f;

    if (isLowControl || isHighControl) {
      continue;
    }

    result += input[index];
  }

  return result;
}
