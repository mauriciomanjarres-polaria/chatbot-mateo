"use client";

import { FaWarehouse } from "react-icons/fa";
import { buildWmsReturnUrl } from "../lib/auth-config";
import { useAuth } from "../hooks/useAuth";

export default function WmsLinkButton({ compact = false }) {
  const { leaveForWms } = useAuth();

  const handleClick = (event) => {
    event.preventDefault();
    leaveForWms();
  };

  return (
    <a
      href={buildWmsReturnUrl()}
      onClick={handleClick}
      className={`wms-link-btn${compact ? " wms-link-btn--compact" : ""}`}
      aria-label="Ir a Polaria WMS"
    >
      <FaWarehouse aria-hidden="true" />
      {!compact && <span>Polaria WMS</span>}
    </a>
  );
}
