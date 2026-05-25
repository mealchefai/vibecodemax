import { AdminShell } from "@/components/layout/admin-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  getCatalogEnvironmentMode,
  getCatalogProvider,
  isCatalogEditable,
  listStripeTaxCodes,
  listCatalog,
} from "./actions";
import { CatalogManager } from "./_components/catalog-manager";

export default async function AdminProductsPage() {
  const [provider, editable, products, environmentMode, taxCodeOptions] =
    await Promise.all([
      getCatalogProvider(),
      isCatalogEditable(),
      listCatalog(),
      getCatalogEnvironmentMode(),
      listStripeTaxCodes(),
    ]);

  return (
    <AdminShell>
      <div className="p-6 space-y-8">
        <PageHeader
          title="Product Catalog"
          description="Manage payment products for Stripe."
        />
        <CatalogManager
          provider={provider}
          editable={editable}
          products={products}
          environmentMode={environmentMode}
          taxCodeOptions={taxCodeOptions}
        />
      </div>
    </AdminShell>
  );
}
