import { Injectable } from '@angular/core';

export interface InvitationData {
  emails: string[];
  meetingId: string;
  hostName: string;
  scheduledDateTime?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private formatEmails(emails: string[], isGmail: boolean): string {
    const cleanEmails = emails.map(email => email.trim()).filter(email => email);
    return isGmail ? cleanEmails.join(',') : cleanEmails.join(';');
  }

  private formatDateTime(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      return 'To be scheduled';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  }

  private createEmailContent(data: InvitationData): { subject: string; body: string } {
    const subject = `Video Meeting Invitation from ${data.hostName}`;
    let scheduledDateTime = 'To be scheduled';
    if (data.scheduledDateTime && data.scheduledDateTime instanceof Date) {
      scheduledDateTime = this.formatDateTime(data.scheduledDateTime);
    }

    const body = `Hello,

${data.hostName} is inviting you to join a video meeting.

Meeting Details:
---------------
Meeting ID: ${data.meetingId}
Scheduled Date & Time: ${scheduledDateTime}

To join the meeting:
1. Open the video meeting application
2. Click on "Join Meeting"
3. Enter the Meeting ID above
4. Enter your name
5. Click "Join"

Best regards,
${data.hostName}`;

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