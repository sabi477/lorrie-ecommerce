import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [RouterLink, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Contact {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };
  submitted = false;

  submitForm() {
    if (this.formData.name && this.formData.email && this.formData.message) {
      this.submitted = true;
    }
  }
}
