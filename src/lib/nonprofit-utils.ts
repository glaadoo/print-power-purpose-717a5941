import { supabase } from "@/integrations/supabase/client";

export type DuplicateWarning = {
  type: 'exact_ein' | 'similar_name';
  message: string;
  matches: Array<{ id: string; name: string; ein?: string }>;
};

/**
 * Check for duplicate nonprofits by EIN and similar names
 * Returns warnings if duplicates are found
 */
export async function checkDuplicates(
  name: string,
  ein?: string
): Promise<DuplicateWarning[]> {
  const warnings: DuplicateWarning[] = [];

  // Check exact EIN match
  if (ein) {
    const { data: exactEIN } = await supabase
      .from('nonprofits')
      .select('id, name, ein')
      .eq('ein', ein)
      .limit(5);

    if (exactEIN && exactEIN.length > 0) {
      warnings.push({
        type: 'exact_ein',
        message: `Found ${exactEIN.length} nonprofit(s) with matching EIN`,
        matches: exactEIN,
      });
    }
  }

  // Check similar names using trigram similarity
  const searchName = name.trim().toLowerCase();
  const { data: similarNames } = await supabase
    .from('nonprofits')
    .select('id, name, ein')
    .ilike('indexed_name', `%${searchName}%`)
    .neq('name', name) // Exclude exact matches
    .limit(5);

  if (similarNames && similarNames.length > 0) {
    warnings.push({
      type: 'similar_name',
      message: `Found ${similarNames.length} nonprofit(s) with similar names`,
      matches: similarNames,
    });
  }

  return warnings;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return ((longer.length - distance) / longer.length) * 100;
}
