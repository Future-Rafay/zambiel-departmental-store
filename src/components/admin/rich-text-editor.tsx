"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDeferredUploadTask } from "@/components/admin/deferred-upload-form";
import { Label } from "@/components/ui/label";
import {
  productImageAccept,
  replacePendingImageSources,
  uploadProductImage,
  validateProductImage,
} from "@/lib/product-image-upload";

export function RichTextEditor({
  label,
  name,
  defaultValue = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingImages = useRef(new Map<string, File>());
  const [html, setHtml] = useState(defaultValue ?? "");
  const [sourceMode, setSourceMode] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");

  const releaseRemovedImages = useCallback((nextHtml: string) => {
    for (const source of pendingImages.current.keys()) {
      if (nextHtml.includes(source)) continue;
      URL.revokeObjectURL(source);
      pendingImages.current.delete(source);
    }
    setPendingCount(pendingImages.current.size);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    content: defaultValue ?? "",
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ allowBase64: false }),
    ],
    onUpdate: ({ editor: current }) => {
      const nextHtml = current.getHTML();
      setHtml(nextHtml);
      releaseRemovedImages(nextHtml);
    },
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "rich-editor-content blog-prose min-h-64 max-w-none p-4 focus:outline-none",
      },
    },
  });

  useEffect(
    () => () => {
      for (const source of pendingImages.current.keys()) {
        URL.revokeObjectURL(source);
      }
      pendingImages.current.clear();
    },
    [],
  );

  const prepare = useCallback(
    async (formData: FormData) => {
      let nextHtml = sourceMode ? html : (editor?.getHTML() ?? html);
      releaseRemovedImages(nextHtml);

      for (const [source, file] of [...pendingImages.current]) {
        try {
          const upload = await uploadProductImage(file);
          nextHtml = replacePendingImageSources(
            nextHtml,
            new Map([[source, upload.publicUrl]]),
          );
          pendingImages.current.delete(source);
          URL.revokeObjectURL(source);
        } catch (caught) {
          editor?.commands.setContent(nextHtml, { emitUpdate: false });
          setHtml(nextHtml);
          setPendingCount(pendingImages.current.size);
          throw caught;
        }
      }

      editor?.commands.setContent(nextHtml, { emitUpdate: false });
      setHtml(nextHtml);
      setPendingCount(0);
      formData.set(name, nextHtml);
    },
    [editor, html, name, releaseRemovedImages, sourceMode],
  );

  useDeferredUploadTask(prepare);

  const command = (
    commandLabel: string,
    active: boolean,
    run: () => void,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={commandLabel}
      aria-pressed={active}
      onClick={run}
      className="grid size-10 place-items-center border-r border-border text-primary hover:bg-background aria-pressed:bg-primary aria-pressed:text-white"
    >
      {icon}
    </button>
  );

  function insertImage(file?: File) {
    if (!file || !editor) return;
    setError("");
    try {
      validateProductImage(file);
      const alt =
        window.prompt("Describe this image for screen-reader users", "") ?? "";
      const source = URL.createObjectURL(file);
      pendingImages.current.set(source, file);
      setPendingCount(pendingImages.current.size);
      editor.chain().focus().setImage({ src: source, alt: alt.trim() }).run();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The image is invalid.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function toggleSource() {
    if (!editor) return;
    if (sourceMode) {
      editor.commands.setContent(html, { emitUpdate: false });
      releaseRemovedImages(html);
    } else {
      setHtml(editor.getHTML());
    }
    setSourceMode((value) => !value);
  }

  return (
    <div className="space-y-1 sm:col-span-2">
      <Label className="text-xs font-bold text-[#303030]">{label}</Label>
      <input type="hidden" name={name} value={html} />
      <div className="overflow-hidden rounded-control border border-border bg-surface shadow-2xs focus-within:ring-1 focus-within:ring-ring">
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap border-b border-border bg-surface-warm/50"
        >
          {command(
            "Bold",
            editor?.isActive("bold") ?? false,
            () => editor?.chain().focus().toggleBold().run(),
            <Bold className="size-4" />,
          )}
          {command(
            "Italic",
            editor?.isActive("italic") ?? false,
            () => editor?.chain().focus().toggleItalic().run(),
            <Italic className="size-4" />,
          )}
          {command(
            "Heading",
            editor?.isActive("heading", { level: 2 }) ?? false,
            () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
            <Heading2 className="size-4" />,
          )}
          {command(
            "Bullet list",
            editor?.isActive("bulletList") ?? false,
            () => editor?.chain().focus().toggleBulletList().run(),
            <List className="size-4" />,
          )}
          {command(
            "Numbered list",
            editor?.isActive("orderedList") ?? false,
            () => editor?.chain().focus().toggleOrderedList().run(),
            <ListOrdered className="size-4" />,
          )}
          {command(
            "Blockquote",
            editor?.isActive("blockquote") ?? false,
            () => editor?.chain().focus().toggleBlockquote().run(),
            <Quote className="size-4" />,
          )}
          {command(
            "Link",
            editor?.isActive("link") ?? false,
            () => {
              if (!editor) return;
              const href = window.prompt(
                "Link URL",
                editor.getAttributes("link").href ?? "https://",
              );
              if (href === null) return;
              if (!href.trim()) editor.chain().focus().unsetLink().run();
              else
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: href.trim() })
                  .run();
            },
            <LinkIcon className="size-4" />,
          )}
          {command(
            "Undo",
            false,
            () => editor?.chain().focus().undo().run(),
            <Undo2 className="size-4" />,
          )}
          {command(
            "Redo",
            false,
            () => editor?.chain().focus().redo().run(),
            <Redo2 className="size-4" />,
          )}
          <input
            ref={fileInput}
            type="file"
            accept={productImageAccept}
            className="sr-only"
            onChange={(event) => insertImage(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={sourceMode}
            aria-label="Add image"
            onClick={() => fileInput.current?.click()}
            className="grid size-10 place-items-center border-r border-border text-primary hover:bg-background disabled:opacity-50"
          >
            <ImagePlus className="size-4" />
          </button>
          <span
            role="status"
            aria-live="polite"
            className="inline-flex min-h-10 items-center px-3 text-xs font-semibold text-muted"
          >
            {pendingCount
              ? `${pendingCount} image${pendingCount === 1 ? "" : "s"} will upload when saved.`
              : null}
          </span>
          <button
            type="button"
            aria-pressed={sourceMode}
            onClick={toggleSource}
            className="ml-auto inline-flex min-h-10 items-center gap-2 px-3 text-xs font-bold text-primary hover:bg-background"
          >
            <Code2 className="size-4" />
            HTML
          </button>
        </div>
        {sourceMode ? (
          <textarea
            aria-label={`${label} HTML`}
            value={html}
            onChange={(event) => {
              setHtml(event.target.value);
              releaseRemovedImages(event.target.value);
            }}
            className="min-h-64 w-full resize-y p-4 font-mono text-sm focus:outline-none"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Paste formatted content or use the toolbar. Images upload when the
        product is saved, and HTML is sanitized on the server.
      </p>
    </div>
  );
}
