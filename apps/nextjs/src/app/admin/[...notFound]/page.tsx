import type { Metadata } from "next";

import AdminNotFound from "../not-found";

export const metadata: Metadata = {
  title: "Ruta admin no encontrada | Rastro",
};

export default function AdminCatchAllNotFoundPage() {
  return <AdminNotFound />;
}
