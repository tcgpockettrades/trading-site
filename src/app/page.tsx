import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Pokemon TCG Pocket Trade Finder
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Find and organize trades for your Pokemon TCG Pocket collection.
                  Connect with other players and complete your collection!
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/trades">
                  <Button>Browse Trades</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline">Create Account</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-0 lg:grid-cols-3">
              <div className="flex flex-col items-center justify-center p-6 text-center border-b lg:border-b-0 lg:border-r">
                <div className="space-y-2 max-w-xs mx-auto lg:mx-0">
                  <h3 className="text-xl font-bold">Browse Trade Offers</h3>
                  <p className="text-muted-foreground">
                    Search through active trade offers from other players. Filter by
                    card rarity or specific cards you&apos;re looking for.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 text-center border-b lg:border-b-0 lg:border-r">
                <div className="space-y-2 max-w-xs mx-auto lg:mx-0">
                  <h3 className="text-xl font-bold">Create Trade Requests</h3>
                  <p className="text-muted-foreground">
                    Post your own trade requests. Specify the cards you want and what
                    you&apos;re willing to trade for them.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="space-y-2 max-w-xs mx-auto lg:mx-0">
                  <h3 className="text-xl font-bold">Keep track of your collection</h3>
                  <p className="text-muted-foreground">
                    Check off the cards you&apos;re missing from your collection. This will make the creation of trade offers show suggestions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Ready to start trading?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                  Create an account to post trades, track your collection, and connect
                  with other players.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}