import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Kenzie from "./pages/Kenzie"; // if you still keep it for legacy
import Causes from "./pages/Causes";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Dashboard from "./pages/Dashboard";
import SelectSchool from "./pages/SelectSchool";
import SelectNonprofit from "./pages/SelectNonprofit";
import PersonalMission from "./pages/PersonalMission";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* New selection routes from the Home dropdown */}
      <Route path="/select/school" element={<SelectSchool />} />
      <Route path="/select/nonprofit" element={<SelectNonprofit />} />
      <Route path="/select/personal" element={<PersonalMission />} />

      {/* Existing pages */}
      <Route path="/kenzie" element={<Kenzie />} />
      <Route path="/causes" element={<Causes />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
    </Routes>
  );
}
