import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PolotnoJob = {
  id: string;
  status: 'scheduled' | 'running' | 'done' | 'error';
  output: string | null;
  error?: string;
  progress?: number;
};

export interface RenderedDesignImage {
  buffer: Buffer;
  mimetype: 'image/png';
  bytes: number;
}

const RENDERS_URL = 'https://api.polotno.com/api/renders';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90_000;
const OUTPUT_DOWNLOAD_TIMEOUT_MS = 30_000;

@Injectable()
export class DesignsRenderService {
  private readonly logger = new Logger(DesignsRenderService.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('POLOTNO_API_KEY');
    if (!key) {
      throw new InternalServerErrorException('POLOTNO_API_KEY is not set');
    }
    this.apiKey = key;
  }

  async renderDesignAsPng(
    design: Record<string, unknown>,
    options: { pixelRatio?: number } = {},
  ): Promise<RenderedDesignImage> {
    const job = await this.enqueueRender(design, options);
    const finished = job.status === 'done' && job.output
      ? job
      : await this.pollUntilDone(job.id);

    if (!finished.output) {
      throw new BadGatewayException(
        `Polotno render finished with no output (status=${finished.status})`,
      );
    }

    return this.downloadOutput(finished.output);
  }

  private async enqueueRender(
    design: Record<string, unknown>,
    options: { pixelRatio?: number },
  ): Promise<PolotnoJob> {
    const url = `${RENDERS_URL}?KEY=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        design,
        format: 'png',
        pixelRatio: options.pixelRatio ?? 1,
        skipFontError: true,
        skipImageError: true,
        textOverflow: 'resize',
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadGatewayException(
        `Polotno render enqueue failed (${res.status}): ${body || res.statusText}`,
      );
    }

    const job = (await res.json()) as PolotnoJob;
    if (job.status === 'error') {
      throw new BadGatewayException(
        `Polotno render errored: ${job.error ?? 'unknown'}`,
      );
    }
    return job;
  }

  private async pollUntilDone(jobId: string): Promise<PolotnoJob> {
    const url = `${RENDERS_URL}/${encodeURIComponent(jobId)}?KEY=${encodeURIComponent(this.apiKey)}`;
    const start = Date.now();

    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new BadGatewayException(
          `Polotno render poll failed (${res.status}): ${body || res.statusText}`,
        );
      }
      const job = (await res.json()) as PolotnoJob;
      if (job.status === 'done') return job;
      if (job.status === 'error') {
        throw new BadGatewayException(
          `Polotno render errored: ${job.error ?? 'unknown'}`,
        );
      }
    }

    throw new BadGatewayException(
      `Polotno render timed out after ${POLL_TIMEOUT_MS / 1000}s (jobId=${jobId})`,
    );
  }

  private async downloadOutput(outputUrl: string): Promise<RenderedDesignImage> {
    const res = await fetchWithTimeout(outputUrl, OUTPUT_DOWNLOAD_TIMEOUT_MS);
    if (!res.ok) {
      throw new BadGatewayException(
        `Polotno output download failed (${res.status}): ${res.statusText}`,
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, mimetype: 'image/png', bytes: buffer.byteLength };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
