// app/(dashboard)/profile/missing-cards/page.tsx
"use client";

import MissingCardsSelector from "@/components/cards/missing-cards-selector";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MissingCardsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 max-w-5xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Button>
          </Link>
          <h1 className="text-3xl font-bold ml-4">My Missing Cards</h1>
        </div>
        
        <div className="mb-6">
          <p className="text-muted-foreground">
            Check all the cards you&apos;re missing from your collection. This will make it easier to create trade posts later.
          </p>
        </div>

        <MissingCardsSelector />
      </main>
      <Footer />
    </div>
  );
}