import { useCallback, useState } from "react";
export default function useToggle(initial = false) {
  const [open, setOpen] = useState(initial);
  const on = useCallback(() => setOpen(true), []);
  const off = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, on, off, toggle, setOpen };
}
