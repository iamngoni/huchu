import { permanentRedirect } from "next/navigation";

export default function ProductOverviewRedirect() {
  permanentRedirect("/home/products");
}
