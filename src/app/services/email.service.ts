import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { AlertController, LoadingController,ToastController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor(private toastController:ToastController) {
    emailjs.init(environment.emailjsPublicKey);

   }
async notifyMentorAndStudent(student:any,mentor:any,moduleCode:string) {
    const closingMessage = "If you have any questions or require assistance, feel free to reply to this email.";
    emailjs.send("service_i0kjx0e","template_cbrmxyu",{
            recipient_name: mentor.name,
            student_name: student.name +' '+ student.surname,
            studentNumber: student.studentNumber,
            student_email: student.email,
            module: moduleCode,
            message: "We are excited to inform you that you have been paired with a new student for the mentorship program. Please find the details below.",
            closingMessage: closingMessage,
            reply_to:  mentor.email
        }).then(async (response) => {
            console.log("Email sent to mentor successfully!", response.status, response.text);
            this.toastMessage('Email sent to mentor successfully!','success','checkmark-circle-outline','cancel');
        }, (error) => {
            console.log("Failed to send email to mentor. Error: ", error);
            this.toastMessage('Failed to send email to mentor','danger', 'close-circle-outline','cancel');
        });
        emailjs.send("service_i0kjx0e","template_cbrmxyu", {
            recipient_name: student.name +' '+ student.studentNumber,
            student_name: mentor.name +' '+mentor.surname,
            student_email: mentor.email,
            studentNumber: mentor.mentorID,
            module: moduleCode,
            message: "We are pleased to announce that you have been assigned a mentor for your studies. Please find the details below.",
            closingMessage: closingMessage,
            reply_to:student.email
        }).then(async (response) => {
            console.log("Email sent to student successfully!", response.status, response.text);
            this.toastMessage('Email sent to student successfully!','success','checkmark-circle-outline','cancel');
        }, async (error) => {
            console.log("Failed to send email to student. Error: ", error);
            this.toastMessage('Failed to send email to student','danger', 'close-circle-outline','cancel');
  })
}
  async toastMessage(messages:string,colors:string,icons:string,action:string){
    const toast = await this.toastController.create({
      message: messages,
      duration: 2000,
      position: 'bottom',
      color: colors,
      buttons: [
        {
          icon:icons,
          role: action
        }
      ]
    });
    await toast.present();

  }
}
  

