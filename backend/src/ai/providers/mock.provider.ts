import { AIAnalysisResult, AIProvider } from '../ai-provider.interface';

const abuseTerms = ['hate', 'kill', 'attack', 'explicit', 'scam'];
const chaiTerms = /\b(chai|tea|tea break|teacup|chaiwala)\b/i;
const funnyTerms = /\b(funny|haha|lol|laugh)\b/i;
const nostalgicTerms = /\b(childhood|grandma|nani|dadi|old days)\b/i;
const wholesomeTerms = /\b(family|friends|together|rain)\b/i;

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  analyzeStory(story: string): Promise<AIAnalysisResult> {
    const normalized = story.trim().toLowerCase();
    const spammy =
      /(?:https?:\/\/|www\.)/i.test(normalized) ||
      /(.{2,})\1{3,}/i.test(normalized);
    const abusive = abuseTerms.some((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(normalized),
    );
    const offTopic = [...normalized].length < 15 || !chaiTerms.test(normalized);

    if (spammy || abusive || offTopic) {
      return Promise.resolve({
        decision: 'rejected',
        reason: spammy
          ? 'Spam or promotional content is not allowed.'
          : abusive
            ? 'Abusive content is not allowed.'
            : 'Please share a relevant chai break story.',
        category: 'other',
        caption: 'A better chai break starts here.',
      });
    }

    const category = funnyTerms.test(normalized)
      ? 'funny'
      : nostalgicTerms.test(normalized)
        ? 'nostalgic'
        : wholesomeTerms.test(normalized)
          ? 'wholesome'
          : 'other';
    const keyword =
      normalized.match(
        /chai|tea|family|friends|rain|laugh|haha|childhood/i,
      )?.[0] || 'moments';
    return Promise.resolve({
      decision: 'approved',
      reason: null,
      category,
      caption: `${keyword[0].toUpperCase()}${keyword.slice(1)} makes every break brighter.`,
    });
  }
}
