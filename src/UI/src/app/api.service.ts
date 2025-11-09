import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  baseUrl = `http://localhost:${environment.apiPort}`;
  constructor(private http: HttpClient) {}
  startConversation() {
    return this.http.post<any>(`${this.baseUrl}/api/conversations`, {});
  }
  sendMessage(conversationId: string, message: string) {
    return this.http.post<any>(`${this.baseUrl}/api/conversations/${conversationId}/messages`, { message });
  }
  resetConversation(conversationId: string) {
    return this.http.post(`${this.baseUrl}/api/conversations/${conversationId}/reset`, {});
  }
  fetchHealthStatus() {
    return this.http.get<any>(`${this.baseUrl}/api/health`);
  }
  getConversation(conversationId: string) {
    if (!conversationId) {
        return of(null);
    }
    return this.http.get<any>(`${this.baseUrl}/api/conversations/${conversationId}`);
  }
  deleteConversation(id: string) {
    return this.http.delete(`${this.baseUrl}/api/conversations/${id}`);
  }
}
