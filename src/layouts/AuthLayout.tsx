
import { ReactNode } from "react";
import { Transition } from "@/components/ui/Transition";
import { Header } from "@/components/layout/Header";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center pt-16">
        <Transition>
          <div className="w-full max-w-md p-8">
            {children}
          </div>
        </Transition>
      </div>
    </div>
  );
}
