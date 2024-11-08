import { Injectable } from '@angular/core';

export interface InvitationData {
  emails: string[];
  meetingId: string;
  hostName: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private formatEmails(emails: string[], isGmail: boolean): string {
    const cleanEmails = emails.map(email => email.trim()).filter(email => email);
    return isGmail ? cleanEmails.join(',') : cleanEmails.join(';');
  }

  private createEmailContent(data: InvitationData): { subject: string; body: string } {
    const subject = `Video Meeting Invitation from ${data.hostName}`;
    const body = `
Hello,

${data.hostName} is inviting you to join a video meeting.

Meeting Details:
---------------
Meeting ID: ${data.meetingId}

To join the meeting:
1. Open the video meeting application
2. Click on "Join Meeting"
3. Enter the Meeting ID above
4. Enter your name
5. Click "Join"

Best regards,
${data.hostName}
    `;

    return { subject, body };
  }

  sendInvitation(data: InvitationData, isGmail: boolean = true): void {
    const { subject, body } = this.createEmailContent(data);
    const formattedEmails = this.formatEmails(data.emails, isGmail);
    
    const mailtoUrl = isGmail
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${formattedEmails}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : `https://outlook.office.com/mail/deeplink/compose?to=${formattedEmails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl, '_blank');
  }
}