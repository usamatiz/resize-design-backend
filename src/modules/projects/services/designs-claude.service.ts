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

export type ResizeStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; resizedJson: Record<string, unknown>; model: string };

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;

const SYSTEM_PROMPT = [
  'Act as an expert UI layout engineer and digital ad designer. You receive a Polotno store JSON representing a digital advertisement canvas (text layers, shape groups, images) together with a target canvas resolution.',
  'Your task is to rewrite the JSON so the design fits the new target width and height.',
  '',
  '**CRITICAL RULES & CONSTRAINTS:**',
  '1. **Preserve the Core Design:** Do not change colors, font families, textual content, or introduce new elements. The visual identity and branding must remain exactly the same. Keep every id, custom, and metadata field unchanged. Preserve element ordering (z-index).',
  '2. **Text Readability:** Recalculate `fontSize` and `lineHeight` so text remains highly legible on the new canvas size. If the canvas is narrower (e.g., vertical/story format), adjust the line breaks (`\\n`) in the text content naturally so it does not overflow the canvas width.',
  '3. **Massive CTA Emphasis:** Identify the Call-To-Action (CTA) group or button. It must be significantly larger and more prominent in the new layout. Increase the button’s background dimensions and the text `fontSize` by at least 30% relative to the new canvas proportions. Place it in a high-visibility area with plenty of negative space.',
  '4. **Coordinate System Update:** All `x` and `y` positions must be accurately recalculated based on the new dimensions and anchors. Ensure a minimum padding of 40px from all edges (the “safe zone”).',
  '5. **Canvas Sync:** Update the top-level `width`/`height` and each page `width`/`height` to match the target.',
  '',
  '**GENERIC ELEMENT LAYOUT & PLACEMENT LOGIC:**',
  '',
  '- **Primary Heading Layer:** Keep it anchored near the top (either left-aligned or centered, matching the original). Adjust font size so it dominates the top hierarchy. If the aspect ratio is tall/narrow, force more line breaks to prevent clipping.',
  '- **Sub-heading / Secondary Text Layer:** Place logically below the primary heading. Maintain original formatting (underlines, weights).',
  '- **Body Text / Bullet Point Layers:** Keep grouped closely with the sub-heading. Ensure line height allows easy skimming. Scale the font down slightly if needed to fit, but maintain strict readability.',
  '- **Call-To-Action (CTA) Group:** Emphasis target — increase overall group scale. If landscape, place it prominently on the left or center under the body text. If portrait, place it near the bottom center, just above the logo, or floating prominently over the negative space of the main visual.',
  '- **Main Visual Asset / Primary Image:** The primary visual anchor. Anchor it to the bottom or to the side opposite the text depending on content. Scale width/height proportionally so it fills empty space without overlapping the text or CTA. In tall formats, it may span the full width at the bottom.',
  '- **Logo / Branding Layer:** Anchor to a corner (usually bottom-left or bottom-right, matching the original intent). Scale down slightly if space is tight, but maintain a minimum width of 100px. Keep it tucked into the corner with safe-zone padding.',
  '',
  'Output the completely updated Polotno JSON object. Return ONLY the JSON object — no prose, no markdown fences, no explanation. The JSON must be perfectly valid and ready for export.',
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: this.buildUserContent(sourceJson, prompt, width, height),
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new BadGatewayException('Claude returned no text content');
    }

    return {
      resizedJson: this.parseJsonOrThrow(textBlock.text),
      model: response.model,
    };
  }

  async *resizeStream(
    sourceJson: unknown,
    prompt: string,
    width: number,
    height: number,
  ): AsyncGenerator<ResizeStreamEvent, void, unknown> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: this.buildUserContent(sourceJson, prompt, width, height),
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'delta', text: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    const textBlock = finalMessage.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new BadGatewayException('Claude returned no text content');
    }

    yield {
      type: 'done',
      resizedJson: this.parseJsonOrThrow(textBlock.text),
      model: finalMessage.model,
    };
  }

  private buildUserContent(
    sourceJson: unknown,
    prompt: string,
    width: number,
    height: number,
  ): string {
    return [
      `Target dimensions: ${width} x ${height} pixels.`,
      `User instructions: ${prompt}`,
      '',
      'Source Polotno JSON:',
      JSON.stringify(sourceJson),
    ].join('\n');
  }

  private parseJsonOrThrow(raw: string): Record<string, unknown> {
    const jsonText = this.stripFences(raw.trim());
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
    return parsed as Record<string, unknown>;
  }

  private stripFences(text: string): string {
    if (!text.startsWith('```')) return text;
    const withoutOpen = text.replace(/^```(?:json)?\s*/i, '');
    return withoutOpen.replace(/```\s*$/i, '').trim();
  }
}
