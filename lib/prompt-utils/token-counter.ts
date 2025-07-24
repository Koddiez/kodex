// A simple token counter that approximates token counts
// This is a simplified version that works well enough for most cases
// For production, consider using a proper tokenizer like `gpt-tokenizer`

export function countTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters or 1 token ≈ 0.75 words
  // This is just an estimate and not exact
  if (!text) return 0;
  
  // Count words and characters
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  
  // Return the average of both methods
  return Math.round((wordCount * 0.75 + charCount / 4) / 2);
}

export function truncateToTokenCount(
  text: string, 
  maxTokens: number,
  fromEnd: boolean = false
): string {
  if (!text || maxTokens <= 0) return '';
  
  // Simple truncation - for a real implementation, use a proper tokenizer
  const words = text.split(/\s+/);
  const chars = text.split('');
  
  // Estimate token count based on both methods
  const estimatedTokens = Math.min(
    Math.ceil(words.length * 0.75),
    Math.ceil(chars.length / 4)
  );
  
  if (estimatedTokens <= maxTokens) return text;
  
  // Calculate how much to keep (roughly)
  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio);
  
  if (fromEnd) {
    return '...' + text.slice(-targetLength);
  }
  return text.slice(0, targetLength) + '...';
}
