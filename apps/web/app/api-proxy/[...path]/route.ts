import { NextRequest, NextResponse } from 'next/server';

const baseUrl = process.env.FARMA_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://api:4000/api';

async function proxy(request: NextRequest, path: string[]) {
  const url = new URL(request.url);
  const target = `${baseUrl}/${path.join('/')}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: {
      'content-type': request.headers.get('content-type') ?? 'application/json'
    },
    cache: 'no-store'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
