// add-mentor.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MentorService } from '../../services/mentor.service';
import { Mentor } from '../../models/mentor.model';

@Component({
  selector: 'app-add-mentor',
  templateUrl: './add-mentor.page.html',
  styleUrls: ['./add-mentor.page.scss']
})
export class AddMentorPage implements OnInit, OnDestroy {
  mentorForm!: FormGroup;
  private subscriptions: Subscription[] = [];
  loading = false;
  isEditMode = false;
  mentorID: string | null = null;
  
  // Split view properties
  mentors$: Observable<Mentor[]>;
  filteredMentors$: Observable<Mentor[]>;
  selectedMentorId: string | null = null;
  searchTerm: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private mentorService: MentorService,
    private route: ActivatedRoute,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.initializeForm();
    this.mentors$ = this.mentorService.getMentors();
    this.filteredMentors$ = this.mentors$;
    
    const routerSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log('Current route:', event.url);
    });
    this.subscriptions.push(routerSub);
  }

  // Initialize form and load mentor if in edit mode
  ngOnInit(): void {
    console.log('AddMentorPage initialized');
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Route ID:', id);
    
    if (id) {
      this.isEditMode = true;
      this.mentorID = id;
      this.selectedMentorId = id;
      this.loadMentorData(id);
    }
  }

  // Clean up subscriptions
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Split view methods
  selectMentor(mentorId: string) {
    this.selectedMentorId = mentorId;
    this.router.navigate(['/mentors/edit', mentorId]);
  }

  filterMentors() {
    if (!this.searchTerm.trim()) {
      this.filteredMentors$ = this.mentors$;
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredMentors$ = this.mentors$.pipe(
      map(mentors => mentors.filter(mentor => 
        mentor.name.toLowerCase().includes(searchTermLower) ||
        mentor.surname.toLowerCase().includes(searchTermLower) ||
        mentor.department.toLowerCase().includes(searchTermLower) ||
        mentor.mentorID.toLowerCase().includes(searchTermLower)
      ))
    );
  }

  getAvatarColor(department: string): string {
    let hash = 0;
    for (let i = 0; i < department.length; i++) {
      hash = department.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  // Existing methods
  private loadMentorData(mentorID: string): void {
    const sub = this.mentorService.getMentorByID(mentorID).subscribe({
      next: (mentor) => {
        if (mentor) {
          this.mentorForm.patchValue({
            ...mentor,
            modules: mentor.modules.join(', ')
          });
        } else {
          this.showToast('Mentor not found', 'danger');
          this.router.navigate(['/mentors']);
        }
      },
      error: (error) => {
        console.error('Error loading mentor:', error);
        this.showToast('Error loading mentor data', 'danger');
      }
    });
    this.subscriptions.push(sub);
  }

  private initializeForm(): void {
    this.mentorForm = this.formBuilder.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern('^[a-zA-Z ]*$')
      ]],
      surname: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern('^[a-zA-Z ]*$')
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
      ]],
      faculty: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      department: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      stream: [''],
      modules: ['', [
        Validators.required,
        Validators.minLength(2)
      ]]
    });
  }
  // Modified onSubmit to handle both add and edit
  async onSubmit(): Promise<void> {
    if (this.mentorForm.valid && !this.loading) {
      const loader = await this.showLoading();
      try {
        this.loading = true;
        const mentorData = this.prepareMentorData();

        if (this.isEditMode && this.mentorID) {
          // Update existing mentor
          await this.mentorService.updateMentor(this.mentorID, mentorData);
          await this.showToast('Mentor updated successfully.');
        } else {
          // Add new mentor
          await this.mentorService.addMentor(mentorData);
          await this.mentorService.authenticateMentor(mentorData.email);
          await this.showToast('Mentor added successfully. Password reset email sent.');
        }
        
        this.router.navigate(['/mentors']);
      } catch (error: any) {
        await this.showError(error);
        console.error(`Error ${this.isEditMode ? 'updating' : 'adding'} mentor:`, error);
      } finally {
        this.loading = false;
        await loader.dismiss();
      }
    } else {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.mentorForm.controls).forEach(key => {
        const control = this.mentorForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  private async showLoading(): Promise<HTMLIonLoadingElement> {
    const loader = await this.loadingController.create({
      message: this.isEditMode ? 'Updating mentor...' : 'Adding mentor...',
      spinner: 'crescent'
    });
    await loader.present();
    return loader;
  }

  // Getter methods for easy access in template
  get formControls() {
    return this.mentorForm.controls;
  }

  // Helper method to check if a field has errors
  hasError(controlName: string, errorName: string): boolean {
    const control = this.mentorForm.get(controlName);
    return control ? control.errors?.[errorName] && control.touched : false;
  }

 

  private async showToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showError(error: any): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: this.getErrorMessage(error),
      buttons: ['OK']
    });
    await alert.present();
  }

  private getErrorMessage(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'This email is already registered.';
        case 'auth/invalid-email':
          return 'The email address is invalid.';
        default:
          return 'An error occurred while adding the mentor.';
      }
    }
    return error?.message || 'An unexpected error occurred.';
  }

  private validateModules(modulesString: string): string[] {
    return modulesString
      .split(',')
      .map(module => module.trim())
      .filter(module => module.length > 0);
  }

  private prepareMentorData(): Omit<Mentor, 'mentorID'> {
    const formValue = this.mentorForm.value;
    return {
      id: this.mentorID || '', // Add the id property
      name: formValue.name.trim(),
      surname: formValue.surname.trim(),
      email: formValue.email.trim().toLowerCase(),
      faculty: formValue.faculty.trim(),
      department: formValue.department.trim(),
      stream: formValue.stream?.trim() || undefined,
      modules: this.validateModules(formValue.modules)
    };
  }

  

  // Reset form and navigate back
  async cancelAdd(): Promise<void> {
    if (this.mentorForm.dirty) {
      const alert = await this.alertController.create({
        header: 'Discard Changes?',
        message: 'Are you sure you want to discard your changes?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Discard',
            handler: () => {
              this.router.navigate(['/mentors']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/mentors']);
    }
  }

  // Form reset handler
  resetForm(): void {
    this.mentorForm.reset();
  }

  navigateToAdd() {
    this.router.navigate(['/mentors/add']);
  }
  
  navigateToEdit(mentorID: string) {
    this.router.navigate(['/mentors/edit', mentorID]);
  }
}