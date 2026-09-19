import { useParams } from "react-router-dom";
import OrderPrint from "@/components/orders/OrderPrint";

export default function OrderPrintPage() {
  const { orderId } = useParams<{ orderId: string }>();
  return <OrderPrint orderId={orderId || ""} />;
}
