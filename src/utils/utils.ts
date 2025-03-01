/**
 * Strips ANSI color codes from a string
 * @param {string} str - The string containing ANSI color codes
 * @returns {string} The string without ANSI color codes
 */
export function stripAnsiCodes(str: string): string {
    return str.replace(/\u001b\[\d+m/g, '');
}
