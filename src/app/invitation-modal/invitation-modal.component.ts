import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { InvitationService } from 'src/app/services/invitation.service';

@Component({
  selector: 'app-invitation-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Invite Participants</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="inviteForm" (ngSubmit)="sendInvitation()">
        <!-- Email Addresses Input -->
        <ion-item>
          <ion-label position="stacked">Email Addresses</ion-label>
          <ion-textarea
            formControlName="emails"
            placeholder="Enter email addresses (separated by commas)"
            rows="4"
            class="ion-margin-top"
          ></ion-textarea>
        </ion-item>

        <!-- Date Input -->
        <ion-item>
          <ion-label position="stacked">Select Date</ion-label>
          <ion-input
            type="date"
            formControlName="inviteDate"
          ></ion-input>
        </ion-item>

        <!-- Time Input -->
        <ion-item>
          <ion-label position="stacked">Select Time</ion-label>
          <ion-input
            type="time"
            formControlName="inviteTime"
          ></ion-input>
        </ion-item>

        <!-- Email Client Selector -->
        <ion-segment formControlName="emailClient" class="ion-margin-top">
          <ion-segment-button value="gmail">
            <ion-label>Gmail</ion-label>
            <ion-icon name="mail"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="outlook">
            <ion-label>Outlook</ion-label>
            <ion-icon name="mail-open"></ion-icon>
          </ion-segment-button>
        </ion-segment>

        <!-- Send Invites Button -->
        <ion-button
          expand="block"
          type="submit"
          class="ion-margin-top"
          [disabled]="!inviteForm.valid"
        >
          <ion-icon name="send" slot="start"></ion-icon>
          Send Invites
        </ion-button>
      </form>
    </ion-content>
  `
})
export class InvitationModalComponent {
  @Input() meetingId!: string;
  @Input() hostName!: string;

  inviteForm: FormGroup;

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private invitationService: InvitationService
  ) {
    this.inviteForm = this.formBuilder.group({
      emails: ['', Validators.required],
      emailClient: ['gmail'],
      inviteDate: ['', Validators.required],
      inviteTime: ['', Validators.required]
    });
  }

  sendInvitation() {
    if (this.inviteForm.valid) {
      const emails = this.inviteForm.get('emails')?.value.split(',').map((email: string) => email.trim());
      const isGmail = this.inviteForm.get('emailClient')?.value === 'gmail';
      
      try {
        // Get date and time values
        const dateValue = this.inviteForm.get('inviteDate')?.value;
        const timeValue = this.inviteForm.get('inviteTime')?.value;
        
        // Create Date object
        const scheduledDateTime = new Date(dateValue);
        if (timeValue) {
          const [hours, minutes] = timeValue.split(':');
          scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        // Send invitation
        this.invitationService.sendInvitation({
          emails,
          meetingId: this.meetingId,
          hostName: this.hostName,
          scheduledDateTime
        }, isGmail);

        this.dismiss();
      } catch (error) {
        console.error('Error creating date:', error);
      }
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}