import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-returns',
  imports: [RouterLink],
  templateUrl: './returns.html',
  styleUrl: './returns.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Returns {}
