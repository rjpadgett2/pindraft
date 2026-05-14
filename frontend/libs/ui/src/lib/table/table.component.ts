import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Vanilla-CSS table — minimal styled wrapper around a native <table>. Replaces
 * <mat-table> for ops-console list screens (lots, invoices, pools, etc.).
 *
 * Deliberately NOT a generic data-table abstraction (no column definitions,
 * no sort logic). Components own their column structure with native <th> /
 * <td>; pd-table just provides the visual conventions: typography, dividers,
 * row hover, alignment. Sort indicators, cell rendering, and data are the
 * component's job.
 *
 * Usage:
 *   <pd-table>
 *     <thead>
 *       <tr>
 *         <th>Invoice #</th>
 *         <th>Customer</th>
 *         <th class="pd-table__num">Total</th>
 *       </tr>
 *     </thead>
 *     <tbody>
 *       @for (i of invoices(); track i.id) {
 *         <tr>
 *           <td>{{ i.invoiceNumber }}</td>
 *           <td>{{ i.customer }}</td>
 *           <td class="pd-table__num"><pd-money [cents]="i.totalCents" /></td>
 *         </tr>
 *       }
 *     </tbody>
 *   </pd-table>
 *
 * Helper classes: .pd-table__num for right-aligned numeric columns, .pd-table__muted
 * for tertiary content, .pd-table__compact on the host for tighter row height.
 */
@Component({
  selector: 'pd-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<table class="pd-table"><ng-content /></table>`,
  styles: [`
    :host { display: block; overflow-x: auto; }
    .pd-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
    }
    .pd-table :is(thead, tbody) th,
    .pd-table :is(thead, tbody) td {
      padding: var(--pd-space-3) var(--pd-space-4);
      text-align: left;
      vertical-align: middle;
    }
    .pd-table thead th {
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pd-color-text-muted);
      border-bottom: 1px solid var(--pd-color-border);
      background: var(--pd-color-bg-surface);
      position: sticky;
      top: 0;
    }
    .pd-table tbody tr {
      border-bottom: 1px solid var(--pd-color-border);
      transition: background-color 120ms ease;
    }
    .pd-table tbody tr:hover { background: var(--pd-color-bg-sunken); }
    .pd-table tbody td { color: var(--pd-color-text); }

    .pd-table .pd-table__num { text-align: right; font-variant-numeric: tabular-nums; }
    .pd-table .pd-table__muted { color: var(--pd-color-text-muted); }
    .pd-table .pd-table__mono { font-family: var(--pd-font-mono); font-size: var(--pd-text-xs); color: var(--pd-color-text-muted); }

    /* Optional compact density */
    :host(.pd-table--compact) .pd-table :is(thead, tbody) :is(th, td) {
      padding: var(--pd-space-2) var(--pd-space-3);
    }
  `],
})
export class TableComponent {}
