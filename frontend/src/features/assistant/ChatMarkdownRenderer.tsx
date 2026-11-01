import React from 'react';

interface ChatMarkdownRendererProps {
  content: string;
}

export const ChatMarkdownRenderer: React.FC<ChatMarkdownRendererProps> = ({ content }) => {
  // Split content into blocks (paragraphs, tables, lists, headers)
  const renderFormattedInline = (text: string) => {
    // Process bold, inline code, status badges, and currency highlights
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Regex for:
    // 1. Status badges: 🟢 ... | 🟡 ... | 🔴 ...
    // 2. Bold: **text**
    // 3. Code: `code`
    // 4. Currency: ₹[\d,]+(\.\d+)?
    const inlineRegex = /(\*\*[^*]+\*\*|`[^`]+`|(?:🟢|🟡|🔴|✅|⚠️|⚡|💡)\s*[A-Za-z0-9\s/&()-]+|₹\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*(?:mo|month|year))?)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      const matchStart = match.index;
      const matchEnd = inlineRegex.lastIndex;

      // Text before match
      if (matchStart > lastIndex) {
        parts.push(remaining.substring(lastIndex, matchStart));
      }

      const matchText = match[0];

      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        const inner = matchText.slice(2, -2);
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-slate-900">
            {inner}
          </strong>
        );
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200"
          >
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith('🟢') || matchText.startsWith('✅')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
          >
            {matchText}
          </span>
        );
      } else if (matchText.startsWith('🟡') || matchText.startsWith('⚠️')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
          >
            {matchText}
          </span>
        );
      } else if (matchText.startsWith('🔴')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs"
          >
            {matchText}
          </span>
        );
      } else if (matchText.startsWith('⚡') || matchText.startsWith('💡')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-xs"
          >
            {matchText}
          </span>
        );
      } else if (matchText.startsWith('₹')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-block px-1.5 py-0.5 font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded text-[12px]"
          >
            {matchText}
          </span>
        );
      } else {
        parts.push(matchText);
      }

      lastIndex = matchEnd;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts;
  };

  // Parse markdown lines into semantic blocks
  const parseBlocks = () => {
    const rawLines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // 1. Table Detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          // Parse Header
          const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

          // Skip separator line (e.g. |:---|:---|)
          const dataRows = tableLines.slice(2).map((rowLine) =>
            rowLine
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );

          blocks.push(
            <div
              key={`table-${i}`}
              className="my-3 overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white"
            >
              <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200">
                  <tr>
                    {headerCells.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap text-[11px] uppercase tracking-wider bg-slate-100"
                      >
                        {renderFormattedInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal bg-white">
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? 'bg-white hover:bg-slate-50 transition-colors'
                          : 'bg-slate-50/70 hover:bg-slate-100/70 transition-colors'
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 text-slate-800 whitespace-normal leading-relaxed"
                        >
                          {renderFormattedInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 2. Headings
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s+/, '');
        blocks.push(
          <div key={`h3-${i}`} className="mt-4 mb-2 flex items-center space-x-2">
            <span className="w-1.5 h-4 rounded-full bg-indigo-600 flex-shrink-0" />
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <span>{renderFormattedInline(title)}</span>
            </h4>
          </div>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('## ')) {
        const title = trimmed.replace(/^##\s+/, '');
        blocks.push(
          <div key={`h2-${i}`} className="mt-5 mb-2.5 border-b border-slate-200 pb-1.5">
            <h3 className="text-base font-bold text-indigo-700">
              {renderFormattedInline(title)}
            </h3>
          </div>
        );
        i++;
        continue;
      }

      // 3. Horizontal Separator
      if (trimmed === '---' || trimmed === '***') {
        blocks.push(
          <hr
            key={`hr-${i}`}
            className="my-3 border-t border-slate-200"
          />
        );
        i++;
        continue;
      }

      // 4. Blockquote / Callouts
      if (trimmed.startsWith('> ')) {
        const quoteText = trimmed.replace(/^>\s+/, '');
        blocks.push(
          <div
            key={`quote-${i}`}
            className="my-2.5 pl-3.5 py-2 border-l-4 border-indigo-500 bg-indigo-50/80 rounded-r-lg text-xs text-slate-800"
          >
            {renderFormattedInline(quoteText)}
          </div>
        );
        i++;
        continue;
      }

      // 5. Unordered List Items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const itemText = trimmed.replace(/^[-*•]\s+/, '');
        const isSubItem = line.startsWith('  ') || line.startsWith('\t');
        blocks.push(
          <div
            key={`li-${i}`}
            className={`flex items-start space-x-2 my-1 text-xs text-slate-800 ${
              isSubItem ? 'ml-5 text-[11px]' : 'ml-1'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                isSubItem ? 'bg-slate-400' : 'bg-indigo-600'
              }`}
            />
            <div className="leading-relaxed flex-1">{renderFormattedInline(itemText)}</div>
          </div>
        );
        i++;
        continue;
      }

      // 6. Ordered List Items
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const itemText = numMatch[2];
        blocks.push(
          <div
            key={`oli-${i}`}
            className="flex items-start space-x-2.5 my-2 ml-1 text-xs text-slate-800"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-indigo-200 mt-0.5">
              {num}
            </span>
            <div className="leading-relaxed flex-1">{renderFormattedInline(itemText)}</div>
          </div>
        );
        i++;
        continue;
      }

      // 7. Empty line
      if (!trimmed) {
        blocks.push(<div key={`empty-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // 8. Regular paragraph
      blocks.push(
        <p key={`p-${i}`} className="my-1 text-xs leading-relaxed text-slate-800">
          {renderFormattedInline(line)}
        </p>
      );
      i++;
    }

    return blocks;
  };

  return <div className="space-y-0.5 leading-relaxed text-slate-800">{parseBlocks()}</div>;
};
export default ChatMarkdownRenderer;
