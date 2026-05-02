import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact-us',
  imports: [RouterLink],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ContactUs {}
