"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ProcurementRequestList } from "@/modules/assets/components/ProcurementRequestList";
import { ProcurementRequestForm } from "@/modules/assets/components/ProcurementRequestForm";
import { PurchaseOrderDetail } from "@/modules/assets/components/PurchaseOrderDetail";
import { trpc } from "@/shared/lib/trpc";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

/**
 * Procurement dashboard page.
 *
 * @description Shows tabbed views for procurement requests and purchase orders.
 * Supports creating requests, viewing order details, and managing the
 * full procurement lifecycle.
 */
export default function ProcurementPage() {
  const t = useTranslations("assets");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: ordersData, isLoading: ordersLoading } = trpc.procurement.listPurchaseOrders.useQuery({
    limit: 50,
  });

  const orders = ordersData?.items ?? [];

  function formatCurrency(amount: unknown): string {
    if (amount == null) return "-";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  }

  if (selectedOrderId) {
    return (
      <>
        <AppHeader
          breadcrumbs={[
            { label: tn("assets"), href: "/assets" },
            { label: t("procurement_title"), href: "/assets/procurement" },
            { label: tc("details") },
          ]}
        />
        <div className="flex-1 p-4 sm:p-6">
          <PurchaseOrderDetail
            orderId={selectedOrderId}
            onBack={() => setSelectedOrderId(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: tn("assets"), href: "/assets" },
          { label: t("procurement_title") },
        ]}
      />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("procurement_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("procurement_page_description")}
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("procurement_create_request")}
          </Button>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">{t("procurement_requests_tab")}</TabsTrigger>
            <TabsTrigger value="orders">{t("procurement_orders_tab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <ProcurementRequestList />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {ordersLoading ? (
              <div className="py-12 text-center text-muted-foreground">{tc("loading")}</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">{t("purchase_order_empty")}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("purchase_order_number")}</TableHead>
                      <TableHead>{t("procurement_vendor")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead>{t("purchase_order_total")}</TableHead>
                      <TableHead>{t("expected_delivery")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const o = order as any;
                      return (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedOrderId(o.id)}
                        >
                          <TableCell className="font-mono text-sm">{o.orderNumber}</TableCell>
                          <TableCell>{o.vendor?.name ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`purchase_order_status_${o.status}` as Parameters<typeof t>[0])}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(o.totalAmount)}</TableCell>
                          <TableCell>
                            {o.expectedDelivery
                              ? new Intl.DateTimeFormat().format(new Date(o.expectedDelivery))
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ProcurementRequestForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </>
  );
}
