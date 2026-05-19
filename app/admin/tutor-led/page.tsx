import { redirect } from "next/navigation";

/** Direct link to the tutor-led programs editor in the admin shell. */
export default function AdminTutorLedPage() {
  redirect("/admin?panel=tutor-led");
}
