import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type BulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type ParsedRow = {
  name: string;
  ein?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
};

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);

  const detectDelimiter = (text: string): string => {
    const firstLine = (text.split(/\r?\n/)[0] || '').trim();
    // Heuristic: choose the delimiter that yields the most tokens (>1)
    const candidates: Array<{ d: string; tokens: number }> = [
      { d: '\t', tokens: firstLine.split('\t').length },
      { d: '|', tokens: firstLine.split('|').length },
      { d: ',', tokens: firstLine.split(',').length },
      { d: ';', tokens: firstLine.split(';').length },
    ];
    candidates.sort((a, b) => b.tokens - a.tokens);
    const best = candidates.find(c => c.tokens > 1);
    // Priority order on ties: tab > pipe > comma > semicolon
    const ordered = ['\t', '|', ',', ';'];
    if (best) return best.d;
    // Default to pipe if present in raw line
    if (firstLine.includes('|')) return '|';
    return ',';
  };
  
  const normalizeHeader = (header: string): string => {
    // Remove quotes, special characters, extra spaces, and convert to lowercase
    return header.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  };
  
  const matchHeader = (header: string): string | null => {
    const normalized = normalizeHeader(header);
    const original = header.trim().toLowerCase();
    
    console.log('🔍 Matching header:', { original: header, normalized, comparing: original });
    
    // Name variations - check exact matches first, then contains
    if (original === 'name' || normalized === 'name' || 
        original === 'nonprofit name' || original === 'cause name' ||
        normalized.includes('name') || normalized.includes('legal') || 
        normalized.includes('organization') || normalized.includes('nonprofit') ||
        normalized.includes('cause')) {
      console.log('✅ Matched as: name');
      return 'name';
    }
    // EIN variations
    if (original === 'ein' || normalized === 'ein' || 
        normalized.includes('ein') || normalized.includes('tax') || 
        normalized.includes('id number')) {
      console.log('✅ Matched as: ein');
      return 'ein';
    }
    // City variations
    if (original === 'city' || normalized === 'city' || normalized.includes('city')) {
      console.log('✅ Matched as: city');
      return 'city';
    }
    // State variations
    if (original === 'state' || original === 'st' || normalized === 'st' || normalized === 'state') {
      console.log('✅ Matched as: state');
      return 'state';
    }
    // Country variations
    if (original === 'country' || normalized === 'country' || normalized.includes('country')) {
      console.log('✅ Matched as: country');
      return 'country';
    }
    // Description variations
    if (normalized.includes('description') || normalized.includes('purpose') || 
        normalized.includes('mission') || normalized.includes('about')) {
      console.log('✅ Matched as: description');
      return 'description';
    }
    
    console.log('❌ No match found');
    return null;
  };

  const parseCSV = (text: string): ParsedRow[] => {
    console.log('📄 Raw file content (first 500 chars):', text.substring(0, 500));
    
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    console.log('📊 Total lines after filtering:', lines.length);
    
    // Support headerless files too; only error if completely empty
    if (lines.length < 1) {
      console.error('❌ Empty file: no lines found');
      return [];
    }
    
    let delimiter = detectDelimiter(text);
    const describeDelimiter = (d: string) => d === '\t' ? 'tab' : d === '|' ? 'pipe (|)' : d === ',' ? 'comma (,)' : 'semicolon (;)';
    console.log('🔍 Detected delimiter:', describeDelimiter(delimiter));
    
    const splitLine = (line: string) =>
      (delimiter === '\t'
        ? line.split('\t')
        : line.split(new RegExp(`\\s*\\${delimiter}\\s*`))
      ).map(v => v.trim().replace(/^["']|["']$/g, ''));

    let rawFirst = splitLine(lines[0]);

    // Fallback override: if not split, but content contains common delimiters
    if (rawFirst.length === 1) {
      const candidates: string[] = ['\t', '|', ',', ';'];
      for (const c of candidates) {
        if (lines[0].includes(c) && c !== delimiter) {
          delimiter = c;
          rawFirst = (delimiter === '\t'
            ? lines[0].split('\t')
            : lines[0].split(new RegExp(`\\s*\\${delimiter}\\s*`))
          ).map(v => v.trim().replace(/^["']|["']$/g, ''));
          console.warn('🔁 Overriding delimiter based on content:', describeDelimiter(delimiter));
          break;
        }
      }
    }

    console.log('📋 First line tokens:', rawFirst);

    // Try to interpret first line as header
    const headerMatches = rawFirst.map(h => matchHeader(h));
    console.log('📋 Header candidates:', headerMatches);

    const einLike = (val?: string) => {
      if (!val) return false;
      const clean = val.replace(/[^0-9]/g, '');
      return clean.length === 9;
    };

    let adjustedHeaders: (string | null)[] = [];
    let startRow = 1;

    const looksLikeData = einLike(rawFirst[0]) && !!rawFirst[1] && rawFirst[1].length >= 3;

    if (looksLikeData && !headerMatches.some(h => h)) {
      // No header row present; map by position
      const positional = ['ein', 'name', 'city', 'state', 'country', 'description'];
      adjustedHeaders = positional.slice(0, rawFirst.length);
      startRow = 0;
      console.warn('⚠️ No header row detected. Treating as headerless with order: EIN | Name | City | State | Country | Description');
    } else {
      // Use detected headers
      console.log('📋 Raw headers:', rawFirst);
      console.log('📋 Matched headers:', headerMatches);
      adjustedHeaders = [...headerMatches];
      // Ensure we have a name mapping
      const hasNameColumn = headerMatches.some(h => h === 'name');
      if (!hasNameColumn) {
        const einIdx = headerMatches.findIndex(h => h === 'ein');
        if (einIdx !== -1 && rawFirst[einIdx + 1]) {
          adjustedHeaders[einIdx + 1] = 'name';
          console.warn('⚠️ No explicit name column found. Using the column after EIN as Name:', rawFirst[einIdx + 1]);
        } else {
          console.error('❌ No "name" column found in headers. Available headers:', rawFirst);
          console.error('💡 Expected headers like: "Name", "Nonprofit Name", "Cause Name", "Organization Name", etc. Or provide headerless file with order: EIN | Name | City | State | Country');
          return [];
        }
      } else {
        console.log('✅ Name column detected.');
      }
    }
    
    const rows: ParsedRow[] = [];
    
    for (let i = startRow; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = delimiter === '\t'
        ? line.split('\t').map(v => v.trim().replace(/^["']|["']$/g, ''))
        : line.split(new RegExp(`\\s*\\${delimiter}\\s*`)).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      console.log(`📝 Processing row ${i}:`, values);
      
      const row: ParsedRow = { name: '' };
      let nameFound = false;
      
      adjustedHeaders.forEach((header, idx) => {
        const value = values[idx]?.trim() || '';
        
        switch (header) {
          case 'name':
            if (value && value.length > 0) {
              row.name = value;
              nameFound = true;
              console.log(`✅ Found name in row ${i}:`, value);
            }
            break;
          case 'ein':
            if (value) {
              // Format EIN to XX-XXXXXXX if it's just numbers
              const cleanEIN = value.replace(/[^0-9]/g, '');
              if (cleanEIN.length === 9) {
                row.ein = `${cleanEIN.slice(0, 2)}-${cleanEIN.slice(2)}`;
              } else {
                row.ein = value;
              }
            }
            break;
          case 'city':
            if (value) row.city = value;
            break;
          case 'state':
            if (value) {
              // Ensure state is uppercase 2-letter code
              row.state = value.toUpperCase().slice(0, 2);
            }
            break;
          case 'country':
            if (value) row.country = value;
            break;
          case 'description':
            if (value) row.description = value;
            break;
        }
      });
      
      // Only add rows that have a valid name (at least 3 characters)
      if (row.name && row.name.length >= 3) {
        rows.push(row);
        console.log(`✅ Added row ${i} to import list`);
      } else {
        console.log(`⚠️ Skipping row ${i} - name too short or missing:`, row.name);
      }
    }
    
    console.log('✅ Successfully parsed rows:', rows.length);
    if (rows.length > 0) {
      console.log('📝 First 3 sample rows:', rows.slice(0, 3));
    } else {
      console.error('❌ No rows with valid names found');
      console.error('💡 Make sure your file has a column labeled "Name" and at least one row with a name that is 3+ characters');
    }
    
    return rows;
  };

  const validateRows = (rows: ParsedRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const einPattern = /^\d{2}-\d{7}$/;
    
    rows.forEach((row, idx) => {
      if (!row.name || row.name.length < 3) {
        errors.push({ row: idx + 2, field: 'name', message: 'Name is required (min 3 chars)' });
      }
      if (row.ein && !einPattern.test(row.ein)) {
        errors.push({ row: idx + 2, field: 'ein', message: 'EIN must be format XX-XXXXXXX' });
      }
      if (row.state && row.state.length !== 2) {
        errors.push({ row: idx + 2, field: 'state', message: 'State must be 2-letter code' });
      }
    });
    
    return errors;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setValidationErrors([]);
    setPreview([]);
    
    try {
      toast.info(`Processing file: ${selectedFile.name}...`);
      console.log('📁 File details:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        const lines = text.split('\n').filter(l => l.trim());
        const delimiter = detectDelimiter(text);
        const rawHeaders = lines.length > 0 
          ? (delimiter === '\t' ? lines[0].split('\t') : lines[0].split(new RegExp(`\\s*\\${delimiter}\\s*`)))
          : [];
        const delimiterName = delimiter === '\t' ? 'tab' : delimiter === '|' ? 'pipe (|)' : 'comma (,)';
        
        toast.error(
          'No valid nonprofit records found',
          { 
            description: `Your file was processed but no valid nonprofit names were found. Check the browser console (F12) to see detailed parsing information. Make sure your file has:\n• A column labeled "Name" (or similar)\n• At least one row with a nonprofit name (3+ characters)\n• Delimiter: ${delimiterName}`,
            duration: 10000 
          }
        );
        
        console.error('❌ Parsing failed. Summary:');
        console.error('- File has', lines.length, 'lines');
        console.error('- Detected delimiter:', delimiterName);
        console.error('- Found headers:', rawHeaders);
        console.error('- Expected: A column matching "Name", "Nonprofit Name", "Cause Name", or similar');
        console.error('- No rows with valid nonprofit names (3+ chars) were found');
        
        setFile(null);
        return;
      }
      
      const errors = validateRows(rows);
      
      setPreview(rows.slice(0, 5));
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        toast.warning(`File loaded with ${errors.length} validation errors that need fixing.`);
      } else {
        toast.success(`File validated successfully! Found ${rows.length} records ready to import.`);
      }
    } catch (error: any) {
      console.error('❌ File processing error:', error);
      toast.error(`Failed to read file: ${error.message}`);
      setFile(null);
      setPreview([]);
      setValidationErrors([]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    toast.loading('Starting import process...');
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const errors = validateRows(rows);
      
      if (errors.length > 0) {
        toast.dismiss();
        toast.error(`Cannot import: Found ${errors.length} validation errors. Please fix and retry.`);
        setImporting(false);
        return;
      }
      
      toast.dismiss();
      toast.loading(`Checking for duplicates...`);
      
      // Check for duplicates
      const eins = rows.filter(r => r.ein).map(r => r.ein!);
      let duplicateCount = 0;
      
      if (eins.length > 0) {
        const { data: existing } = await supabase
          .from('nonprofits')
          .select('ein')
          .in('ein', eins);
        
        duplicateCount = existing?.length || 0;
        if (duplicateCount > 0) {
          toast.dismiss();
          toast.info(`Found ${duplicateCount} existing nonprofits. They will be skipped.`);
        }
      }
      
      toast.dismiss();
      toast.loading(`Importing ${rows.length} nonprofits...`);
      
      // Batch insert with source marked as 'irs' for IRS data
      const toInsert = rows.map(row => ({
        name: row.name,
        ein: row.ein || null,
        city: row.city || null,
        state: row.state || null,
        country: row.country || 'US',
        description: row.description || null,
        source: 'irs',
        approved: true,
      }));
      
      const { error } = await supabase
        .from('nonprofits')
        .upsert(toInsert, { onConflict: 'ein', ignoreDuplicates: true });
      
      if (error) throw error;
      
      toast.dismiss();
      
      const importedCount = rows.length - duplicateCount;
      toast.success(
        `Successfully imported ${importedCount} nonprofit${importedCount !== 1 ? 's' : ''}! ` +
        (duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : '')
      );
      
      onSuccess();
      onOpenChange(false);
      setFile(null);
      setPreview([]);
      setValidationErrors([]);
    } catch (error: any) {
      toast.dismiss();
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 text-white border-white/20 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Nonprofits</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload a CSV or TXT file with nonprofit data. The system will automatically detect the delimiter and match column headers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Data File (CSV or TXT)</Label>
            <p className="text-xs text-white/60 mt-1">
              Supported formats: CSV, TXT (tab, pipe |, or comma delimited). Headers optional.
            </p>
            <p className="text-xs text-white/60 mt-1">
              Headerless order supported: EIN | Nonprofit Name | City | State | Country | Description
            </p>
            <div className="mt-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-white/80
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500/20 file:text-blue-300
                  hover:file:bg-blue-500/30
                  cursor-pointer"
              />
            </div>
          </div>
          
          {validationErrors.length > 0 && (
            <Alert className="bg-red-500/20 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">{validationErrors.length} validation errors:</div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                  {validationErrors.slice(0, 10).map((err, idx) => (
                    <div key={idx}>Row {err.row}, {err.field}: {err.message}</div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div className="text-white/60">...and {validationErrors.length - 10} more</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {preview.length > 0 && validationErrors.length === 0 && (
            <Alert className="bg-green-500/20 border-green-500/30">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Preview (first 5 rows):</div>
                <div className="space-y-1 text-xs">
                  {preview.map((row, idx) => (
                    <div key={idx} className="truncate">
                      {row.name} {row.ein && `(${row.ein})`} {row.city && `- ${row.city}, ${row.state}`}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || validationErrors.length > 0 || importing}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
