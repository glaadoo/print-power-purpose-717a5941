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

type SchoolBulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type ParsedSchool = {
  name: string;
  city: string;
  state: string;
  zip: string;
  address_line1?: string;
  district?: string;
  county?: string;
  school_level?: string;
};

export default function SchoolBulkImportDialog({ open, onOpenChange, onSuccess }: SchoolBulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [preview, setPreview] = useState<ParsedSchool[]>([]);

  const detectDelimiter = (text: string): string => {
    const firstLine = (text.split(/\r?\n/)[0] || '').replace(/^\uFEFF/, '').trim();
    const candidates: Array<{ d: string; tokens: number }> = [
      { d: '\t', tokens: firstLine.split('\t').length },
      { d: '|', tokens: firstLine.split('|').length },
      { d: ',', tokens: firstLine.split(',').length },
      { d: ';', tokens: firstLine.split(';').length },
    ];
    candidates.sort((a, b) => b.tokens - a.tokens);
    const best = candidates.find(c => c.tokens > 1);
    const ordered = ['\t', '|', ',', ';'];
    if (best) return best.d;
    if (firstLine.includes('|')) return '|';
    return ',';
  };
  
  const normalizeHeader = (header: string): string => {
    return header.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  };
  
  const matchHeader = (header: string): string | null => {
    const normalized = normalizeHeader(header);
    const original = header.trim().toLowerCase();
    const upper = header.trim().toUpperCase();
    
    // NCES format: SCH_NAME
    if (upper === 'SCH_NAME') return 'name';
    
    // NCES format: MCITY (mailing) or LCITY (location)
    if (upper === 'MCITY' || upper === 'LCITY') return 'city';
    
    // NCES format: MSTATE or LSTATE
    if (upper === 'MSTATE' || upper === 'LSTATE') return 'state';
    
    // NCES format: MZIP or LZIP
    if (upper === 'MZIP' || upper === 'LZIP') return 'zip';
    
    // NCES format: MSTREET1 or LSTREET1
    if (upper === 'MSTREET1' || upper === 'LSTREET1') return 'address_line1';
    
    // NCES format: LEA_NAME (Local Education Agency)
    if (upper === 'LEA_NAME') return 'district';
    
    // NCES format: LEVEL
    if (upper === 'LEVEL') return 'school_level';
    
    // Standard variations below
    // School name variations
    if (original === 'name' || normalized === 'name' || 
        original === 'school name' || normalized.includes('school') ||
        normalized.includes('name')) {
      return 'name';
    }
    // City variations
    if (original === 'city' || normalized === 'city' || normalized.includes('city')) {
      return 'city';
    }
    // State variations
    if (original === 'state' || original === 'st' || normalized === 'st' || normalized === 'state') {
      return 'state';
    }
    // ZIP variations
    if (original === 'zip' || original === 'zip code' || normalized === 'zip' || 
        normalized.includes('zip') || normalized.includes('postal')) {
      return 'zip';
    }
    // Address variations
    if (normalized.includes('address') || normalized.includes('street')) {
      return 'address_line1';
    }
    // District variations
    if (normalized.includes('district')) {
      return 'district';
    }
    // County variations
    if (normalized.includes('county')) {
      return 'county';
    }
    // School level variations
    if (normalized.includes('level') || normalized.includes('grade') || normalized.includes('type')) {
      return 'school_level';
    }
    
    return null;
  };

  const parseCSV = (text: string): ParsedSchool[] => {
    const lines = text.split(/\r?\n/).map(l => l.replace(/^\uFEFF/, '')).filter(l => l.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(text);
    const headerLine = lines[0];
    const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

    const headerMap: Record<string, number> = {};
    headers.forEach((rawHeader, idx) => {
      const matched = matchHeader(rawHeader);
      if (matched) {
        headerMap[matched] = idx;
      }
    });

    const schools: ParsedSchool[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));

      const school: any = {};
      Object.keys(headerMap).forEach(field => {
        const val = values[headerMap[field]] || '';
        school[field] = val;
      });

      // Required fields
      if (school.name && school.city && school.state && school.zip) {
        schools.push({
          name: school.name,
          city: school.city,
          state: school.state,
          zip: school.zip,
          address_line1: school.address_line1 || undefined,
          district: school.district || undefined,
          county: school.county || undefined,
          school_level: school.school_level || undefined,
        });
      }
    }

    return schools;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationErrors([]);
    setPreview([]);

    try {
      const text = await selectedFile.text();
      let parsedData: ParsedSchool[] = [];

      if (selectedFile.name.endsWith('.json')) {
        const json = JSON.parse(text);
        parsedData = Array.isArray(json) ? json : [json];
      } else {
        parsedData = parseCSV(text);
      }

      // Validation
      const errors: ValidationError[] = [];
      parsedData.forEach((school, idx) => {
        if (!school.name?.trim()) {
          errors.push({ row: idx + 1, field: 'name', message: 'School name is required' });
        }
        if (!school.city?.trim()) {
          errors.push({ row: idx + 1, field: 'city', message: 'City is required' });
        }
        if (!school.state?.trim()) {
          errors.push({ row: idx + 1, field: 'state', message: 'State is required' });
        }
        if (!school.zip?.trim()) {
          errors.push({ row: idx + 1, field: 'zip', message: 'ZIP code is required' });
        }
      });

      setValidationErrors(errors);
      setPreview(parsedData.slice(0, 5)); // Show first 5 rows as preview
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse file. Please check the format.");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let schools: ParsedSchool[] = [];

      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text);
        schools = Array.isArray(json) ? json : [json];
      } else {
        schools = parseCSV(text);
      }

      // Filter out invalid schools
      const validSchools = schools.filter(s => 
        s.name?.trim() && s.city?.trim() && s.state?.trim() && s.zip?.trim()
      );

      if (validSchools.length === 0) {
        toast.error("No valid schools found in file");
        return;
      }

      console.log(`[SchoolBulkImport] Importing ${validSchools.length} schools`);

      const { data, error } = await supabase.functions.invoke('schools-import-bulk', {
        body: { schools: validSchools }
      });

      if (error) throw error;

      const result = data as { imported: number; skipped: number; total: number; errors?: string[] };

      toast.success(
        `Successfully imported ${result.imported} schools` +
        (result.skipped > 0 ? `, skipped ${result.skipped}` : '')
      );

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import schools: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
      setFile(null);
      setPreview([]);
      setValidationErrors([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Schools</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file with school data. Required fields: name, city, state, zip.
            Optional fields: address_line1, district, county, school_level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <div className="mt-2">
              <input
                id="file"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </div>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Validation Errors ({validationErrors.length}):</div>
                <ul className="list-disc list-inside mt-2 max-h-32 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((err, idx) => (
                    <li key={idx} className="text-sm">
                      Row {err.row}: {err.field} - {err.message}
                    </li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-sm font-semibold">
                      ... and {validationErrors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Preview (first 5 schools):</h3>
              <div className="border rounded-lg p-4 bg-muted max-h-64 overflow-y-auto">
                {preview.map((school, idx) => (
                  <div key={idx} className="mb-3 pb-3 border-b last:border-b-0">
                    <div className="text-sm">
                      <div><strong>Name:</strong> {school.name}</div>
                      <div><strong>Location:</strong> {school.city}, {school.state} {school.zip}</div>
                      {school.address_line1 && <div><strong>Address:</strong> {school.address_line1}</div>}
                      {school.district && <div><strong>District:</strong> {school.district}</div>}
                      {school.school_level && <div><strong>Level:</strong> {school.school_level}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {file && validationErrors.length === 0 && preview.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                File validated successfully. Ready to import {preview.length > 5 ? 'all' : preview.length} schools.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || validationErrors.length > 0 || importing || preview.length === 0}
          >
            {importing ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Schools
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
