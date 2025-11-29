import React from "react";
import { Info, CheckCircle2, Sparkles } from "lucide-react";

interface ProductDescriptionProps {
  description: string;
  productName?: string;
}

export default function ProductDescription({ description, productName }: ProductDescriptionProps) {
  // Parse description into structured content
  const parseDescription = (text: string) => {
    // Split by line breaks or bullet points
    const lines = text.split(/[\n\r]+|(?=[•\-\*]\s)/).filter(line => line.trim());
    
    const bulletPoints: string[] = [];
    const paragraphs: string[] = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      // Check if line starts with bullet point indicators
      if (trimmedLine.match(/^[•\-\*]\s*/)) {
        bulletPoints.push(trimmedLine.replace(/^[•\-\*]\s*/, ''));
      } else if (trimmedLine.length > 0) {
        // Check if it looks like a feature (short, capitalized, or contains colon)
        if (trimmedLine.includes(':') && trimmedLine.length < 100) {
          bulletPoints.push(trimmedLine);
        } else {
          paragraphs.push(trimmedLine);
        }
      }
    });
    
    return { bulletPoints, paragraphs };
  };

  const { bulletPoints, paragraphs } = parseDescription(description);
  
  // If description is very short or simple, show it cleanly
  if (description.length < 150 && bulletPoints.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-5">
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
    <div className="rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Product Description</h4>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Main description paragraphs */}
        {paragraphs.length > 0 && (
          <div className="space-y-3">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        )}
        
        {/* Features/Bullet points */}
        {bulletPoints.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Key Features
            </h5>
            <ul className="grid gap-2">
              {bulletPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* If no structured content was parsed, show raw description nicely */}
        {paragraphs.length === 0 && bulletPoints.length === 0 && (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
