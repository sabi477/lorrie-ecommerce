import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-shipping',
  imports: [RouterLink],
  templateUrl: './shipping.html',
  styleUrl: './shipping.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Shipping {}
