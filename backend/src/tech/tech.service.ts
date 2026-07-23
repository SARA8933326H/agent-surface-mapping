import { Injectable } from '@nestjs/common';
import { AssetExtract, AssetType, PageExtract } from '@surface/shared';

@Injectable()
export class TechService {
  detect(pages: PageExtract[], assets: AssetExtract[]): string[] {
    const stack = new Set<string>();

    for (const page of pages) {
      const headers = page.headers || {};
      const server = (headers['server'] || '').toLowerCase();
      const poweredBy = (headers['x-powered-by'] || '').toLowerCase();
      const contentType = (page.contentType || '').toLowerCase();

      if (server.includes('nginx')) stack.add('Nginx');
      if (server.includes('apache')) stack.add('Apache');
      if (server.includes('cloudflare')) stack.add('Cloudflare');
      if (poweredBy.includes('next.js')) stack.add('Next.js');
      if (poweredBy.includes('express')) stack.add('Express');
      if (contentType.includes('application/json')) stack.add('JSON API');
    }

    for (const asset of assets) {
      const url = asset.url.toLowerCase();
      if (url.includes('react') || url.includes('next/')) stack.add('React');
      if (url.includes('vue')) stack.add('Vue.js');
      if (url.includes('angular')) stack.add('Angular');
      if (url.includes('jquery')) stack.add('jQuery');
      if (url.includes('bootstrap')) stack.add('Bootstrap');
      if (url.includes('tailwind')) stack.add('Tailwind CSS');
      if (asset.type === AssetType.SCRIPT && url.endsWith('.js')) stack.add('JavaScript');
      if (asset.type === AssetType.STYLESHEET) stack.add('CSS');
    }

    return [...stack];
  }
}
