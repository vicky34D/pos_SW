# Bill upload (AI) — setup and how it works

Upload a supplier bill (PDF or phone photo) on **Purchase Bills → ⬆ Upload Bill**.
Claude Haiku 5.5 reads it, and the app automatically:

1. Splits the file into invoices (one PDF can hold several, like Flipkart orders).
2. Finds the supplier by GSTIN or name, or creates it.
3. Matches every product line to your item master, or creates a new item.
4. Skips non-items (handling fee, delivery, ₹0 lines).
5. Converts packs to the item's unit: uses the item's **Pack size** (Item Master), or the size printed on the bill (e.g. "1 L pouch", "5 kg").
6. Creates the purchase bill as **Paid** (a UPI payment is recorded, since uploaded bills are already paid): stock goes up and the item's average cost is updated.
7. Refuses to import the same supplier invoice number twice.

Nothing existing is overwritten. Every change goes through the stock ledger, so a
wrong import is undone by opening the bill and pressing **Cancel**.

Cost: about ₹0.10–0.40 per bill (shown after every upload).

## One-time setup

### 1. Create an Anthropic API key
1. Go to https://console.anthropic.com and sign in (or sign up).
2. **Billing** → add credit. The minimum ($5) lasts more than a year at ~150 bills/month.
3. **API Keys** → **Create Key** → name it `dhars-pos` → copy the key (starts with `sk-ant-`).
   Keep it secret: anyone with it can spend your credit.
4. Optional: **Limits** → set a monthly spend limit (for example $2).

### 2. Add the key in the app
Log in as the main admin → **Settings → AI Bill Upload** → paste the key → **Save key**.

- The app checks the key with Anthropic before saving it, and it works at once (no restart).
- It is saved only on the server, in `server/ai.env` (git-ignored, readable only by the app).
  The app never shows it again: only "Key saved (ends in …abcd)".
- Only the main admin sees this box. Use **Replace** for a new key, **Remove** to switch bill upload off.

(Alternative for server admins: put `ANTHROPIC_API_KEY=sk-ant-...` in `server/ai.env` by SSH and `chmod 600` it.)

### 3. (Only if big PDFs fail) raise the upload size in Nginx
Photos are shrunk in the browser and always fit. If a large PDF shows
"File is too large", add this inside the `server { … }` block of the site's Nginx config,
then reload Nginx:

```
client_max_body_size 12m;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Daily use
1. **Purchase Bills → ⬆ Upload Bill** → choose the PDF or take a photo.
2. Wait 10–30 seconds. A result window lists each invoice: imported, already imported, or skipped.
3. Read the ⚠ warnings:
   - **Unit warning**: the bill's unit differs from the item's (for example 4 packs vs an item counted in litres). Fix the stock in Item Master if needed.
   - **Total warning**: the imported total differs from the printed total by more than ₹1.
4. Imported bills are saved as Paid. To change the payment method, open the bill's payment.
5. Something wrong? Open the bill → **Cancel** (stock is reversed) → fix → upload again.

## Pack sizes
If a bill only says "4 packs" (no size), set the item's **Pack size on bills** in Item Master once
(Milk counted in litre, 500 ml packs → 0.5). Every later bill converts automatically.

## Starting fresh
Item Master → **Reset all stock to 0** (Admin only, type RESET). Every item's stock becomes 0;
items, bills and sales history are kept, and each change is logged as a Stock Adjustment.

## Tips
- Original PDFs read best. For photos, lay the bill flat in good light with all edges visible.
- New items keep the bill's name. Rename them in Item Master once; later bills match the renamed item.
