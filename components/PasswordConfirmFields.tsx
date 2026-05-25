"use client";

import { useState } from "react";
import PasswordField from "@/components/PasswordField";
import PasswordPolicyHint from "@/components/PasswordPolicyHint";

type Props = {
  passwordName?: string;
  confirmName?: string;
};

export default function PasswordConfirmFields({
  passwordName = "password",
  confirmName = "password_confirm",
}: Props) {
  const [password, setPassword] = useState("");

  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <div className="md:col-span-2">
        <PasswordPolicyHint password={password} live />
      </div>
      <PasswordField
        name={passwordName}
        placeholder="Password"
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        name={confirmName}
        placeholder="Retype password"
        autoComplete="new-password"
        minLength={8}
      />
    </div>
  );
}
