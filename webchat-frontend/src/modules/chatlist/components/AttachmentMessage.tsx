import {
  Download,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileCode2,
} from "lucide-react";
import { formatFileSize } from "../../../utils/common.util";
import { decryptImage } from "../../../utils/image-enc.util";

type AttachmentPayload = {
  fileName?: string;
  fileSize?: number;
  imgUrl: string;
  mimeType?: string;
};

function getFileIcon(mimeType?: string) {
  if (!mimeType) return FileText;

  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar")
  ) {
    return FileArchive;
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  ) {
    return FileSpreadsheet;
  }

  if (
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript")
  ) {
    return FileCode2;
  }

  return FileText;
}

async function downloadAttachment(attachment: AttachmentPayload) {
  try {
    const { imgUrl, fileName } = attachment;
    const response = await fetch(imgUrl);

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "attachment";

    document.body.appendChild(a);
    a.click();

    a.remove();

    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error(error);
  }
}

export function AttachmentMessage({
  attachment,
  className,
}: {
  attachment: AttachmentPayload;
  className?: string;
}) {
  const Icon = getFileIcon(attachment.mimeType);

  return (
    <div
      className={`
        group
        flex
        items-center
        justify-between
        gap-4
        rounded-2xl
        border
        border-zinc-200/80
        bg-zinc-50
        px-4
        py-3
        transition-all
        hover:border-zinc-300
        hover:bg-zinc-100/80
        dark:border-zinc-800
        dark:bg-zinc-900/70
        dark:hover:border-zinc-700
        dark:hover:bg-zinc-900
        ${className || ""}
      `}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-white
            shadow-sm
            dark:bg-zinc-800
          "
        >
          <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
        </div>

        <div className="min-w-0">
          <p
            className="
              truncate
              text-sm
              font-medium
              text-zinc-900
              dark:text-zinc-100
            "
          >
            {attachment.fileName || "Attachment"}
          </p>

          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {attachment.fileSize
                ? formatFileSize(attachment.fileSize)
                : "Unknown size"}
            </span>

            {/* {attachment.mimeType && (
              <>
                <div className="h-1 w-1 rounded-full bg-zinc-400" />

                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {attachment.mimeType}
                </span>
              </>
            )} */}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => downloadAttachment(attachment)}
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          border-zinc-200
          bg-white
          transition-all
          hover:scale-[1.03]
          hover:bg-zinc-100
          active:scale-[0.97]
          dark:border-zinc-700
          dark:bg-zinc-800
          dark:hover:bg-zinc-700
        "
      >
        <Download
          className="
            h-4
            w-4
            text-zinc-700
            dark:text-zinc-200
          "
        />
      </button>
    </div>
  );
}
