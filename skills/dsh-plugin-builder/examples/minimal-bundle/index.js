// Minimal DSH Host-only bundle: one tool + one prompt section.
// Copy this directory, rename the package/row ids, then install with plugin_manager.

export const name = 'minimal'

export function apply(ctx, config = {}) {
  const tools = ctx.get('tools')
  if (tools !== undefined) {
    ctx.effect(() => tools.register({
      name: 'minimal_ping',
      description: 'Return the text you pass in (demonstrates a tool with an output contract).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: { echoed: { type: 'string' } },
          required: ['echoed'],
        },
        render(args, value) {
          return [{ type: 'text', text: value.echoed }]
        },
      },
      async execute(args) {
        return { echoed: String(args.text) }
      },
    }), 'minimal ping tool')
  }

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt !== undefined) {
    ctx.effect(() => systemPrompt.section({
      name: 'minimal:note',
      order: 3101,
      text: 'When a task mentions the demo bundle, use `minimal_ping` to echo the text.',
    }), 'minimal prompt section')
  }
}
