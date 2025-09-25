"use client";
import { useUserStore } from "@/stores/userInfo";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Redirect() {
  const router = useRouter();
  const { fetchUser, perfil } = useUserStore();

  useEffect(() => {
    fetchUser().catch(() => {
      router.push("/login");
    });
  }, []);

  useEffect(() => {
    if (perfil === "Cliente") router.push("/u/dashboard");
    if (perfil === "Colaborador") router.push("/c/dashboard");
  }, [perfil]);

  return <main></main>;
}
