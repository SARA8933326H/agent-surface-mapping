import { Injectable } from '@nestjs/common';
import {
  AssetExtract,
  EndpointExtract,
  FormExtract,
  FunctionalityType,
  GraphData,
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphNodeType,
  PageClassification,
  PageExtract,
} from '@surface/shared';

@Injectable()
export class GraphService {
  buildGraphData(
    pages: PageExtract[],
    forms: FormExtract[],
    endpoints: EndpointExtract[],
    assets: AssetExtract[],
    classifications: PageClassification[],
  ): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const pageId = (url: string) => `page-${hash(url)}`;
    const formId = (idx: number) => `form-${idx}`;
    const endpointId = (idx: number) => `endpoint-${idx}`;
    const assetId = (idx: number) => `asset-${idx}`;

    pages.forEach((page, idx) => {
      nodes.push({
        id: pageId(page.url),
        type: GraphNodeType.PAGE,
        label: page.title || page.url,
        data: { url: page.url, statusCode: page.statusCode, depth: page.depth },
        x: idx * 220,
        y: 100 + (page.depth % 2) * 120,
      });
    });

    forms.forEach((form, idx) => {
      nodes.push({
        id: formId(idx),
        type: GraphNodeType.FORM,
        label: `${form.method} ${form.action || 'self'}`,
        data: { fields: form.fields.length, buttons: form.buttons },
        x: idx * 220,
        y: 320,
      });
    });

    endpoints.forEach((endpoint, idx) => {
      const type = endpoint.type === 'REST' ? GraphNodeType.ENDPOINT : endpoint.type === 'GRAPHQL' ? GraphNodeType.ENDPOINT : GraphNodeType.ENDPOINT;
      nodes.push({
        id: endpointId(idx),
        type,
        label: `${endpoint.method || 'GET'} ${endpoint.url}`,
        data: { type: endpoint.type, contentType: endpoint.contentType },
        x: idx * 220,
        y: 520,
      });
    });

    assets.forEach((asset, idx) => {
      const type = asset.type === 'SCRIPT' ? GraphNodeType.SCRIPT : GraphNodeType.ASSET;
      nodes.push({
        id: assetId(idx),
        type,
        label: `${asset.type}: ${asset.url.split('/').pop() || asset.url}`,
        data: { url: asset.url, assetType: asset.type },
        x: idx * 220,
        y: 720,
      });
    });

    classifications.forEach((c) => {
      c.functionality.forEach((func) => {
        const meta = this.functionalityNode(func);
        if (!meta) return;
        const fid = `func-${func}-${hash(c.url)}`;
        if (!nodes.some((n) => n.id === fid)) {
          nodes.push({ id: fid, type: meta.type, label: meta.label, data: { functionality: func }, x: 0, y: 0 });
        }
        edges.push({
          id: `rel-${func}-${hash(c.url)}`,
          source: pageId(c.url),
          target: fid,
          label: 'has',
          type: GraphEdgeType.RELATIONSHIP,
        });
      });
    });

    pages.forEach((page, pIdx) => {
      const pid = pageId(page.url);
      page.extractedLinks.forEach((link) => {
        const targetPage = pages.find((p) => p.url === link);
        if (targetPage) {
          edges.push({
            id: `nav-${hash(page.url)}-${hash(link)}`,
            source: pid,
            target: pageId(link),
            label: 'nav',
            type: GraphEdgeType.NAVIGATION,
          });
        }
      });

      page.forms.forEach((form, fIdx) => {
        const targetForm = forms.findIndex((f) => f === form);
        if (targetForm >= 0) {
          edges.push({
            id: `form-${hash(page.url)}-${fIdx}`,
            source: pid,
            target: formId(targetForm),
            label: form.method,
            type: GraphEdgeType.FORM_ACTION,
          });
        }
      });

      page.endpoints.forEach((endpoint, eIdx) => {
        const targetEndpoint = endpoints.findIndex((e) => e.url === endpoint.url && e.method === endpoint.method);
        if (targetEndpoint >= 0) {
          edges.push({
            id: `api-${hash(page.url)}-${eIdx}`,
            source: pid,
            target: endpointId(targetEndpoint),
            label: endpoint.method || 'GET',
            type: GraphEdgeType.API_CALL,
          });
        }
      });

      page.assets.forEach((asset, aIdx) => {
        const targetAsset = assets.findIndex((a) => a.url === asset.url && a.type === asset.type);
        if (targetAsset >= 0) {
          edges.push({
            id: `asset-${hash(page.url)}-${aIdx}`,
            source: pid,
            target: assetId(targetAsset),
            label: asset.type,
            type: GraphEdgeType.JS_IMPORT,
          });
        }
      });
    });

    return { nodes, edges };
  }

  private functionalityNode(func: FunctionalityType): { type: GraphNodeType; label: string } | undefined {
    switch (func) {
      case FunctionalityType.AUTH:
        return { type: GraphNodeType.AUTH, label: 'Authentication' };
      case FunctionalityType.ADMIN:
        return { type: GraphNodeType.ADMIN, label: 'Admin' };
      case FunctionalityType.DASHBOARD:
      case FunctionalityType.CRUD:
      case FunctionalityType.SEARCH:
      case FunctionalityType.UPLOAD:
      case FunctionalityType.DOWNLOAD:
        return { type: GraphNodeType.OBJECT, label: func };
      default:
        return undefined;
    }
  }
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}
