/**
 * SSE stream creation - Pure Web Streams API
 * 32 lines - compliant with ≤75 rule
 */

export interface SSEStream {
  readable: ReadableStream<Uint8Array>;
  writer: WritableStreamDefaultWriter<string>;
}

export const createSSEStream = (): SSEStream => {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(encoder.encode(chunk));
    },
  });
  return {
    readable,
    writer: writable.getWriter(),
  };
};

export const sendSSE = async (
  writer: WritableStreamDefaultWriter<string>,
  type: string,
  data: unknown
): Promise<void> => {
  const msg = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  await writer.write(msg);
};

export const closeSSE = async (writer: WritableStreamDefaultWriter<string>): Promise<void> => {
  await writer.close();
};
