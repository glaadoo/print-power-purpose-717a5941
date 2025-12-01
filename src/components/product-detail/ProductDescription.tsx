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
    
    if (!text || text.trim().length === 0) {
      return { bulletPoints, introText };
    }
    
    // Normalize line breaks and clean up text
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\. +/g, '.\n') // Add line break after periods followed by spaces (common in single-line descriptions)
      .trim();
    
    // First, check if description contains semicolons (common pattern for feature lists)
    if (normalizedText.includes(';')) {
      const parts = normalizedText.split(';').map(part => part.trim()).filter(part => part.length > 0);
      parts.forEach(part => {
        const cleanPart = part.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanPart.length > 0) {
          bulletPoints.push(cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1));
        }
      });
      return { bulletPoints, introText };
    }
    
    // Split by line breaks or bullet points
    const lines = normalizedText.split(/\n+|(?=[•\-\*]\s)/).map(line => line.trim()).filter(line => line.length > 0);
    
    // If we have multiple lines, treat them as bullet points
    if (lines.length > 1) {
      lines.forEach(line => {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanLine.length > 0) {
          // Remove trailing period for consistency, then add back if needed
          const formattedLine = cleanLine.replace(/\.+$/, '');
          bulletPoints.push(formattedLine.charAt(0).toUpperCase() + formattedLine.slice(1));
        }
      });
      return { bulletPoints, introText };
    }
    
    // Single line - check if it's a long text that should be split
    const singleLine = lines[0] || normalizedText;
    
    // Try to split by commas if it's a long feature list
    if (singleLine.length > 80 && singleLine.includes(',')) {
      const commaParts = singleLine.split(',').map(p => p.trim()).filter(p => p.length > 3);
      if (commaParts.length >= 2) {
        commaParts.forEach(part => {
          const cleanPart = part.replace(/\.+$/, '');
          bulletPoints.push(cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1));
        });
        return { bulletPoints, introText };
      }
    }
    
    // If still a single line that's short, show as intro text
    if (singleLine.length < 200) {
      introText = singleLine;
    } else {
      // Long text without clear separators - show as intro
      introText = singleLine;
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
