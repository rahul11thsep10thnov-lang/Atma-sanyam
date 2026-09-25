"use client";

import { useEffect, useState } from "react";
import { getDisplayName } from "@/lib/localStore";

export default function DisplayName({ fallback = "Guest" }: { fallback?: string }) {
  const [name, setName] = useState(fallback);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(getDisplayName());
  }, []);
  return <>{name}</>;
}
