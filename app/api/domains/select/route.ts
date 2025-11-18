import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface Domain {
  id: string;
  domain: string;
  category: string;
  description: string;
  content_types: string[];
  region: string;
  topics: string[];
  strengths: string[];
  avoid_for: string[];
}

interface SelectionConfig {
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

export async function POST(request: NextRequest) {
  try {
    const { query, config }: { query: string; config: SelectionConfig } = await request.json();

    if (!query || !config) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Fetch domains from the database
    const supabase = await createClient();
    const { data: domains, error } = await supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching domains:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    if (!domains || domains.length === 0) {
      console.warn('No domains found in database');
      return NextResponse.json([]);
    }

    console.log(`Fetched ${domains.length} domains from database`);

    // Prepare domain metadata for GPT analysis
    const domainMetadata = domains.map((domain: any) => ({
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

    // Create the system prompt for domain selection
    const systemPrompt = `You are an intelligent domain selector that analyzes user queries and selects the most relevant domains for web search.

Your task:
1. Analyze the user query to understand intent and requirements
2. Review all available domains with their metadata
3. Select the most relevant domains based on:
   - Brand or product mentions in the query
   - Content type matching (datasheets, news, specs, etc.)
   - Regional relevance
   - Domain strengths and expertise
   - Topics alignment
   - Avoid domains flagged in "avoid_for"

Selection Rules:
- Maximum ${config.max_domains} domains
- Preferred regions: ${config.preferred_regions.join(', ')}
- Exclude categories: ${config.exclude_categories.join(', ') || 'None'}

Weighting:
- Brand mention: ${config.weighting_config.brand_mention_weight}
- Content type match: ${config.weighting_config.content_type_match_weight}
- Semantic similarity: ${config.weighting_config.semantic_similarity_weight}

Return a JSON array of selected domain IDs in order of relevance, most relevant first.`;

    // Create the user prompt with domain metadata
    const userPrompt = `User Query: "${query}"

Available Domains:
${JSON.stringify(domainMetadata, null, 2)}

Select the most relevant domains for this query. Return only a JSON array of domain IDs.`;

    // Call GPT-4-turbo for domain selection (has 128k context window)
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: systemPrompt + "\n\nIMPORTANT: Return a valid JSON array of domain IDs, like: [\"id1\", \"id2\", \"id3\"]" 
        },
        { 
          role: "user", 
          content: userPrompt + "\n\nReturn a JSON array of domain IDs only, like: [\"id1\", \"id2\", \"id3\"]" 
        }
      ],
      temperature: 0.1
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from GPT');
    }

    // Parse the response
    let selectedDomainIds: string[] = [];
    try {
      // Try to parse as a direct array first
      if (responseContent.trim().startsWith('[')) {
        selectedDomainIds = JSON.parse(responseContent);
      } 
      // If not an array, try to find an array in the response
      else {
        // Use a more compatible regex without the 's' flag
      const arrayMatch = responseContent.match(/\[.*?\]/);
        if (arrayMatch) {
          selectedDomainIds = JSON.parse(arrayMatch[0]);
        } else {
          // Last resort: try to parse the entire response as JSON
          const parsed = JSON.parse(responseContent);
          selectedDomainIds = Array.isArray(parsed) ? parsed : [];
        }
      }
      
      // Ensure we have an array of strings
      if (!Array.isArray(selectedDomainIds)) {
        selectedDomainIds = [];
      }
      selectedDomainIds = selectedDomainIds.filter(id => typeof id === 'string');
      
    } catch (error) {
      console.error('Failed to parse GPT response:', error);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse GPT response. Please ensure the response is a valid JSON array of domain IDs.');
    }

    // Filter and validate selected domains
    const selectedDomains = domains
      .filter(domain => selectedDomainIds.includes(domain.id))
      .filter(domain => !config.exclude_categories.includes(domain.category))
      .filter(domain => config.preferred_regions.includes('Global') || config.preferred_regions.includes(domain.region))
      .slice(0, config.max_domains);

    // Return the selected domains as an array
    return NextResponse.json(selectedDomains, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error) {
    console.error('Domain selection error:', error);
    return NextResponse.json(
      { error: 'Failed to select domains', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
