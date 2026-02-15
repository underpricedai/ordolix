"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Package, FileText, XCircle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { trpc } from "@/shared/lib/trpc";

interface PurchaseOrderDetailProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  partially_received: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  invoiced: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  cancelled: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

/**
 * PurchaseOrderDetail renders a full view of a purchase order,
 * including line items, receiving actions, and invoice matching form.
 *
 * @param props - PurchaseOrderDetailProps
 * @returns The purchase order detail component
 */
export function PurchaseOrderDetail({ orderId, onBack }: PurchaseOrderDetailProps) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: order, isLoading } = trpc.procurement.getPurchaseOrder.useQuery({ id: orderId });

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  const receiveMutation = trpc.procurement.receiveOrder.useMutation({
    onSuccess: () => {
      utils.procurement.getPurchaseOrder.invalidate({ id: orderId });
      utils.procurement.listPurchaseOrders.invalidate();
    },
  });

  const invoiceMutation = trpc.procurement.matchInvoice.useMutation({
    onSuccess: () => {
      utils.procurement.getPurchaseOrder.invalidate({ id: orderId });
      utils.procurement.listPurchaseOrders.invalidate();
      setInvoiceNumber("");
      setInvoiceAmount("");
      setInvoiceDate("");
    },
  });

  const cancelMutation = trpc.procurement.cancelOrder.useMutation({
    onSuccess: () => {
      utils.procurement.getPurchaseOrder.invalidate({ id: orderId });
      utils.procurement.listPurchaseOrders.invalidate();
    },
  });

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{tc("loading")}</div>;
  }

  if (!order) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("purchase_order_not_found")}
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData = order as any;

  function formatCurrency(amount: unknown): string {
    if (amount == null) return "-";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  }

  function handleReceive() {
    receiveMutation.mutate({ orderId });
  }

  function handleInvoice(e: React.FormEvent) {
    e.preventDefault();
    invoiceMutation.mutate({
      orderId,
      invoiceNumber,
      invoiceAmount: parseFloat(invoiceAmount),
      invoiceDate: new Date(invoiceDate),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          {tc("back")}
        </Button>
        <h2 className="text-xl font-bold">{orderData.orderNumber}</h2>
        <Badge variant="outline" className={STATUS_COLORS[orderData.status] ?? ""}>
          {t(`purchase_order_status_${orderData.status}` as Parameters<typeof t>[0])}
        </Badge>
      </div>

      {/* Order Details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("procurement_vendor")}</p>
            <p className="font-medium">{orderData.vendor?.name ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("purchase_order_total")}</p>
            <p className="font-medium">{formatCurrency(orderData.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("expected_delivery")}</p>
            <p className="font-medium">
              {orderData.expectedDelivery
                ? new Intl.DateTimeFormat().format(new Date(orderData.expectedDelivery))
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("invoice_number")}</p>
            <p className="font-medium">{orderData.invoiceNumber ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("line_items")}</CardTitle>
        </CardHeader>
        <CardContent>
          {orderData.lineItems?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("line_item_description")}</TableHead>
                  <TableHead>{t("procurement_quantity")}</TableHead>
                  <TableHead>{t("line_item_unit_price")}</TableHead>
                  <TableHead>{t("line_item_total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderData.lineItems.map((li: {
                  id: string;
                  description: string;
                  quantity: number;
                  unitPrice: unknown;
                }) => (
                  <TableRow key={li.id}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell>{li.quantity}</TableCell>
                    <TableCell>{formatCurrency(li.unitPrice)}</TableCell>
                    <TableCell>
                      {formatCurrency(Number(li.unitPrice) * li.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("line_items_empty")}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {orderData.status === "ordered" && (
          <Button
            onClick={handleReceive}
            disabled={receiveMutation.isPending}
          >
            <Package className="mr-2 size-4" aria-hidden="true" />
            {t("purchase_order_receive")}
          </Button>
        )}

        {(orderData.status === "received" || orderData.status === "ordered") &&
          !orderData.invoiceNumber && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">{t("invoice_match")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvoice} className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="inv-num">{t("invoice_number")}</Label>
                    <Input
                      id="inv-num"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      placeholder="INV-001"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inv-amount">{t("invoice_amount")}</Label>
                    <Input
                      id="inv-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inv-date">{t("invoice_date")}</Label>
                    <Input
                      id="inv-date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={invoiceMutation.isPending}>
                    <FileText className="mr-1 size-4" aria-hidden="true" />
                    {t("invoice_match_submit")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

        {orderData.status !== "received" && orderData.status !== "cancelled" && (
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate({ orderId })}
            disabled={cancelMutation.isPending}
          >
            <XCircle className="mr-2 size-4" aria-hidden="true" />
            {t("purchase_order_cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}
