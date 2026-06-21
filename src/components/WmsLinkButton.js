"use client";

import { FaWarehouse } from "react-icons/fa";
import { WMS_LOGIN_URL } from "../lib/auth-config";

export default function WmsLinkButton({ compact = false }) {
  return (
    <a
      href={WMS_LOGIN_URL}
      className={`wms-link-btn${compact ? " wms-link-btn--compact" : ""}`}
      aria-label="Ir a Polaria WMS"
    >
      <FaWarehouse aria-hidden="true" />
      {!compact && <span>Polaria WMS</span>}
    </a>
  );
}
