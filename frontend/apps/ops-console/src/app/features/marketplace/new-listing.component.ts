import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ListingKind, ListingsService } from './services/listings.service';

@Component({
  selector: 'ops-new-listing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/marketplace/listings" class="back">← Back to listings</a>
      <h1 class="page-title">New listing</h1>
      <p class="page-subtitle">Drafts are private until you publish them.</p>

      <div class="form">
        <mat-form-field appearance="outline">
          <mat-label>Kind</mat-label>
          <mat-select [(value)]="kind">
            <mat-option value="YARN">Yarn</mat-option>
            <mat-option value="ROVING">Roving</mat-option>
            <mat-option value="FLEECE">Fleece</mat-option>
            <mat-option value="BLANK">Felted / woven panel</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="title" placeholder="e.g., Romney 2-ply worsted, plant-dyed indigo" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput rows="3" [(ngModel)]="description"></textarea>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Price per kg ($)</mat-label>
            <input matInput type="number" min="0" step="0.50" [(ngModel)]="pricePerKg" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Quantity (kg)</mat-label>
            <input matInput type="number" min="0" step="0.1" [(ngModel)]="quantityKg" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Trace slug (optional)</mat-label>
          <input matInput [(ngModel)]="traceSlug" placeholder="e.g., K9MW3T" maxlength="6" />
          <mat-hint>Attach a lot's provenance trace. Public viewers see the journey.</mat-hint>
        </mat-form-field>

        <div class="actions">
          <button mat-button routerLink="/marketplace/listings">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="save()">
            Create draft
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    mat-form-field { width: 100%; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class NewListingComponent {
  private service = inject(ListingsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  kind: ListingKind = 'YARN';
  title = '';
  description = '';
  pricePerKg = 0;
  quantityKg = 0;
  traceSlug = '';

  canSave(): boolean {
    return this.title.trim().length > 0 && this.pricePerKg > 0 && this.quantityKg > 0;
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.create(tid, {
      kind: this.kind,
      title: this.title.trim(),
      description: this.description || undefined,
      pricePerKg: this.pricePerKg,
      quantityKg: this.quantityKg,
      traceSlug: this.traceSlug.trim().toUpperCase() || undefined,
    }).subscribe({
      next: () => {
        this.snack.open('Listing drafted', 'OK', { duration: 1500 });
        this.router.navigate(['/marketplace/listings']);
      },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
