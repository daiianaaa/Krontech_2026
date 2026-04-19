import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="width:100%;max-width:420px" class="animate-in">
      <h2>Create Account</h2>
      <p class="text-secondary mb-2">Join the MediStock network</p>
      <p class="text-muted text-sm">Registration form placeholder — connect AuthService register endpoint.</p>
      <p class="text-sm mt-2"><a routerLink="/auth/login">← Back to login</a></p>
    </div>
  `
})
export class RegisterComponent {}
