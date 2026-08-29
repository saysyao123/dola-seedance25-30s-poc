import { chromium, type BrowserContext, type Request, type Response } from 'playwright';
import { mkdir, appendFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseAndRedactJson, redactUrl } from '../security/redact.js';

export type ObserverOptions = {
  dolaUrl: string;
  profileDir: string;
  captureFile: string;
  browserChannel?: string;
};

function isDolaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'dola.com' || host.endsWith('.dola.com') || host.includes('ciciai.com');
  } catch {
    return false;
  }
}

function looksVideoRelated(request: Request): boolean {
  const url = request.url().toLowerCase();
  const body = request.postData()?.toLowerCase() ?? '';
  return /video|generation|creation|completion|chat/.test(url) || /seedance|video|duration|ability_type/.test(body);
}

async function writeRecord(captureFile: string, record: unknown): Promise<void> {
  await mkdir(dirname(captureFile), { recursive: true });
  await appendFile(captureFile, `${JSON.stringify(record)}\n`, 'utf8');
}

function requestRecord(request: Request) {
  return {
    kind: 'request',
    at: new Date().toISOString(),
    method: request.method(),
    url: redactUrl(request.url()),
    resourceType: request.resourceType(),
    postData: parseAndRedactJson(request.postData()),
  };
}

function responseRecord(response: Response) {
  const headers = response.headers();
  return {
    kind: 'response',
    at: new Date().toISOString(),
    status: response.status(),
    url: redactUrl(response.url()),
    contentType: headers['content-type'] ?? null,
  };
}

export async function startObserver(options: ObserverOptions): Promise<BrowserContext> {
  const profileDir = resolve(options.profileDir);
  const captureFile = resolve(options.captureFile);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: null,
    channel: options.browserChannel || undefined,
  });

  context.on('request', async (request) => {
    if (!isDolaUrl(request.url()) || !looksVideoRelated(request)) return;
    await writeRecord(captureFile, requestRecord(request));
    console.log(`[request] ${request.method()} ${new URL(request.url()).pathname}`);
  });

  context.on('response', async (response) => {
    const request = response.request();
    if (!isDolaUrl(response.url()) || !looksVideoRelated(request)) return;
    await writeRecord(captureFile, responseRecord(response));
    console.log(`[response] ${response.status()} ${new URL(response.url()).pathname}`);
  });

  const pages = context.pages();
  const page = pages[0] ?? (await context.newPage());
  await page.goto(options.dolaUrl, { waitUntil: 'domcontentloaded' });

  console.log(`\nDola observer is running.`);
  console.log(`Browser channel: ${options.browserChannel || 'playwright chromium'}`);
  console.log(`Profile: ${profileDir}`);
  console.log(`Capture: ${captureFile}`);
  console.log(`Log into Dola manually in the visible browser, then run a normal video-generation test.`);
  console.log(`Raw captures are local-only and ignored by Git. Close the browser window to stop.\n`);

  return context;
}
