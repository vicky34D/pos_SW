# Bill upload (AI) — setup and how it works

Upload a supplier bill (PDF or phone photo) on **Purchase Bills → ⬆ Upload Bill**.
Claude Haiku 5.5 reads it, and the app automatically:

1. Splits the file into invoices (one PDF can hold several, like Flipkart orders).
2. Finds the supplier by GSTIN or name, or creates it.
3. Matches every product line to your item master, or creates a new item.
4. Skips non-items (handling fee, delivery, ₹0 lines).
5. Creates a **Submitted** purchase bill: stock goes up and the item's average cost is updated.
6. Refuses to import the same supplier invoice number twice.

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

### 2. Put the key on the server
SSH into the server, then:

```bash
cd ~/pos_SW/server
nano ai.env
```

Type one line, then save (Ctrl+O, Enter, Ctrl+X):

```
ANTHROPIC_API_KEY=sk-ant-...your key...
```

```bash
chmod 600 ai.env
pm2 restart pos-app
```

`ai.env` is git-ignored, so deploys never delete or publish it.

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
4. Imported bills are unpaid. Record the payment as usual (Flipkart orders are usually prepaid).
5. Something wrong? Open the bill → **Cancel** (stock is reversed) → fix → upload again.

## Tips
- Original PDFs read best. For photos, lay the bill flat in good light with all edges visible.
- New items keep the bill's name. Rename them in Item Master once; later bills match the renamed item.
