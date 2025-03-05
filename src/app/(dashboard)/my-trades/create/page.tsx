// app/(dashboard)/my-trades/create/page.tsx
import CreateTradeForm from "@/components/trades/create-trade-form";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function CreateTradePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Create a Trade</h1>
        <CreateTradeForm />
      </main>
      <Footer />
    </div>
  );
}