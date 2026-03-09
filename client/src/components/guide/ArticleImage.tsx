interface ArticleImageProps {
  src?: string
  alt: string
  caption?: string
  className?: string
}

export function ArticleImage({ src, alt, caption, className = "" }: ArticleImageProps) {
  if (!src) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center ${className}`}>
        <svg
          className="h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-500 text-sm">{alt || "Hình ảnh minh họa"}</p>
      </div>
    )
  }

  return (
    <figure className={`my-6 ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg shadow-md"
      />
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

