// Bundle with the project's esbuild (platform=node, format=cjs, jsx=automatic),
// write the bundle to a native absolute scratch path, then run it with node.
// Bash $TMPDIR may be /tmp on Windows; do not pass that to native Node/esbuild.
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import InventoryMismatchDetails from '../src/components/Dashboard/InventoryMismatchDetails';
import ReplenishmentPlanner from '../src/components/Dashboard/ReplenishmentPlanner';
import type { InventoryMismatch } from '../src/utils/inventoryValidation';
import type { InventoryRecord } from '../src/types/inventory';

const mismatches: InventoryMismatch[] = [
    { product: 'Shirt', size: 'M', date: '2026-01-02', expected: 9, actual: 8 },
    { product: 'Shirt', size: 'L', date: '2026-01-04', expected: 20, actual: 15 },
    { product: 'Hat', size: 'M', date: '2026-01-05', expected: 10, actual: 1 },
    { product: 'Shirt', size: 'M', date: '2026-01-03', expected: 4, actual: 7 },
];
const snapshot = JSON.stringify(mismatches);
const html = renderToStaticMarkup(<InventoryMismatchDetails product="Shirt" size="M" mismatches={mismatches} />);
assert.match(html, /<details[^>]*>/);
assert.doesNotMatch(html, /<details[^>]*\sopen[\s=>]/);
assert.match(html, /<summary[^>]*aria-label="Cek stok dulu: Shirt \(M\), 2 selisih"/);
assert.match(html, /focus-visible:ring-2/);
assert.match(html, /Cek stok dulu \(2\)/);
assert.match(html, /<dt>Seharusnya<\/dt><dd>9 pcs<\/dd>/);
assert.match(html, /<dt>Tercatat<\/dt><dd>8 pcs<\/dd>/);
assert.match(html, /<dd>-1 pcs<\/dd>/);
assert.match(html, /<dd>\+3 pcs<\/dd>/);
assert.ok(html.indexOf('dateTime="2026-01-03"') < html.indexOf('dateTime="2026-01-02"'));
assert.doesNotMatch(html, /2026-01-04|2026-01-05|Hat|20 pcs|15 pcs/);
assert.equal(JSON.stringify(mismatches), snapshot, 'input order is preserved');
const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
assert.ok(describedBy);
assert.ok(html.includes(`id="${describedBy}"`));
assert.equal(renderToStaticMarkup(<InventoryMismatchDetails product="Shirt" size="S" mismatches={mismatches} />), '');
assert.equal(renderToStaticMarkup(<InventoryMismatchDetails product="Shirt" size="M" mismatches={[]} />), '');

const data: InventoryRecord[] = ['M', 'L', 'S'].map(size => ({
    product: 'Shirt', size: size as InventoryRecord['size'], date: '2026-01-03', stock: 7,
    in: 0, out: 1, validStock: true, isReturn: false,
}));
const planner = renderToStaticMarkup(<ReplenishmentPlanner data={data} productMetadata={{}} mismatches={mismatches} />);
assert.equal((planner.match(/<summary[^>]*aria-label="Cek stok dulu:/g) ?? []).length, 2);
assert.match(planner, /id="rencana-pemesanan" tabindex="-1" role="group" class="[^"]*scroll-mt-6/);
assert.match(planner, /Kondisi Stok/);
assert.match(planner, /Stok Menipis/);
assert.match(planner, /Barang yang sudah diorder tetap dihitung sesuai kondisi stoknya/);
assert.match(planner, /Rumus ini membantu mengurangi pesanan berlebih/);
assert.doesNotMatch(renderToStaticMarkup(<ReplenishmentPlanner data={data} productMetadata={{}} mismatches={[]} />), /Cek stok dulu/);
console.log('inventory mismatch detail checks passed');
