import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Kenzie from "./pages/Kenzie";
import Causes from "./pages/Causes";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/kenzie" element={<Kenzie />} />
      <Route path="/causes" element={<Causes />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
    </Routes>
  );
}
