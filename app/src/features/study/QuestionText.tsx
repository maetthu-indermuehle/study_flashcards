/**
 * Renders a card question, handling the embedded Markdown image syntax used
 * in imported questions: `![alt text](assets/FILENAME.png) question body`.
 *
 * Images are served from /public/assets/ as static Next.js assets.
 * The `assets/` path prefix in the question text maps to `/assets/` at runtime.
 */

type ParsedQuestion = {
  imageSrc: string | null;
  imageAlt: string;
  body: string;
};

// Matches `![alt](assets/filename.ext)` at the start of the question string.
const IMAGE_RE = /^!\[([^\]]*)\]\((assets\/[^)]+)\)\s*/;

function parseQuestion(text: string): ParsedQuestion {
  const match = text.match(IMAGE_RE);
  if (match) {
    return {
      // assets/foo.png → /assets/foo.png (served by Next.js public dir)
      imageSrc: "/" + match[2],
      imageAlt: match[1],
      body: text.slice(match[0].length),
    };
  }
  return { imageSrc: null, imageAlt: "", body: text };
}

type Props = {
  text: string;
};

/**
 * Renders a question string, displaying any leading Markdown image before the
 * question text. Usable in both Server and Client Components.
 */
export default function QuestionText({ text }: Props) {
  const { imageSrc, imageAlt, body } = parseQuestion(text);

  return (
    <>
      {imageSrc && (
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-auto w-full object-contain"
          />
          {imageAlt && (
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
              {imageAlt}
            </p>
          )}
        </div>
      )}
      <p className="text-lg font-medium leading-snug text-slate-950">{body}</p>
    </>
  );
}
