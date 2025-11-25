export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="relative w-full aspect-square bg-gray-200" />
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Category Label */}
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        
        {/* Product Name */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full" />
          <div className="h-4 bg-gray-300 rounded w-2/3" />
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-12" />
        </div>
        
        {/* Price */}
        <div className="h-6 bg-gray-300 rounded w-32" />
        
        {/* Button */}
        <div className="h-10 bg-gray-200 rounded-full w-full" />
      </div>
    </div>
  );
}
