import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { AuthUser } from '../../models/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  @Output() loginSuccess = new EventEmitter<AuthUser>();

  username = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService) { }

  submit(): void {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Username and password are required';
      return;
    }

    try {
      const response = this.authService.login({
        username: this.username,
        password: this.password
      });

      this.loginSuccess.emit(response.user);
    } catch {
      this.errorMessage = 'Invalid username or password';
    }
  }
}