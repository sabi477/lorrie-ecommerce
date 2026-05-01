import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatPanel } from './shared/chat-panel/chat-panel';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class App {
  title = 'frontend';
}