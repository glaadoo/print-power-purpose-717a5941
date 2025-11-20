import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
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
  const [levelFilter, setLevelFilter] = useState<string>("all");
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
      console.log('[SelectSchool] Loading schools...');
      const { data, error } = await supabase.functions.invoke('schools-list', {
        body: { page: 1, pageSize: 50 }
      });

      if (error) throw error;

      console.log('[SelectSchool] Loaded schools:', data?.items?.length || 0, data);
      setSchools(data.items || []);
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
    // Clear error when user types
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

    // Validate all required fields
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
        // School already exists
        toast({
          title: "School Already Exists",
          description: `${school.name} is already in our list. We've linked you to it.`,
        });
        
        // Highlight existing school
        setHighlightSchoolId(school.id);
        setTimeout(() => setHighlightSchoolId(null), 3000);

        // Scroll to the school card
        setTimeout(() => {
          const element = document.getElementById(`school-${school.id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        // New school added
        toast({
          title: "School Added!",
          description: `${school.name} has been added to the list.`,
        });

        // Add to grid at top
        setSchools(prev => [school, ...prev]);

        // Highlight new school
        setHighlightSchoolId(school.id);
        setTimeout(() => setHighlightSchoolId(null), 3000);

        // Clear form
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

        // Scroll to new school
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
      // Generate or get session ID
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
      
      // Store in localStorage for quick access
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

      // Navigate to causes
      setTimeout(() => nav('/causes'), 500);
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
    // If it already contains "School", return as is
    if (level.toLowerCase().includes('school')) return level;
    // Otherwise append "School"
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT&nbsp;SCHOOL
        </div>
        
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Fullscreen content */}
      <div className="h-full w-full pt-16 overflow-y-auto">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative w-full min-h-full pt-4 pb-32 px-4">
          <div className="w-full max-w-6xl mx-auto">
            {/* SEARCH SCHOOLS */}
            <div className="mb-8">
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4">Find Your School</h2>
                <p className="text-sm opacity-80 mb-4">
                  Search by school name, city, state, or ZIP code
                </p>
                
                {/* Level Filter */}
                <div className="mb-6">
                  <Label htmlFor="level-filter" className="text-white mb-2 block">
                    Filter by School Level
                  </Label>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger 
                      id="level-filter"
                      className="bg-white/10 border-white/20 text-white w-full md:w-64"
                    >
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20 text-white z-[100]">
                      <SelectItem value="all" className="text-white hover:bg-white/10">
                        All Levels
                      </SelectItem>
                      {SCHOOL_LEVELS.map(level => (
                        <SelectItem key={level} value={level} className="text-white hover:bg-white/10">
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <SchoolSearch
                  onSelect={(school) => {
                    setSelectedSchoolId(school.id);
                    setSelectedSchool(school);
                  }}
                  selectedId={selectedSchoolId || undefined}
                />
                
                {/* Selected School Display */}
                {selectedSchool && (
                  <div className="mt-4 p-4 rounded-lg bg-white/10 border border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-white">
                          {selectedSchool.name}, {selectedSchool.city}, {selectedSchool.state}, {selectedSchool.zip}
                        </p>
                      </div>
                      {selectedSchool.school_level && (
                        <Badge variant="secondary" className="text-xs">
                          {formatSchoolLevel(selectedSchool.school_level)}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSchool(null);
                        setSelectedSchoolId(null);
                      }}
                      className="ml-4 p-1 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Remove selected school"
                    >
                      <X className="h-5 w-5 text-white/80 hover:text-white" />
                    </button>
                  </div>
                )}
                
                {/* Continue Button */}
                {selectedSchool && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={() => handleSelectSchool(selectedSchool)}
                      className="px-8 py-3 bg-white text-black hover:bg-white/90 font-semibold"
                    >
                      Continue with {selectedSchool.name}
                    </Button>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* ADD SCHOOL FORM */}
            <div className="mb-8">
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Add your school</h2>
                    <p className="text-sm opacity-80">
                      Can't find your school? Add it here and it becomes an option for everyone.
                    </p>
                  </div>
                  
                  {/* Kenzie Animation */}
                  <button
                    onClick={() => {
                      const kenzieWidget = document.querySelector('[data-kenzie-chat]');
                      if (kenzieWidget) {
                        (kenzieWidget as HTMLElement).click();
                      }
                    }}
                    className="group p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all hover:scale-110"
                    aria-label="Get help from Kenzie"
                  >
                    <PawPrint className="h-6 w-6 text-white/80 group-hover:text-white transition-colors animate-pulse" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* School Name */}
                    <div>
                      <Label htmlFor="name" className="text-white">School Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleFieldChange("name", e.target.value)}
                        onBlur={() => handleFieldBlur("name")}
                        className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                          formErrors.name ? 'border-red-500' : ''
                        }`}
                        placeholder="Lincoln High School"
                      />
                      {formErrors.name && (
                        <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    {/* District */}
                    <div>
                      <Label htmlFor="district" className="text-white">District</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => handleFieldChange("district", e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Optional"
                      />
                    </div>

                    {/* Address Line 1 */}
                    <div>
                      <Label htmlFor="address_line1" className="text-white">Address *</Label>
                      <Input
                        id="address_line1"
                        value={formData.address_line1}
                        onChange={(e) => handleFieldChange("address_line1", e.target.value)}
                        onBlur={() => handleFieldBlur("address_line1")}
                        className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                          formErrors.address_line1 ? 'border-red-500' : ''
                        }`}
                        placeholder="123 Main Street"
                      />
                      {formErrors.address_line1 && (
                        <p className="text-red-400 text-sm mt-1">{formErrors.address_line1}</p>
                      )}
                    </div>

                    {/* Address Line 2 */}
                    <div>
                      <Label htmlFor="address_line2" className="text-white">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={formData.address_line2}
                        onChange={(e) => handleFieldChange("address_line2", e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Suite 100 (optional)"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <Label htmlFor="city" className="text-white">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                        onBlur={() => handleFieldBlur("city")}
                        className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                          formErrors.city ? 'border-red-500' : ''
                        }`}
                        placeholder="Springfield"
                      />
                      {formErrors.city && (
                        <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    {/* State */}
                    <div>
                      <Label htmlFor="state" className="text-white">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => handleFieldChange("state", value)}
                      >
                        <SelectTrigger
                          className={`bg-white/10 border-white/20 text-white ${
                            formErrors.state ? 'border-red-500' : ''
                          }`}
                        >
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/20 text-white max-h-60 z-[100]">
                          {US_STATES.map(state => (
                            <SelectItem key={state} value={state} className="text-white hover:bg-white/10">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.state && (
                        <p className="text-red-400 text-sm mt-1">{formErrors.state}</p>
                      )}
                    </div>

                    {/* County */}
                    <div>
                      <Label htmlFor="county" className="text-white">County</Label>
                      <Input
                        id="county"
                        value={formData.county}
                        onChange={(e) => handleFieldChange("county", e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Optional"
                      />
                    </div>

                    {/* ZIP Code */}
                    <div>
                      <Label htmlFor="zip" className="text-white">ZIP Code *</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => handleFieldChange("zip", e.target.value)}
                        onBlur={() => handleFieldBlur("zip")}
                        className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                          formErrors.zip ? 'border-red-500' : ''
                        }`}
                        placeholder="12345"
                      />
                      {formErrors.zip && (
                        <p className="text-red-400 text-sm mt-1">{formErrors.zip}</p>
                      )}
                    </div>

                    {/* School Level */}
                    <div>
                      <Label htmlFor="school_level" className="text-white">School Level</Label>
                      <Select
                        value={formData.school_level}
                        onValueChange={(value) => handleFieldChange("school_level", value)}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/20 text-white z-[100]">
                          {SCHOOL_LEVELS.map(level => (
                            <SelectItem key={level} value={level} className="text-white hover:bg-white/10">
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
                      className="text-white hover:bg-white/10"
                    >
                      Clear form
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-white text-black hover:bg-white/90"
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
              </GlassCard>
            </div>

            {/* SCHOOL GRID */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Or Select a School</h2>
              <p className="text-sm opacity-80 mb-4">
                These schools have been added by our community.
              </p>
            </div>

            {loading ? (
              <div className="text-center text-white/80 py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-4">Loading schools…</p>
              </div>
            ) : schools.length === 0 ? (
              <div className="text-center py-12">
                <PawPrint className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-lg text-white/80">No schools have been added yet.</p>
                <p className="text-sm text-white/60 mt-2">Be the first to add yours above!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {schools
                    .filter(school => levelFilter === "all" || school.school_level === levelFilter)
                    .map(school => (
                    <button
                      key={school.id}
                      id={`school-${school.id}`}
                      onClick={() => {
                        setSelectedSchoolId(school.id);
                        setSelectedSchool(school);
                        // Scroll to top to show selected school display
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`
                        aspect-square rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center transition-all
                        ${
                          selectedSchoolId === school.id
                            ? "border-white/70 bg-white/25 scale-105"
                            : "border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15 hover:scale-105"
                        }
                        ${highlightSchoolId === school.id ? 'animate-pulse border-yellow-400 bg-yellow-500/20' : ''}
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
                      <h3 className="text-base md:text-lg font-bold mb-2 line-clamp-2">
                        {school.name}
                      </h3>
                      
                      <p className="text-xs md:text-sm opacity-80 mb-3">
                        {school.city}, {school.state}
                      </p>

                      {school.school_level && (
                        <div className="mt-auto">
                          <div className="inline-block px-2 py-1 bg-white/10 rounded text-xs">
                            {school.school_level}
                          </div>
                        </div>
                      )}

                      {selectedSchoolId === school.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
