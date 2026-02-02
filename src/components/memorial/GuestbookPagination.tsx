import { ChevronLeft, ChevronRight } from "lucide-react";

interface GuestbookPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const GuestbookPagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: GuestbookPaginationProps) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("...");
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-memorial-dark-muted/20">
      {/* Previous button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className={`p-2 rounded-sm transition-all ${
          currentPage === 1
            ? "text-memorial-dark-muted/40 cursor-not-allowed"
            : "text-memorial-dark-muted hover:text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
        }`}
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            className={`min-w-[36px] h-9 px-3 rounded-sm font-sans text-sm transition-all ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : page === "..."
                ? "text-memorial-dark-muted cursor-default"
                : "text-memorial-dark-muted hover:text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-sm transition-all ${
          currentPage === totalPages
            ? "text-memorial-dark-muted/40 cursor-not-allowed"
            : "text-memorial-dark-muted hover:text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
        }`}
        aria-label="Page suivante"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default GuestbookPagination;
