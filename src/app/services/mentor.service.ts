// src/app/services/mentor.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Mentor } from '../models/mentor.model';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class MentorService {
    constructor(
        private firestore: AngularFirestore,
        private auth: AngularFireAuth
    ) { }

     // Updated mentor ID generation
     private generateMentorID(department: string, name: string): string {
        const deptCode = department.substring(0, 2).toUpperCase();
        const nameCode = name.substring(0, 2).toUpperCase();
        const randomNum = Math.floor(Math.random() * 900) + 100; // Generate 3 random numbers
        return `${deptCode}${nameCode}${randomNum}`;
    }

    // Add new mentor with updated ID generation
    addMentor(mentor: Omit<Mentor, 'mentorID'>): Promise<void> {
        const mentorWithID: Mentor = {
            ...mentor,
            mentorID: this.generateMentorID(mentor.department, mentor.name)
        };

        return this.firestore
            .collection('mentors')
            .doc(mentorWithID.mentorID)
            .set(mentorWithID);
    }

    // Update existing mentor
    updateMentor(mentorID: string, updates: Partial<Omit<Mentor, 'mentorID'>>): Promise<void> {
        return this.firestore
            .collection('mentors')
            .doc(mentorID)
            .update(updates);
    }

    // Get mentor by ID
    getMentorByID(mentorID: string): Observable<Mentor | undefined> {
        return this.firestore
            .doc<Mentor>(`mentors/${mentorID}`)
            .valueChanges();
    }



    // Authenticate mentor with proper error handling and typing
    authenticateMentor(email: string): Promise<void> {
        const tempPassword = Math.random().toString(36).slice(-8);
        
        return this.auth
            .createUserWithEmailAndPassword(email, tempPassword)
            .then(() => this.auth.sendPasswordResetEmail(email))
            .catch((error: Error) => {
                console.error('Authentication error:', error);
                throw error;
            });
    }

    // Get all mentors with proper typing
    getMentors(): Observable<Mentor[]> {
        return this.firestore
            .collection<Mentor>('mentors')
            .valueChanges();
    }


}
