


import { Component, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ApiService } from './api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class App {
  msg = '';
  messages: any[] = [];
  conversationId = '';
  conversations: string[] = [];
  loading = false;
  showAll = false;
  constructor(private api: ApiService) {}
  @ViewChild('convIdInput') convIdInput!: ElementRef<HTMLInputElement>;
  ngOnInit() {
    if (!this.conversationId) {
      this.api.startConversation().subscribe(r => {
        this.conversationId = r.conversationId;
        this.loadMessages(this.conversationId);
      });
    } else {
      this.loadMessages(this.conversationId);
    }
  }
  detectChanges(){
      this.convIdInput.nativeElement.focus();
      this.convIdInput.nativeElement.blur();
  }

  loadMessages(cid: string) {
    this.conversationId = cid;
    this.api.getConversation(cid).subscribe(r => {
      if (!r) {
        this.messages = [];
        this.detectChanges();
        return;
      }
      this.messages = r.messages || [];
      this.detectChanges();
    });
  }

  send() {
    if (!this.conversationId) return;
    const m = this.msg;
    this.loading = true;
    this.api.sendMessage(this.conversationId, m)
      .subscribe(r => {
        this.messages.push({ role: 'user', content: m });
        this.messages.push({ role: 'assistant', content: r.response });
        this.msg = '';
        this.loading = false;
        this.detectChanges();
        console.log(this.messages, this.loading);
      });
  }

  reset() {
    if (!this.conversationId) return;
    this.api.resetConversation(this.conversationId).subscribe(() => {
      this.messages = [];
      this.detectChanges();
    });
  }
  del(id: string) {
    this.api.deleteConversation(id).subscribe(() => {
      this.conversations = this.conversations.filter(c => c !== id);
    });
  }
}
