import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { runBulkUpdateAnnotationMetadataTool } from './tools/bulk-update-annotation-metadata.js';
import { runGetAnnotationsTool } from './tools/get-annotations.js';
import { runGetReportTool } from './tools/get-report.js';
import { runListPagesTool } from './tools/list-pages.js';
import { runSearchAnnotationsTool } from './tools/search-annotations.js';
import { runUpdateAnnotationMetadataTool } from './tools/update-annotation-metadata.js';
import { StoreRepository } from '../store/repository.js';
import { getStorePath } from '../store/path.js';

function toTextResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

export async function runMcpServer(): Promise<void> {
  const repository = new StoreRepository(getStorePath());

  const server = new Server(
    {
      name: 'onui-local-mcp',
      version: '1.0.12',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'onui_list_pages',
        description: 'List pages that have onUI annotations in the local store.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            urlPrefix: { type: 'string' },
          },
        },
      },
      {
        name: 'onui_get_annotations',
        description: 'Get annotations for a specific page URL.',
        inputSchema: {
          type: 'object',
          properties: {
            pageUrl: { type: 'string' },
            includeResolved: { type: 'boolean' },
          },
          required: ['pageUrl'],
        },
      },
      {
        name: 'onui_get_report',
        description: 'Generate annotation report in compact/standard/detailed/forensic format.',
        inputSchema: {
          type: 'object',
          properties: {
            pageUrl: { type: 'string' },
            level: {
              type: 'string',
              enum: ['compact', 'standard', 'detailed', 'forensic'],
            },
          },
          required: ['pageUrl'],
        },
      },
      {
        name: 'onui_search_annotations',
        description: 'Search annotations across the local store with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            pageUrl: { type: 'string' },
            status: { type: 'string' },
            severity: { type: 'string' },
            intent: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'onui_update_annotation_metadata',
        description: 'Update metadata for a single annotation (status/intent/severity/comment).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'acknowledged', 'resolved', 'dismissed'],
            },
            intent: {
              type: 'string',
              enum: ['fix', 'change', 'question', 'approve'],
            },
            severity: {
              type: 'string',
              enum: ['blocking', 'important', 'suggestion'],
            },
            comment: { type: 'string' },
            expectedUpdatedAt: { type: 'number' },
          },
          required: ['id'],
        },
      },
      {
        name: 'onui_bulk_update_annotation_metadata',
        description: 'Bulk update metadata for multiple annotations.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
            },
            patch: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'acknowledged', 'resolved', 'dismissed'],
                },
                intent: {
                  type: 'string',
                  enum: ['fix', 'change', 'question', 'approve'],
                },
                severity: {
                  type: 'string',
                  enum: ['blocking', 'important', 'suggestion'],
                },
              },
              required: [],
            },
          },
          required: ['ids', 'patch'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    switch (request.params.name) {
      case 'onui_list_pages':
        return toTextResult(
          await runListPagesTool(repository, {
            limit: typeof args.limit === 'number' ? args.limit : undefined,
            urlPrefix: typeof args.urlPrefix === 'string' ? args.urlPrefix : undefined,
          })
        );

      case 'onui_get_annotations':
        return toTextResult(
          await runGetAnnotationsTool(repository, {
            pageUrl: String(args.pageUrl ?? ''),
            includeResolved:
              typeof args.includeResolved === 'boolean' ? args.includeResolved : undefined,
          })
        );

      case 'onui_get_report':
        return toTextResult(
          await runGetReportTool(repository, {
            pageUrl: String(args.pageUrl ?? ''),
            level:
              typeof args.level === 'string'
                ? (args.level as 'compact' | 'standard' | 'detailed' | 'forensic')
                : undefined,
          })
        );

      case 'onui_search_annotations':
        return toTextResult(
          await runSearchAnnotationsTool(repository, {
            query: String(args.query ?? ''),
            pageUrl: typeof args.pageUrl === 'string' ? args.pageUrl : undefined,
            status: typeof args.status === 'string' ? args.status : undefined,
            severity: typeof args.severity === 'string' ? args.severity : undefined,
            intent: typeof args.intent === 'string' ? args.intent : undefined,
            limit: typeof args.limit === 'number' ? args.limit : undefined,
          })
        );

      case 'onui_update_annotation_metadata':
        return toTextResult(
          await runUpdateAnnotationMetadataTool(repository, {
            id: String(args.id ?? ''),
            status: typeof args.status === 'string' ? (args.status as never) : undefined,
            intent: typeof args.intent === 'string' ? (args.intent as never) : undefined,
            severity: typeof args.severity === 'string' ? (args.severity as never) : undefined,
            comment: typeof args.comment === 'string' ? args.comment : undefined,
            expectedUpdatedAt:
              typeof args.expectedUpdatedAt === 'number' ? args.expectedUpdatedAt : undefined,
          })
        );

      case 'onui_bulk_update_annotation_metadata':
        return toTextResult(
          await runBulkUpdateAnnotationMetadataTool(repository, {
            ids: Array.isArray(args.ids) ? args.ids.map(String) : [],
            patch: typeof args.patch === 'object' && args.patch
              ? {
                status:
                  typeof (args.patch as Record<string, unknown>).status === 'string'
                    ? ((args.patch as Record<string, unknown>).status as never)
                    : undefined,
                intent:
                  typeof (args.patch as Record<string, unknown>).intent === 'string'
                    ? ((args.patch as Record<string, unknown>).intent as never)
                    : undefined,
                severity:
                  typeof (args.patch as Record<string, unknown>).severity === 'string'
                    ? ((args.patch as Record<string, unknown>).severity as never)
                    : undefined,
              }
              : {},
          })
        );

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
