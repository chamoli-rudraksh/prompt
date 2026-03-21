"use client";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { useEffect, useState } from "react";
import OnboardingModal from "@/components/OnboardingModal";
import { createUser, getUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isLoggedIn() ? "/feed" : "/auth");
  }, []);
  return null;
}
