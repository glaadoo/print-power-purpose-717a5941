import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DogDoor = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to admin with passcode
    const passcode = import.meta.env.VITE_ADMIN_PASSCODE || 'Kenziewoof2025';
    navigate(`/admin?key=${passcode}`, { replace: true });
  }, [navigate]);

  return null;
};

export default DogDoor;
