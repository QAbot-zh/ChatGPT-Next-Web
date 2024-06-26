import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import { useRef, useState, RefObject, useEffect, useMemo } from "react";
import { copyToClipboard } from "../utils";
import mermaid from "mermaid";

import LoadingIcon from "../icons/three-dots.svg";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { showImageModal } from "./ui-lib";

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (props.code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true,
        })
        .catch((e) => {
          setHasError(true);
          console.error("[Mermaid] ", e.message);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.code]);

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    showImageModal(URL.createObjectURL(blob));
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      className="no-dark mermaid"
      style={{
        cursor: "pointer",
        overflow: "auto",
      }}
      ref={ref}
      onClick={() => viewSvgInNewWindow()}
    >
      {props.code}
    </div>
  );
}

export function PreCode(props: { children: any }) {
  const ref = useRef<HTMLPreElement>(null);
  const refText = ref.current?.innerText;
  const [mermaidCode, setMermaidCode] = useState("");

  const renderMermaid = useDebouncedCallback(() => {
    if (!ref.current) return;
    const mermaidDom = ref.current.querySelector("code.language-mermaid");
    if (mermaidDom) {
      setMermaidCode((mermaidDom as HTMLElement).innerText);
    }
  }, 600);

  useEffect(() => {
    setTimeout(renderMermaid, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refText]);

  return (
    <>
      {mermaidCode.length > 0 && (
        <Mermaid code={mermaidCode} key={mermaidCode} />
      )}
      <pre ref={ref}>
        <span
          className="copy-code-button"
          onClick={() => {
            if (ref.current) {
              const code = ref.current.innerText;
              copyToClipboard(code);
            }
          }}
        ></span>
        {props.children}
      </pre>
    </>
  );
}

// function escapeDollarNumber(text: string) {
//   let escapedText = "";

//   for (let i = 0; i < text.length; i += 1) {
//     let char = text[i];
//     const nextChar = text[i + 1] || " ";

//     if (char === "$" && nextChar >= "0" && nextChar <= "9") {
//       char = "\\$";
//     }

//     escapedText += char;
//   }

//   return escapedText;
// }
function escapeDollarNumber(text: string) {
  let escapedText = "";
  let isInMathExpression = false;
  let isInCodeBlock = false;

  const codeBlockStartRegex = /^`{1,3}$/;

  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    const nextChar = text[i + 1] || " ";

    // Toggle the isInMathExpression flag when encountering a dollar sign
    if (char === "$") {
      isInMathExpression = !isInMathExpression;
    }

    // Toggle the isInCodeBlock flag when encountering a code block start indicator
    if (codeBlockStartRegex.test(char + nextChar)) {
      isInCodeBlock = !isInCodeBlock;
    }

    // If inside a code block, preserve the character as is
    if (isInCodeBlock) {
      escapedText += char;
      continue;
    }

    // Preserve the double dollar sign in math expressions
    if (char === "$" && nextChar === "$") {
      escapedText += "$$"; // Preserve the double dollar sign
      i++; // Skip the next dollar sign since we have already included it
      continue;
    }

    // Escape a single dollar sign followed by a number outside of math expressions
    if (char === "$" && nextChar >= "0" && nextChar <= "9" && !isInMathExpression) {
      escapedText += "&#36;"; // Use HTML entity &#36; to represent the dollar sign
      continue;
    }

    escapedText += char;
  }

  return escapedText;
}

// function escapeBrackets(text: string) {
//   const pattern =
//     /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
//   return text.replace(
//     pattern,
//     (match, codeBlock, squareBracket, roundBracket) => {
//       if (codeBlock) {
//         return codeBlock;
//       } else if (squareBracket) {
//         return `$$${squareBracket}$$`;
//       } else if (roundBracket) {
//         return `$${roundBracket}$`;
//       }
//       return match;
//     },
//   );
// }

function replaceLatexEnvironments(text: string): string {
  // 使用正则表达式替换 $$\begin{aligned} 为 $$
  text = text.replace(/\$\$\s*\\begin\{aligned}/, '$$\\begin{aligned}');

  // 使用正则表达式替换 \end{aligned}$$ 为 \end{aligned}$
  text = text.replace(/\\end\{aligned}\s*\$\$/g, '\\end{aligned}$');

  return text;
}

function escapeBrackets(text: string): string {
  const pattern =
    /(```[\s\S]*?```|`[^`]*`)|\\\[(.*?)\\\]|\\\[(\n\\begin\{[\s\S]*?\}\n)\\\]/g;
  text =  replaceLatexEnvironments(text);
  return text.replace(
    pattern,
    (match, codeBlock, simpleSquareBracketContent, complexSquareBracketContent) => {
      if (codeBlock) {
        // 代码块，直接返回
        return match;
      } else if (simpleSquareBracketContent !== undefined) {
        // 简单方括号内的内容，转换为 $...$ 形式
        const regex = /\[(.*?)\s*(?=\+|=|{)/;
        const isMatched = regex.test(match);
        if(isMatched) { // 加一个约束条件
            // 处理方括号内的内容，转换为 $...$ 形式
            return `$${simpleSquareBracketContent}$`;
        }
      } else if (complexSquareBracketContent !== undefined) {
        // 复杂方括号内容（包含 \begin{}），也转换为 $$...$$ 形式
        return `$$${complexSquareBracketContent}$$`;
      }
      // 默认返回匹配到的内容
      return match;
    },
  );
}

function _MarkDownContent(props: { content: string }) {
  const escapedContent = useMemo(() => {
    return escapeBrackets(escapeDollarNumber(props.content));
  }, [props.content]);

  return (
    <ReactMarkdown
      remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
      rehypePlugins={[
        RehypeKatex,
        [
          RehypeHighlight,
          {
            detect: false,
            ignoreMissing: true,
          },
        ],
      ]}
      components={{
        pre: PreCode,
        p: (pProps) => <p {...pProps} dir="auto" />,
        a: (aProps) => {
          const href = aProps.href || "";
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {escapedContent}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(_MarkDownContent);

export function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 14}px`,
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
      dir="auto"
    >
      {props.loading ? (
        <LoadingIcon />
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
