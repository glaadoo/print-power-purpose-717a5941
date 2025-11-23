import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DogDoor = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to admin with passcode
    const passcode = 'Kenziewoof2025';
    console.log("[DogDoor] Redirecting to admin with passcode");
    navigate(`/admin?key=${passcode}`, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to admin...</p>
      </div>
    </div>
  );
};

export default DogDoor;
