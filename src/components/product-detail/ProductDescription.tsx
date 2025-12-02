import React from "react";
import { Info, CheckCircle2, Sparkles, Package, Ruler, Shirt, AlertCircle, FileText } from "lucide-react";

interface ProductDescriptionProps {
  description: string;
  productName?: string;
}

interface ParsedSection {
  title: string;
  icon: React.ReactNode;
  items: string[];
}

const SECTION_KEYWORDS: Record<string, { keywords: string[]; icon: React.ReactNode }> = {
  'Features': {
    keywords: ['feature', 'includes', 'benefits', 'highlights', 'specifications'],
    icon: <Sparkles className="w-4 h-4" />
  },
  'Material': {
    keywords: ['material', 'made from', 'fabric', 'composition', 'constructed'],
    icon: <Package className="w-4 h-4" />
  },
  'Care Instructions': {
    keywords: ['care', 'wash', 'clean', 'maintain', 'dry', 'iron'],
    icon: <Shirt className="w-4 h-4" />
  },
  'Notes': {
    keywords: ['note', 'important', 'please', 'warning', 'caution'],
    icon: <AlertCircle className="w-4 h-4" />
  }
};

// Check if description is meaningful (not just internal codes or vendor IDs)
const isMeaningfulDescription = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;
  
  const cleaned = text.trim();
  
  // Skip if it's just an internal code (contains underscores, no spaces, very short)
  if (cleaned.includes('_') && !cleaned.includes(' ') && cleaned.length < 50) return false;
  
  // Skip if it looks like a product ID or code
  if (/^[a-z0-9_-]+$/i.test(cleaned) && cleaned.length < 30) return false;
  
  // Skip if too short to be meaningful
  if (cleaned.length < 10) return false;
  
  return true;
};

export default function ProductDescription({ description, productName }: ProductDescriptionProps) {
  // Don't render anything if description is not meaningful
  if (!isMeaningfulDescription(description)) {
    return null;
  }

  const parseDescription = (text: string): { sections: ParsedSection[]; generalPoints: string[] } => {
    const sections: ParsedSection[] = [];
    const generalPoints: string[] = [];
    
    if (!text || text.trim().length === 0) {
      return { sections, generalPoints };
    }
    
    // Clean and normalize text
    let normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Split into individual items by various delimiters
    let items: string[] = [];
    
    // Check for semicolons (common in product descriptions)
    if (normalizedText.includes(';')) {
      items = normalizedText.split(';').map(s => s.trim()).filter(s => s.length > 0);
    } 
    // Check for bullet points or line breaks
    else if (normalizedText.includes('\n') || normalizedText.includes('•') || normalizedText.includes('-')) {
      items = normalizedText
        .split(/[\n•\-\*]+/)
        .map(s => s.trim())
        .filter(s => s.length > 3);
    }
    // Check for periods followed by capital letters (sentences)
    else if (/\.\s+[A-Z]/.test(normalizedText)) {
      items = normalizedText
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .map(s => s.trim().replace(/\.+$/, ''))
        .filter(s => s.length > 3);
    }
    // Long comma-separated list
    else if (normalizedText.includes(',') && normalizedText.length > 100) {
      items = normalizedText
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 3);
    }
    // Single block of text - try to break intelligently
    else {
      items = [normalizedText];
    }
    
    // Clean up items
    items = items.map(item => {
      let cleaned = item
        .replace(/^[•\-\*\d\.]+\s*/, '') // Remove leading bullets/numbers
        .replace(/\.+$/, '') // Remove trailing periods
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Capitalize first letter
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      
      return cleaned;
    }).filter(item => item.length > 2);
    
    // Categorize items into sections
    const categorizedItems = new Map<string, string[]>();
    
    items.forEach(item => {
      const lowerItem = item.toLowerCase();
      let matched = false;
      
      for (const [sectionName, config] of Object.entries(SECTION_KEYWORDS)) {
        if (config.keywords.some(keyword => lowerItem.includes(keyword))) {
          if (!categorizedItems.has(sectionName)) {
            categorizedItems.set(sectionName, []);
          }
          categorizedItems.get(sectionName)!.push(item);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        generalPoints.push(item);
      }
    });
    
    // Convert to sections array
    categorizedItems.forEach((sectionItems, sectionName) => {
      const config = SECTION_KEYWORDS[sectionName];
      sections.push({
        title: sectionName,
        icon: config.icon,
        items: sectionItems
      });
    });
    
    return { sections, generalPoints };
  };

  const { sections, generalPoints } = parseDescription(description);
  const hasContent = sections.length > 0 || generalPoints.length > 0;
  
  // Simple display for very short descriptions
  if (description.length < 100 && sections.length === 0 && generalPoints.length <= 1) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">About This Product</h4>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* General Features Section */}
      {generalPoints.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground text-sm">Product Details</h4>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-2.5">
              {generalPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-muted-foreground text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Categorized Sections */}
      {sections.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-primary">{section.icon}</span>
                  <h4 className="font-semibold text-foreground text-sm">{section.title}</h4>
                </div>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60 mt-2" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Fallback if no structured content */}
      {!hasContent && description && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}
