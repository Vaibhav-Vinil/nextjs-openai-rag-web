import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface DomainRecord {
  id: string;
  domain: string;
  category: string;
  description?: string | null;
  content_types?: string[] | null;
  region?: string | null;
  topics?: string[] | null;
  strengths?: string[] | null;
  avoid_for?: string[] | null;
  reliability_score?: number | null;
}

export interface DomainSelectionConfig {
  max_domains: number;
  preferred_regions: string[];
  exclude_categories: string[];
  enable_semantic_search: boolean;
  weighting_config: {
    brand_mention_weight: number;
    content_type_match_weight: number;
    semantic_similarity_weight: number;
  };
}

export interface DomainSelectionResult {
  domains: DomainRecord[];
  selectedDomainIds: string[];
  stats: {
    totalDomains: number;
  };
  config: DomainSelectionConfig;
  rawResponse?: string;
}

const DEFAULT_SELECTION_CONFIG: DomainSelectionConfig = {
  max_domains: 5,
  preferred_regions: ["Global"],
  exclude_categories: [],
  enable_semantic_search: true,
  weighting_config: {
    brand_mention_weight: 0.4,
    content_type_match_weight: 0.5,
    semantic_similarity_weight: 0.1,
  },
};

const MAX_ALLOWED_DOMAINS = 20;
const DOMAIN_SELECTION_MODEL = "gpt-4-turbo-preview";

const mergeConfig = (
  overrides?: Partial<DomainSelectionConfig>
): DomainSelectionConfig => {
  if (!overrides) {
    return DEFAULT_SELECTION_CONFIG;
  }

  // If max_domains is provided in overrides, use it directly (within limits)
  const max_domains = overrides.max_domains !== undefined
    ? Math.min(Math.max(1, overrides.max_domains), MAX_ALLOWED_DOMAINS)
    : DEFAULT_SELECTION_CONFIG.max_domains;

  return {
    ...DEFAULT_SELECTION_CONFIG,
    ...overrides,
    max_domains, // Use the calculated max_domains value
    weighting_config: {
      ...DEFAULT_SELECTION_CONFIG.weighting_config,
      ...(overrides.weighting_config || {}),
    },
  };
};

const stripCodeFences = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const fenceMatch = trimmed.match(/^```(?:json|javascript|ts|txt)?\s*([\s\S]*?)```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  return trimmed.replace(/^```/, "").replace(/```$/, "").trim();
};

const parseArrayResponse = (content: string): string[] => {
  if (!content) {
    return [];
  }

  const sanitized = stripCodeFences(content);

  if (sanitized.startsWith("[")) {
    return JSON.parse(sanitized);
  }

  const arrayMatch = sanitized.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]);
  }

  const parsed = JSON.parse(sanitized);
  return Array.isArray(parsed) ? parsed : [];
};

const shouldAllowRegion = (
  config: DomainSelectionConfig,
  region: string | null | undefined
) => {
  if (!config.preferred_regions.length) {
    return true;
  }
  if (config.preferred_regions.includes("Global")) {
    return true;
  }
  if (!region) {
    return false;
  }
  return config.preferred_regions.includes(region);
};

const fallbackByReliability = (
  domains: DomainRecord[],
  limit: number,
  alreadySelected: Set<string>
) => {
  return domains
    .filter((domain) => !alreadySelected.has(domain.id))
    .sort(
      (a, b) =>
        (b.reliability_score ?? 0) - (a.reliability_score ?? 0) ||
        b.domain.localeCompare(a.domain)
    )
    .slice(0, limit);
};

