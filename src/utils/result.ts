export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
  isError?: boolean;
}

export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function imageResult(base64: string, mimeType: string = "image/png"): ToolResult {
  return { content: [{ type: "image", data: base64, mimeType }] };
}

export function mixedResult(
  text: string,
  base64?: string,
  mimeType: string = "image/png",
): ToolResult {
  const content: ToolResult["content"] = [{ type: "text", text }];
  if (base64) {
    content.push({ type: "image", data: base64, mimeType });
  }
  return { content };
}
