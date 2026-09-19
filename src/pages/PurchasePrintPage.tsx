import { useParams } from "react-router-dom";
import PurchasePrint from "@/components/stock/PurchasePrint";

export default function PurchasePrintPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Invalid purchase ID</div>
      </div>
    );
  }

  return <PurchasePrint purchaseId={id} />;
}