export const selectDomainsForQuery = async (
  query: string,
  overrides?: Partial<DomainSelectionConfig>,
  supabaseClient?: SupabaseClient<any>,
  conversationHistory?: any[]
): Promise<DomainSelectionResult> => {
  if (!query?.trim()) {
    return {
      domains: [],
      selectedDomainIds: [],
      stats: { totalDomains: 0 },
      config: mergeConfig(overrides),
    };
  }

  const supabase = supabaseClient ?? (await createClient());

  const BASE_SELECT =
    "id, domain, category, description, content_types, region, topics, strengths, avoid_for";
  const RELIABILITY_COLUMN = "reliability_score";
  const FULL_SELECT = `${BASE_SELECT}, ${RELIABILITY_COLUMN}`;

  let domains: DomainRecord[] | null = null;
  let fetchError: any = null;

  const performSelect = async (columns: string) =>
    supabase.from("domains").select(columns).order("created_at", {
      ascending: false,
    }) as any;

  const result = await performSelect(FULL_SELECT);
  ({ data: domains, error: fetchError } = result);

  if (fetchError && fetchError.code === "42703") {
    console.warn(
      `Column ${RELIABILITY_COLUMN} not found on domains table. Falling back without reliability score.`
    );
    const fallbackResult = await performSelect(BASE_SELECT);
    if (fallbackResult.error) {
      console.error(
        "Error fetching domains for selection (fallback):",
        fallbackResult.error
      );
      throw new Error("Failed to fetch domains");
    }
    domains = (fallbackResult.data || []).map((domain: DomainRecord) => ({
      ...domain,
      reliability_score: null,
    }));
    fetchError = null;
  }

  if (fetchError) {
    console.error("Error fetching domains for selection:", fetchError);
    throw new Error("Failed to fetch domains");
  }

  if (!domains || domains.length === 0) {
    console.warn("No domains available for selection");
    return {
      domains: [],
      selectedDomainIds: [],
      stats: { totalDomains: 0 },
      config: mergeConfig(overrides),
    };
  }

  const selectionConfig = mergeConfig(overrides);
  // Max domains is now properly handled in mergeConfig

  const openaiApiKey = process.env.OPENAI_API_KEY;
  let responseContent: string | undefined;
  let selectedDomainIds: string[] = [];

  if (!openaiApiKey) {
    console.warn(
      "OPENAI_API_KEY not configured. Falling back to reliability-based domain selection."
    );
  } else {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const domainMetadata = domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        category: domain.category,
        description: domain.description,
        content_types: domain.content_types,
        region: domain.region,
        topics: domain.topics,
        strengths: domain.strengths,
        avoid_for: domain.avoid_for,
      }));

      const systemPrompt = `You are an intelligent domain selector that analyzes user queries and conversation context to select the most relevant domains for web search.

Your task:
1. Analyze the user's current query in the context of the full conversation history
2. Review all available domains with their metadata
3. Consider previous interactions to understand user preferences, follow-up intent, and contextual needs
4. Select the most relevant domains based on:
   - Brand or product mentions across the conversation
   - Content type matching (datasheets, news, specs, etc.)
   - Regional relevance
   - Domain strengths and expertise
   - Topics alignment
   - Avoid domains flagged in "avoid_for"
   - Conversation flow and user intent patterns

Context Analysis:
- Look for follow-up questions that reference previous topics
- Identify user preferences expressed earlier in conversation
- Consider technical level and interests demonstrated
- Account for geographic or market context mentioned
- Prioritize domains that have been useful in similar contexts

Selection Rules:
- Maximum ${selectionConfig.max_domains} domains
- Preferred regions: ${selectionConfig.preferred_regions.join(", ") || "None"}
- Exclude categories: ${
        selectionConfig.exclude_categories.join(", ") || "None"
      }

Weighting:
- Brand mention: ${
        selectionConfig.weighting_config.brand_mention_weight
      }
- Content type match: ${
        selectionConfig.weighting_config.content_type_match_weight
      }
- Semantic similarity: ${
        selectionConfig.weighting_config.semantic_similarity_weight
      }
- Conversation context: Enhanced weight for domains relevant to ongoing discussion

Return a JSON array of selected domain IDs in order of relevance, most relevant first.`;

      const userPrompt = `User Query: "${query}"

Conversation History:
${conversationHistory && conversationHistory.length > 0 
  ? conversationHistory.map((msg, index) => 
      `${index + 1}. ${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`
    ).join('\n')
  : 'No previous conversation history'
}

Available Domains:
${JSON.stringify(domainMetadata, null, 2)}

Select the most relevant domains for this query. Consider the conversation context to understand user intent, preferences, and follow-up requirements. Return only a JSON array of domain IDs.`;

      const completion = await openai.chat.completions.create({
        model: DOMAIN_SELECTION_MODEL,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nIMPORTANT: Return a valid JSON array of domain IDs, like: ["id1", "id2"]`,
          },
          {
            role: "user",
            content: `${userPrompt}\n\nReturn a JSON array of domain IDs only.`,
          },
        ],
        temperature: 0.1,
      });

      responseContent = completion.choices[0]?.message?.content || undefined;
      if (responseContent) {
        try {
          selectedDomainIds = parseArrayResponse(responseContent).filter(
            (id) => typeof id === "string"
          );
        } catch (parseError) {
          console.error("Failed to parse domain selection response:", parseError);
        }
      }
    } catch (error) {
      console.error("Domain selection model failed:", error);
    }
  }

  if (!selectedDomainIds.length) {
    selectedDomainIds = fallbackByReliability(
      domains,
      selectionConfig.max_domains,
      new Set()
    ).map((domain) => domain.id);
  }

  const domainMap = new Map(domains.map((domain) => [domain.id, domain]));
  const orderedDomains: DomainRecord[] = [];
  const seenIds = new Set<string>();

  for (const id of selectedDomainIds) {
    if (seenIds.has(id)) {
      continue;
    }
    const domain = domainMap.get(id);
    if (domain) {
      orderedDomains.push(domain);
      seenIds.add(id);
    }
  }

  let selectedDomains = orderedDomains
    .filter(
      (domain) => !selectionConfig.exclude_categories.includes(domain.category)
    )
    .filter((domain) => shouldAllowRegion(selectionConfig, domain.region))
    .slice(0, selectionConfig.max_domains);

  if (selectedDomains.length < selectionConfig.max_domains) {
    const topOff = fallbackByReliability(
      domains,
      selectionConfig.max_domains - selectedDomains.length,
      new Set(selectedDomains.map((domain) => domain.id))
    );
    selectedDomains = [...selectedDomains, ...topOff];
  }

  // Deduplicate and enforce limit
  const uniqueDomainsMap = new Map<string, DomainRecord>();
  for (const domain of selectedDomains) {
    if (!uniqueDomainsMap.has(domain.id)) {
      uniqueDomainsMap.set(domain.id, domain);
    }
    if (uniqueDomainsMap.size >= selectionConfig.max_domains) {
      break;
    }
  }

  const finalDomains = Array.from(uniqueDomainsMap.values());

  return {
    domains: finalDomains,
    selectedDomainIds: finalDomains.map((domain) => domain.id),
    stats: {
      totalDomains: domains.length,
    },
    config: selectionConfig,
    rawResponse: responseContent,
  };
};

export const DEFAULT_DOMAIN_SELECTION_CONFIG = DEFAULT_SELECTION_CONFIG;

