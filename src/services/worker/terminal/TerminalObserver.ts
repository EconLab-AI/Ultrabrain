export class TerminalObserver {
  extractCommand(data: string): string | null {
    const match = data.match(/[\$#>]\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
}
