interface ArticleContentProps {
  children: React.ReactNode
  className?: string
}

export function ArticleContent({ children, className = "" }: ArticleContentProps) {
  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {children}
    </div>
  )
}

