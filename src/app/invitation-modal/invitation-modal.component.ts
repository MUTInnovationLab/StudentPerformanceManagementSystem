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
        <ion-item>
          <ion-label position="stacked">Email Addresses</ion-label>
          <ion-textarea
            formControlName="emails"
            placeholder="Enter email addresses (separated by commas)"
            rows="4"
            class="ion-margin-top"
          ></ion-textarea>
        </ion-item>
        
        <div class="ion-margin-vertical validation-error" *ngIf="inviteForm.get('emails')?.errors?.['required'] && inviteForm.get('emails')?.touched">
          Please enter at least one email address
        </div>

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
  `,
  styles: [`
    .validation-error {
      color: var(--ion-color-danger);
      font-size: 0.8em;
      margin-left: 16px;
    }
  `]
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
      emailClient: ['gmail']
    });
  }

  sendInvitation() {
    if (this.inviteForm.valid) {
      const emails = this.inviteForm.get('emails')?.value.split(',');
      const isGmail = this.inviteForm.get('emailClient')?.value === 'gmail';

      this.invitationService.sendInvitation({
        emails,
        meetingId: this.meetingId,
        hostName: this.hostName
      }, isGmail);

      this.dismiss();
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}