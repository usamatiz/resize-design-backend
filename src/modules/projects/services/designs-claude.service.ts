import Anthropic from '@anthropic-ai/sdk';
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResizedDesign {
  resizedJson: Record<string, unknown>;
  model: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;

const SYSTEM_PROMPT = [
  'You are a design layout assistant that resizes Polotno store JSON.',
  'You receive a Polotno JSON representing a single-page design and target dimensions.',
  'Rewrite the JSON so the design fits the target width and height while preserving:',
  '- All pages, elements, images, text, colors, fonts, and effects',
  '- Element ordering (z-index)',
  '- The visual hierarchy and layout intent',
  '',
  'Rules:',
  '- Update the top-level width/height and each page width/height to match the target.',
  '- Reposition and rescale elements proportionally so nothing falls outside the canvas.',
  '- Keep every id, custom, and metadata field unchanged.',
  '- Return ONLY the JSON object. No prose, no markdown fences, no explanation.',
].join('\n');

@Injectable()
export class DesignsClaudeService {
  private readonly logger = new Logger(DesignsClaudeService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not set');
    }
    this.client = new Anthropic({ apiKey });
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;
  }

  async resize(
    sourceJson: unknown,
    prompt: string,
    width: number,
    height: number,
  ): Promise<ResizedDesign> {
    const userContent = [
      `Target dimensions: ${width} x ${height} pixels.`,
      `User instructions: ${prompt}`,
      '',
      'Source Polotno JSON:',
      JSON.stringify(sourceJson),
    ].join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new BadGatewayException('Claude returned no text content');
    }

    const raw = textBlock.text.trim();
    const jsonText = this.stripFences(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      this.logger.error(
        `Failed to parse Claude JSON output: ${(err as Error).message}. First 400 chars: ${raw.slice(0, 400)}`,
      );
      throw new BadGatewayException('Claude did not return valid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadGatewayException('Claude output was not a JSON object');
    }

    return {
      resizedJson: parsed as Record<string, unknown>,
      model: response.model,
    };
  }

  private stripFences(text: string): string {
    if (!text.startsWith('```')) return text;
    const withoutOpen = text.replace(/^```(?:json)?\s*/i, '');
    return withoutOpen.replace(/```\s*$/i, '').trim();
  }
}
