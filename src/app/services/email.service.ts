import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor() { }



async notifyMentorAndStudent(student:any,mentor:any,moduleCode:string) {
    // const studentDoc = await firestore.collection('students').doc(studentId).get();
    // const mentorDoc = await firestore.collection('mentors').doc(mentorId).get();
    // const student = studentDoc.data();
    // const mentor = mentorDoc.data();

    
    const message = `Hello ${mentor.name}, you have been assigned as a mentor to ${student.name} for module ${moduleCode}. 
    Please connect with the student and assist them.`;
  
    emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      to_email: mentor.email,
      message: message,
    });
  
    const studentMessage = `Hello ${student.name}, a mentor has been assigned to help you with ${moduleCode}. 
    Please reach out to your mentor, ${mentor.name}, for assistance.`;
  
    emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      to_email: student.email,
      message: studentMessage,
    });
  
    console.log("Notifications sent to mentor and student.");
  }
  
}
