import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";

const Field = ({ label, testId, ...props }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <input data-testid={testId} className="field mt-1" {...props} />
  </label>
);

const empty = { name: "", sku: "", barcode: "", category: "", brand: "", cost_price: "", selling_price: "", min_stock: "", unit: "", description: "", initial_qty: "", location: "" };

export default function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { team } = useAuth();
  const [form, setForm] = useState({ ...empty, location: team?.locations?.[0] || "" });
  const [busy, setBusy] = useState(false);
  const editing = Boolean(id);

  useEffect(() => {
    if (!id) return;
    api.get(`/items/${id}`).then((r) => {
      const d = r.data;
      setForm({ ...empty, ...Object.fromEntries(Object.entries(d).filter(([k]) => k in empty).map(([k, v]) => [k, v ?? ""])) });
    });
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const num = (v) => (v === "" || v === null ? null : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, cost_price: num(form.cost_price), selling_price: num(form.selling_price),
      min_stock: num(form.min_stock), initial_qty: num(form.initial_qty) };
    try {
      const r = editing ? await api.put(`/items/${id}`, payload) : await api.post("/items", payload);
      toast.success(editing ? "Item updated" : "Item added");
      navigate(`/items/${r.data.id}`, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-frame min-h-screen">
      <TopBar title={editing ? "Edit Item" : "Add Item"} back />
      <form onSubmit={submit} className="space-y-4 p-4 pb-32" data-testid="item-form">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
          <Field label="Item name *" testId="item-name-input" required value={form.name} onChange={set("name")} placeholder="e.g. Vivo Y28" />
          <Field label="SKU" testId="item-sku-input" value={form.sku} onChange={set("sku")} placeholder="Auto-generated if empty" />
          <Field label="Barcode" testId="item-barcode-input" value={form.barcode} onChange={set("barcode")} placeholder="Scan or type barcode" />
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
          <Field label="Category" testId="item-category-input" value={form.category} onChange={set("category")} placeholder="mobile phone" />
          <Field label="Brand" testId="item-brand-input" value={form.brand} onChange={set("brand")} placeholder="vivo" />
          <Field label="Safety stock (low-stock alert at or below)" testId="item-min-stock-input" type="number" min="0" value={form.min_stock} onChange={set("min_stock")} />
          <Field label="Unit" testId="item-unit-input" value={form.unit} onChange={set("unit")} placeholder="pcs" />
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
          <Field label="Cost (₹)" testId="item-cost-input" type="number" min="0" step="0.01" value={form.cost_price} onChange={set("cost_price")} />
          <Field label="Price (₹)" testId="item-price-input" type="number" min="0" step="0.01" value={form.selling_price} onChange={set("selling_price")} />
        </div>
        {!editing && (
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
            <Field label="Initial quantity" testId="item-initial-qty-input" type="number" min="0" value={form.initial_qty} onChange={set("initial_qty")} placeholder="0" />
            <label className="block">
              <span className="text-sm font-medium text-gray-500">Location</span>
              <select data-testid="item-location-select" className="field mt-1" value={form.location} onChange={set("location")}>
                {team?.locations?.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <label className="block">
            <span className="text-sm font-medium text-gray-500">Description</span>
            <textarea data-testid="item-description-input" className="field mt-1 min-h-[80px]" value={form.description} onChange={set("description")} />
          </label>
        </div>
        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button data-testid="item-save-button" disabled={busy} className="btn-primary w-full">
            {busy ? "Saving…" : editing ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
