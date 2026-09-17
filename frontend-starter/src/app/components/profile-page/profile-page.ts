import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.success.set('');
    this.auth.profile().subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil chargé', user.id);
        this.form.setValue({ name: user.name });
      },
      error: () => {
        console.error('[ProfilePage] Chargement impossible');
        this.error.set('Impossible de charger le profil. Réessayez.');
      },
    });
  }

  save(): void {
    this.error.set('');
    this.success.set('');
    this.form.controls.name.setValue(this.form.controls.name.value.trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.auth.update(this.form.getRawValue().name).subscribe({
      next: (user) => {
        this.form.setValue({ name: user.name });
        this.success.set('Votre nom a été mis à jour.');
      },
      error: () => {
        console.error('[ProfilePage] Enregistrement impossible');
        this.error.set('Impossible de modifier le nom. Réessayez.');
      },
    });
  }
}
