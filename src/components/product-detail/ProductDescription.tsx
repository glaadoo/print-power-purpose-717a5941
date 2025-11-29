import React from "react";
import { Info, CheckCircle2, Sparkles } from "lucide-react";

interface ProductDescriptionProps {
  description: string;
  productName?: string;
}

export default function ProductDescription({ description, productName }: ProductDescriptionProps) {
  // Parse description into structured content
  const parseDescription = (text: string) => {
    const bulletPoints: string[] = [];
    let introText = "";
    
    // First, check if description contains semicolons (common pattern for feature lists)
    if (text.includes(';')) {
      const parts = text.split(';').map(part => part.trim()).filter(part => part.length > 0);
      parts.forEach(part => {
        // Clean up the part and add as bullet point
        const cleanPart = part.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanPart.length > 0) {
          // Capitalize first letter
          bulletPoints.push(cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1));
        }
      });
      return { bulletPoints, introText };
    }
    
    // Split by line breaks or bullet points
    const lines = text.split(/[\n\r]+|(?=[•\-\*]\s)/).filter(line => line.trim());
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      // Check if line starts with bullet point indicators
      if (trimmedLine.match(/^[•\-\*]\s*/)) {
        bulletPoints.push(trimmedLine.replace(/^[•\-\*]\s*/, ''));
      } else if (trimmedLine.length > 0) {
        // Check if it looks like a feature (contains colon or is short)
        if ((trimmedLine.includes(':') && trimmedLine.length < 100) || trimmedLine.length < 80) {
          bulletPoints.push(trimmedLine);
        } else {
          // Longer text becomes intro
          introText = trimmedLine;
        }
      }
    });
    
    // If we only have one long text and no bullet points, try to split by commas
    if (bulletPoints.length === 0 && introText.length > 100 && introText.includes(',')) {
      const commaParts = introText.split(',').map(p => p.trim()).filter(p => p.length > 3);
      if (commaParts.length >= 3) {
        commaParts.forEach(part => {
          bulletPoints.push(part.charAt(0).toUpperCase() + part.slice(1));
        });
        introText = "";
      }
    }
    
    return { bulletPoints, introText };
  };

  const { bulletPoints, introText } = parseDescription(description);
  
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
          <h4 className="font-semibold text-foreground">Product Features</h4>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Intro text if present */}
        {introText && (
          <p className="text-muted-foreground leading-relaxed">{introText}</p>
        )}
        
        {/* Features/Bullet points */}
        {bulletPoints.length > 0 && (
          <ul className="grid gap-3">
            {bulletPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                </div>
                <span className="text-muted-foreground leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* If no structured content was parsed, show raw description nicely */}
        {!introText && bulletPoints.length === 0 && (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
