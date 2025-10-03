import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCause } from "../context/CauseContext";

export default function Success() {
  const { cause } = useCause();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Layout title="Success">
      <GlassCard className="text-center">
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="mt-2 text-gray-800">
          {cause ? `Thanks for helping ${cause.name}!` : "Thanks for your support!"}
        </p>
        <p className="mt-4 text-sm text-gray-600">Redirecting to home...</p>
      </GlassCard>
    </Layout>
  );
}
