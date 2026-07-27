import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-business-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-chatbot.component.html',
  styleUrls: ['./business-chatbot.component.scss']
})
export class BusinessChatbotComponent implements AfterViewChecked {
  @Input() chatMessages: any[] = [];
  @Input() chatLoading = false;
  @Input() chatMinimized = true;
  @Input() chatOpen = false;
  @Input() chatInput = '';

  @Output() toggle = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();
  @Output() submitChat = new EventEmitter<string>();
  @Output() chatInputChange = new EventEmitter<string>();

  @ViewChild('chatMessageList') private chatMessageList!: ElementRef;
  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat() {
    this.toggle.emit();
    this.shouldScroll = true;
  }

  closeChat() {
    this.close.emit();
  }

  openChat() {
    this.open.emit();
    this.shouldScroll = true;
  }

  submitBusinessChat() {
    if (!this.chatInput.trim() || this.chatLoading) return;
    this.submitChat.emit(this.chatInput);
    this.shouldScroll = true;
  }

  onChatInputChange() {
    this.chatInputChange.emit(this.chatInput);
  }

  fillChatSuggestion() {
    this.chatInput = 'Đánh giá kinh doanh 30 ngày qua';
    this.onChatInputChange();
  }

  setChatInput(question: string) {
    this.chatInput = question;
    this.onChatInputChange();
  }

  hasKpis(kpis: any): boolean {
    return !!kpis && Object.keys(kpis).length > 0;
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessageList) {
        this.chatMessageList.nativeElement.scrollTop = this.chatMessageList.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
