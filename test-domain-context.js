// Test script to verify domain filtering with conversation context
// Run with: node test-domain-context.js

const { selectDomainsForQuery } = require('./lib/domains/selector');

async function testDomainSelectionWithContext() {
  console.log('Testing domain selection with conversation context...\n');

  // Test 1: Simple query without context
  console.log('=== Test 1: Query without conversation history ===');
  const result1 = await selectDomainsForQuery('solar panels');
  console.log('Selected domains:', result1.domains.map(d => d.domain));
  console.log('Selected IDs:', result1.selectedDomainIds);
  console.log();

  // Test 2: Query with conversation context
  console.log('=== Test 2: Query with conversation context ===');
  const conversationHistory = [
    { role: 'user', content: 'I need information about residential solar panels' },
    { role: 'assistant', content: 'I can help you find information about residential solar panels. Let me search for the latest options.' },
    { role: 'user', content: 'What about LONGi panels specifically?' },
    { role: 'assistant', content: 'LONGi is a leading manufacturer known for high-efficiency monocrystalline panels.' },
    { role: 'user', content: 'What are the prices for LONGi Hi-MO 6?' }
  ];

  const result2 = await selectDomainsForQuery(
    'LONGi Hi-MO 6 prices',
    { max_domains: 10 },
    undefined,
    conversationHistory
  );
  console.log('Selected domains:', result2.domains.map(d => d.domain));
  console.log('Selected IDs:', result2.selectedDomainIds);
  console.log();

  // Test 3: Different context - commercial focus
  console.log('=== Test 3: Query with commercial context ===');
  const commercialHistory = [
    { role: 'user', content: 'I need information for a commercial solar installation' },
    { role: 'assistant', content: 'For commercial installations, you\'ll want to consider utility-scale panels and inverters.' },
    { role: 'user', content: 'What about large-scale projects?' }
  ];

  const result3 = await selectDomainsForQuery(
    'utility scale solar',
    { max_domains: 10 },
    undefined,
    commercialHistory
  );
  console.log('Selected domains:', result3.domains.map(d => d.domain));
  console.log('Selected IDs:', result3.selectedDomainIds);
  console.log();

  console.log('=== Test completed ===');
  console.log('Notice how the conversation context influences domain selection!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testDomainSelectionWithContext().catch(console.error);
}

module.exports = { testDomainSelectionWithContext };
