export function getImageUrl(path?: string) {
    if (!path) return "/placeholder.png";
  
    // Already full URL
    if (path.startsWith("http")) return path;
  
    const base = process.env.NEXT_PUBLIC_STORAGE_URL;
  
    if (!base) {
      console.error("NEXT_PUBLIC_STORAGE_URL is missing");
      return path;
    }
  
    return `${base}/${path.replace(/^\/+/, "")}`;
  }
  