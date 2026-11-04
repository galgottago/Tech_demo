/**
 * Tool / function-calling registry for the chat engine.
 *
 * This lets a host app plug domain tools into the engine (e.g. a BACnet
 * data lookup) without the engine knowing anything about them. The
 * registry is wired into ChatEngine's constructor but the prompting /
 * execution loop is intentionally NOT implemented yet — see PLAN.md
 * "Deferred". Registering tools today is a no-op at inference time.
 */

/** JSON-Schema-shaped parameter description, OpenAI function-calling style. */
export interface ToolParameters {
  type: 'object'
  properties: Record<string, { type: string; description?: string; enum?: string[] }>
  required?: string[]
}

export interface ToolDefinition {
  /** Unique tool name, e.g. "bacnet_read_point". */
  name: string
  /** What the tool does, written for the model. */
  description: string
  parameters: ToolParameters
  /** Executes the tool. Return value is fed back to the model as a string. */
  handler: (args: Record<string, unknown>) => string | Promise<string>
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`)
    }
    this.tools.set(tool.name, tool)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()]
  }
}
