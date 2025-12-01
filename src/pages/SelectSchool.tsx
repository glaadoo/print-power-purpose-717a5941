import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Loader2, PawPrint, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SchoolSearch from "@/components/SchoolSearch";
import { Badge } from "@/components/ui/badge";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const SCHOOL_LEVELS = [
  "Elementary",
  "Middle",
  "High",
  "K-12",
  "Other"
];

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  county?: string;
  zip: string;
  school_level?: string;
}

interface FormData {
  name: string;
  district: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  county: string;
  zip: string;
  school_level: string;
}

interface FormErrors {
  name?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export default function SelectSchool() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    district: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    county: "",
    zip: "",
    school_level: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [highlightSchoolId, setHighlightSchoolId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Select Your School - Print Power Purpose";
    loadSchools();
  }, []);

  async function loadSchools() {
    try {
      setLoading(true);
      console.log('[SelectSchool] Loading requested schools...');
      
      // Load from requested_schools table (user-submitted schools only)
      const { data, error } = await supabase
        .from('requested_schools')
        .select('id, name, city, state, zip, school_level')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[SelectSchool] Loaded requested schools:', data?.length || 0);
      setSchools(data || []);
    } catch (error) {
      console.error('[SelectSchool] Error loading schools:', error);
      toast({
        title: "Error loading schools",
        description: "Could not load schools. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function validateField(name: keyof FormData, value: string): string | undefined {
    if (name === "name" && !value.trim()) return "School name is required";
    if (name === "address_line1" && !value.trim()) return "Address is required";
    if (name === "city" && !value.trim()) return "City is required";
    if (name === "state" && !value.trim()) return "State is required";
    if (name === "zip") {
      if (!value.trim()) return "ZIP code is required";
      if (!/^[\d-]{3,10}$/.test(value)) return "Invalid ZIP code format";
    }
    return undefined;
  }

  function handleFieldChange(name: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  function handleFieldBlur(name: keyof FormData) {
    const error = validateField(name, formData[name]);
    if (error) {
      setFormErrors(prev => ({ ...prev, [name]: error }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: FormErrors = {};
    (["name", "address_line1", "city", "state", "zip"] as const).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke('schools-add', {
        body: {
          name: formData.name.trim(),
          district: formData.district.trim() || null,
          address_line1: formData.address_line1.trim(),
          address_line2: formData.address_line2.trim() || null,
          city: formData.city.trim(),
          state: formData.state,
          county: formData.county.trim() || null,
          zip: formData.zip.trim(),
          country: "USA",
          school_level: formData.school_level || null,
        }
      });

      if (error) throw error;

      const { reused, school } = data;

      if (reused) {
        toast({
          title: "School Already Exists",
          description: `${school.name} is already in our list. We've linked you to it.`,
        });
        
        setHighlightSchoolId(school.id);
        setTimeout(() => setHighlightSchoolId(null), 3000);

        setTimeout(() => {
          const element = document.getElementById(`school-${school.id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        toast({
          title: "School Added!",
          description: `${school.name} has been added to the list.`,
        });

        setSchools(prev => [school, ...prev]);
        setHighlightSchoolId(school.id);
        setTimeout(() => setHighlightSchoolId(null), 3000);

        setFormData({
          name: "",
          district: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          county: "",
          zip: "",
          school_level: "",
        });

        setTimeout(() => {
          const element = document.getElementById(`school-${school.id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (error) {
      console.error('[SelectSchool] Error adding school:', error);
      toast({
        title: "Error",
        description: "Could not save school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectSchool(school: School) {
    try {
      const sessionId = localStorage.getItem('ppp:sessionId') || crypto.randomUUID();
      localStorage.setItem('ppp:sessionId', sessionId);

      const { error } = await supabase.functions.invoke('schools-select', {
        body: {
          sessionId,
          schoolId: school.id,
        }
      });

      if (error) throw error;

      setSelectedSchoolId(school.id);
      
      localStorage.setItem('ppp:selectedSchool', JSON.stringify({
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
      }));

      toast({
        title: "School Selected",
        description: `You've selected ${school.name}`,
      });

      setTimeout(() => nav('/select/nonprofit'), 500);
    } catch (error) {
      console.error('[SelectSchool] Error selecting school:', error);
      toast({
        title: "Error",
        description: "Could not select school. Please try again.",
        variant: "destructive",
      });
    }
  }

  function formatSchoolLevel(level: string) {
    if (!level) return '';
    if (level.toLowerCase().includes('school')) return level;
    return `${level} School`;
  }

  function clearForm() {
    setFormData({
      name: "",
      district: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      county: "",
      zip: "",
      school_level: "",
    });
    setFormErrors({});
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between bg-white border-b border-gray-200">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600">
          SELECT&nbsp;SCHOOL
        </div>
        
        <div className="w-20" />
      </header>

      {/* Content */}
      <div className="py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          {/* SEARCH SCHOOLS */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-2xl font-bold mb-4 text-blue-600">Find Your School</h2>
              <p className="text-sm text-gray-600 mb-4">
                Search by school name, city, state, or ZIP code
              </p>
              
              <SchoolSearch
                onSelect={(school) => {
                  setSelectedSchoolId(school.id);
                  setSelectedSchool(school);
                }}
                selectedId={selectedSchoolId || undefined}
              />
              
              {/* Selected School Display */}
              {selectedSchool && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedSchool.name}, {selectedSchool.city}, {selectedSchool.state}, {selectedSchool.zip}
                      </p>
                    </div>
                    {selectedSchool.school_level && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        {formatSchoolLevel(selectedSchool.school_level)}
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSchool(null);
                      setSelectedSchoolId(null);
                    }}
                    className="ml-4 p-1 rounded-full hover:bg-blue-100 transition-colors"
                    aria-label="Remove selected school"
                  >
                    <X className="h-5 w-5 text-gray-600 hover:text-gray-900" />
                  </button>
                </div>
              )}
              
              {/* Continue Button */}
              {selectedSchool && (
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={() => handleSelectSchool(selectedSchool)}
                    className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-full"
                  >
                    Continue with {selectedSchool.name}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ADD SCHOOL FORM */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-blue-600">Add your school</h2>
                  <p className="text-sm text-gray-600">
                    Can't find your school? Add it here, and we'll include it in the list for future users.
                  </p>
                </div>
                
                {/* kenzie-AI Animation */}
                <button
                  onClick={() => {
                    const kenzieWidget = document.querySelector('[data-kenzie-chat]');
                    if (kenzieWidget) {
                      (kenzieWidget as HTMLElement).click();
                    }
                  }}
                  className="group p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-all hover:scale-110"
                  aria-label="Get help from kenzie-AI"
                >
                  <PawPrint className="h-6 w-6 text-blue-600 transition-colors animate-pulse" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* School Name */}
                  <div>
                    <Label htmlFor="name" className="text-gray-900">School Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      onBlur={() => handleFieldBlur("name")}
                      className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                        formErrors.name ? 'border-red-500' : ''
                      }`}
                      placeholder="Lincoln High School"
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* District */}
                  <div>
                    <Label htmlFor="district" className="text-gray-900">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => handleFieldChange("district", e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Address Line 1 */}
                  <div>
                    <Label htmlFor="address_line1" className="text-gray-900">Address *</Label>
                    <Input
                      id="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => handleFieldChange("address_line1", e.target.value)}
                      onBlur={() => handleFieldBlur("address_line1")}
                      className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                        formErrors.address_line1 ? 'border-red-500' : ''
                      }`}
                      placeholder="123 Main Street"
                    />
                    {formErrors.address_line1 && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.address_line1}</p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <Label htmlFor="address_line2" className="text-gray-900">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => handleFieldChange("address_line2", e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Suite 100 (optional)"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Label htmlFor="city" className="text-gray-900">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleFieldChange("city", e.target.value)}
                      onBlur={() => handleFieldBlur("city")}
                      className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                        formErrors.city ? 'border-red-500' : ''
                      }`}
                      placeholder="Springfield"
                    />
                    {formErrors.city && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <Label htmlFor="state" className="text-gray-900">State *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleFieldChange("state", value)}
                    >
                      <SelectTrigger
                        className={`bg-white border-gray-300 text-gray-900 ${
                          formErrors.state ? 'border-red-500' : ''
                        }`}
                      >
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 max-h-60 z-[100]">
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state} className="text-gray-900 hover:bg-gray-50">
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.state && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.state}</p>
                    )}
                  </div>

                  {/* County */}
                  <div>
                    <Label htmlFor="county" className="text-gray-900">County</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => handleFieldChange("county", e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Optional"
                    />
                  </div>

                  {/* ZIP */}
                  <div>
                    <Label htmlFor="zip" className="text-gray-900">ZIP Code *</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => handleFieldChange("zip", e.target.value)}
                      onBlur={() => handleFieldBlur("zip")}
                      className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                        formErrors.zip ? 'border-red-500' : ''
                      }`}
                      placeholder="12345"
                    />
                    {formErrors.zip && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.zip}</p>
                    )}
                  </div>

                  {/* School Level */}
                  <div>
                    <Label htmlFor="school_level" className="text-gray-900">School Level</Label>
                    <Select
                      value={formData.school_level}
                      onValueChange={(value) => handleFieldChange("school_level", value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 z-[100]">
                        {SCHOOL_LEVELS.map(level => (
                          <SelectItem key={level} value={level} className="text-gray-900 hover:bg-gray-50">
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearForm}
                    className="text-gray-700 hover:bg-gray-100"
                  >
                    Clear form
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save this school'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* SCHOOL GRID */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">Or Select a School</h2>
            <p className="text-sm text-gray-600 mb-4">
              These schools have been added by our community.
            </p>
          </div>

          {loading ? (
            <div className="text-center text-gray-600 py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-4">Loading schools…</p>
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No schools have been added yet.</p>
              <p className="text-sm text-gray-500 mt-2">Be the first to add yours above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {schools.map(school => (
                <button
                  key={school.id}
                  id={`school-${school.id}`}
                  onClick={() => {
                    setSelectedSchoolId(school.id);
                    setSelectedSchool(school);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`
                    aspect-square rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center transition-all relative
                    ${
                      selectedSchoolId === school.id
                        ? "border-blue-500 bg-blue-50 scale-105"
                        : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:scale-105"
                    }
                    ${highlightSchoolId === school.id ? 'animate-pulse border-yellow-400 bg-yellow-50' : ''}
                  `}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedSchoolId(school.id);
                      setSelectedSchool(school);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  <h3 className="text-base md:text-lg font-bold mb-2 line-clamp-2 text-gray-900">
                    {school.name}
                  </h3>
                  
                  <p className="text-xs md:text-sm text-gray-600 mb-1">
                    {school.city}, {school.state}
                  </p>
                  {school.zip && (
                    <p className="text-xs text-gray-500 mb-2">
                      {school.zip}
                    </p>
                  )}

                  {school.school_level && (
                    <div className="mt-auto">
                      <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {school.school_level}
                      </div>
                    </div>
                  )}

                  {selectedSchoolId === school.id && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
