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
  description?: string;
};

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: ParsedRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: ParsedRow = { name: '' };
      
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header === 'name') row.name = value;
        else if (header === 'ein') row.ein = value;
        else if (header === 'city') row.city = value;
        else if (header === 'state') row.state = value;
        else if (header === 'description') row.description = value;
      });
      
      if (row.name) rows.push(row);
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
    const text = await selectedFile.text();
    const rows = parseCSV(text);
    const errors = validateRows(rows);
    
    setPreview(rows.slice(0, 5));
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const errors = validateRows(rows);
      
      if (errors.length > 0) {
        toast.error(`Found ${errors.length} validation errors. Please fix and retry.`);
        setImporting(false);
        return;
      }
      
      // Check for duplicates
      const eins = rows.filter(r => r.ein).map(r => r.ein!);
      if (eins.length > 0) {
        const { data: existing } = await supabase
          .from('nonprofits')
          .select('ein')
          .in('ein', eins);
        
        if (existing && existing.length > 0) {
          toast.warning(`${existing.length} nonprofits with matching EINs already exist. They will be skipped.`);
        }
      }
      
      // Batch insert
      const toInsert = rows.map(row => ({
        name: row.name,
        ein: row.ein || null,
        city: row.city || null,
        state: row.state || null,
        description: row.description || null,
        source: 'curated',
        approved: true,
      }));
      
      const { error } = await supabase
        .from('nonprofits')
        .upsert(toInsert, { onConflict: 'ein', ignoreDuplicates: true });
      
      if (error) throw error;
      
      toast.success(`Imported ${rows.length} nonprofits successfully`);
      onSuccess();
      onOpenChange(false);
      setFile(null);
      setPreview([]);
      setValidationErrors([]);
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
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
            Upload a CSV file with columns: name, ein, city, state, description
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>CSV File</Label>
            <div className="mt-2">
              <input
                type="file"
                accept=".csv"
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
            className="bg-green-500 hover:bg-green-600"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
