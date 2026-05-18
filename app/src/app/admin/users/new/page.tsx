import type { Metadata } from "next";
import UserForm from "@/features/admin/UserForm";

export const metadata: Metadata = {
  title: "New User — Admin — PPL Flashcards",
};

export default function NewUserPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-950">New user</h1>
      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6">
        <UserForm />
      </div>
    </div>
  );
}
