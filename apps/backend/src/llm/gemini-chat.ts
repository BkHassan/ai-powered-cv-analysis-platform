import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

const GEMINI_OPENAI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/';

const logger = new Logger('GeminiChat');

/**
 * Chat and quiz used to call OpenAI gpt-4o-mini. They now go through Gemini's
 * OpenAI-compatible endpoint so a single GEMINI_API_KEY covers embeddings
 * and generation. ChatOpenAI is kept as the client; only the base URL and
 * model name change.
 */
export function createGeminiChatModel(
  configService: ConfigService,
  temperature: number,
): ChatOpenAI {
  const apiKey = configService.get<string>('GEMINI_API_KEY');
  if (!apiKey) {
    logger.error('GEMINI_API_KEY is not defined in .env');
    throw new Error('GEMINI_API_KEY is required');
  }

  const modelName =
    configService.get<string>('GEMINI_CHAT_MODEL') || 'gemini-3.6-flash';

  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName,
    temperature,
    configuration: {
      baseURL: GEMINI_OPENAI_BASE_URL,
    },
  });
}
