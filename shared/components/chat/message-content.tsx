import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Markdown をレンダリングするメッセージコンテンツコンポーネント。
 * @ai-sdk/react 依存ゼロ。プラットフォーム非依存。
 */
export const MessageContent = memo<MessageContentProps>(
  ({ content, isStreaming = false }) => {
    const displayContent = useMemo(() => content ?? "", [content]);

    return (
      <div className="prose prose-sm max-w-none text-base text-gray-900 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-6 mb-3 text-gray-900">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-5 mb-2 text-gray-900">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-4 mb-2 text-gray-900">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-5 last:mb-0 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="ml-2 text-gray-900">{children}</li>
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            code: ({ node, className, children, ...props }) => {
              const isInline = !className?.includes("language-");
              return isInline ? (
                <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className="block bg-gray-100 text-gray-900 p-3 rounded-lg overflow-x-auto text-sm font-mono mb-4">
                  {children}
                </code>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 text-gray-700 italic">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-900">{children}</em>
            ),
            hr: () => <hr className="my-6 border-gray-300" />,
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-100">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-gray-300">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 text-left font-semibold text-gray-900 border border-gray-300">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-gray-900 border border-gray-300">
                {children}
              </td>
            ),
            del: ({ children }) => (
              <del className="line-through text-gray-600">{children}</del>
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-gray-900 animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.content === next.content && prev.isStreaming === next.isStreaming,
);

MessageContent.displayName = "MessageContent";
