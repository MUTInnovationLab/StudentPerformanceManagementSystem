// // faculty.page.ts
// import { Component } from '@angular/core';
// import { AngularFirestore } from '@angular/fire/compat/firestore';
// import { LoadingController, ToastController } from '@ionic/angular';

// interface Module {
//   moduleName: string;
//   moduleCode: string;
//   moduleLevel: string;
// }

// interface Stream {
//   modules: Module[];
//   name:string
// }

// interface StreamMap {
//   [key: string]: Stream[];
// }

// interface Department {
//   name: string;
//   streams?: StreamMap;
//   modules?: Module[];
// }

// interface Faculty {
//   id: string;
//   departments: Department[];
// }

// @Component({
//   selector: 'app-faculty-form',
//   templateUrl: './faculty-form.page.html',
//   styleUrls: ['./faculty-form.page.scss'],
// })
// export class FacultyFormPage  {
//   faculty: Faculty = {
//     id: '',
//     departments: []
//   };

//   constructor(
//     private firestore: AngularFirestore,
//     private loadingCtrl: LoadingController,
//     private toastCtrl: ToastController
//   ) {}

//   addDepartment() {
//     this.faculty.departments.push({
//       name: '',
//       streams: {},
//       modules: []
//     });
//   }

//   removeDepartment(index: number) {
//     this.faculty.departments.splice(index, 1);
//   }

//   addStream(departmentIndex: number) {
//     const streamKey = prompt('Enter stream name (e.g., CNET, SD):');
//     if (!streamKey) return;

//     const department = this.faculty.departments[departmentIndex];
//     if (!department.streams) {
//       department.streams = {};
//     }

//     if (!department.streams[streamKey]) {
//       department.streams[streamKey] = [];
//     }

//     department.streams[streamKey].push({
//       modules: [],
//       name:''
//     });
//   }

//   addModule(departmentIndex: number, streamKey?: string, streamIndex?: number) {
//     const newModule: Module = {
//       moduleName: '',
//       moduleCode: '',
//       moduleLevel: ''
//     };

//     const department = this.faculty.departments[departmentIndex];
    
//     if (streamKey && typeof streamIndex === 'number') {
//       if (!department.streams?.[streamKey]?.[streamIndex]) return;
//       department.streams[streamKey][streamIndex].modules.push(newModule);
//     } else {
//       if (!department.modules) {
//         department.modules = [];
//       }
//       department.modules.push(newModule);
//     }
//   }

//   removeModule(departmentIndex: number, moduleIndex: number, streamKey?: string, streamIndex?: number) {
//     const department = this.faculty.departments[departmentIndex];
    
//     if (streamKey && typeof streamIndex === 'number') {
//       if (!department.streams?.[streamKey]?.[streamIndex]) return;
//       department.streams[streamKey][streamIndex].modules.splice(moduleIndex, 1);
//     } else {
//       if (!department.modules) return;
//       department.modules.splice(moduleIndex, 1);
//     }
//   }

//   getStreamKeys(department: Department): string[] {
//     return department.streams ? Object.keys(department.streams) : [];
//   }

//   isFormValid(): boolean {
//     if (!this.faculty.id) return false;
    
//     return this.faculty.departments.every(dept => {
//       if (!dept.name) return false;
      
//       // Check department modules
//       if (dept.modules?.length) {
//         if (!dept.modules.every(mod => mod.moduleName && mod.moduleCode && mod.moduleLevel)) {
//           return false;
//         }
//       }
      
//       // Check streams
//       if (dept.streams) {
//         return Object.values(dept.streams).every(streamArray =>
//           streamArray.every(stream =>
//            stream.name &&
//             stream.modules.every(mod =>
//               mod.moduleName && mod.moduleCode && mod.moduleLevel
//             )
//           )
//         );
//       }
      
//       return true;
//     });
//   }

//   async saveFaculty() {
//     if (!this.isFormValid()) {
//       const toast = await this.toastCtrl.create({
//         message: 'Please fill all required fields',
//         duration: 2000,
//         color: 'warning'
//       });
//       toast.present();
//       return;
//     }

//     const loading = await this.loadingCtrl.create({
//       message: 'Saving faculty data...'
//     });
//     await loading.present();

//     try {
//       // await this.firestore.collection('faculties').add(this.faculty);

//       await this.firestore.collection('faculties').doc(this.faculty.id).set(this.faculty, { merge: true });
//       const toast = await this.toastCtrl.create({
//         message: 'Faculty saved successfully!',
//         duration: 2000,
//         color: 'success'
//       });
//       toast.present();
      
//       // Reset form
//       this.faculty = {
//         id: '',
//         departments: []
//       };
//     } catch (error: any) {
//       const toast = await this.toastCtrl.create({
//         message: 'Error saving faculty: ' + error.message,
//         duration: 3000,
//         color: 'danger'
//       });
//       toast.present();
//     } finally {
//       loading.dismiss();
//     }
//   }
// }

import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LoadingController, ToastController } from '@ionic/angular';

interface Module {
  moduleName: string;
  moduleCode: string;
  moduleLevel: string;
}

interface Stream {
  modules: Module[];
  name: string;
}

interface StreamMap {
  [key: string]: Stream[];
}

interface Department {
  name: string;
  streams?: StreamMap;
  modules?: Module[];
}

interface Faculty {
  id: string;
  departments: Department[];
}

@Component({
  selector: 'app-faculty-form',
  templateUrl: './faculty-form.page.html',
  styleUrls: ['./faculty-form.page.scss'],
})
export class FacultyFormPage {
  faculty: Faculty = {
    id: '',
    departments: []
  };

  constructor(
    private firestore: AngularFirestore,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  // Load an existing faculty by ID
  async loadFaculty(facultyId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Loading faculty data...'
    });
    await loading.present();

    try {
      const doc = await this.firestore.collection('faculties').doc(facultyId).get().toPromise();
      if (doc && doc.exists) {
        this.faculty = { ...(doc.data())  as Faculty};
      } else {
        const toast = await this.toastCtrl.create({
          message: 'Faculty not found',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: 'Error loading faculty: ' + error.message,
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    } finally {
      loading.dismiss();
    }
  }

  addDepartment() {
    this.faculty.departments.push({
      name: '',
      streams: {},
      modules: []
    });
  }

  removeDepartment(index: number) {
    this.faculty.departments.splice(index, 1);
  }

  addStream(departmentIndex: number) {
    const streamKey = prompt('Enter stream name (e.g., CNET, SD):');
    if (!streamKey) return;

    const department = this.faculty.departments[departmentIndex];
    if (!department.streams) {
      department.streams = {};
    }

    if (!department.streams[streamKey]) {
      department.streams[streamKey] = [];
    }

    department.streams[streamKey].push({
      modules: [],
      name: streamKey // Set the stream name to the input value
    });
  }

  addModule(departmentIndex: number, streamKey?: string, streamIndex?: number) {
    const newModule: Module = {
      moduleName: '',
      moduleCode: '',
      moduleLevel: ''
    };

    const department = this.faculty.departments[departmentIndex];
    
    if (streamKey && typeof streamIndex === 'number') {
      if (!department.streams?.[streamKey]?.[streamIndex]) return;
      department.streams[streamKey][streamIndex].modules.push(newModule);
    } else {
      if (!department.modules) {
        department.modules = [];
      }
      department.modules.push(newModule);
    }
  }

  removeModule(departmentIndex: number, moduleIndex: number, streamKey?: string, streamIndex?: number) {
    const department = this.faculty.departments[departmentIndex];
    
    if (streamKey && typeof streamIndex === 'number') {
      if (!department.streams?.[streamKey]?.[streamIndex]) return;
      department.streams[streamKey][streamIndex].modules.splice(moduleIndex, 1);
    } else {
      if (!department.modules) return;
      department.modules.splice(moduleIndex, 1);
    }
  }

  getStreamKeys(department: Department): string[] {
    return department.streams ? Object.keys(department.streams) : [];
  }

  isFormValid(): boolean {
    if (!this.faculty.id) return false;
    
    return this.faculty.departments.every(dept => {
      if (!dept.name) return false;
      
      // Check department modules
      if (dept.modules?.length) {
        if (!dept.modules.every(mod => mod.moduleName && mod.moduleCode && mod.moduleLevel)) {
          return false;
        }
      }
      
      // Check streams
      if (dept.streams) {
        return Object.values(dept.streams).every(streamArray =>
          streamArray.every(stream =>
           stream.name &&
            stream.modules.every(mod =>
              mod.moduleName && mod.moduleCode && mod.moduleLevel
            )
          )
        );
      }
      
      return true;
    });
  }

  // async saveFaculty() {
  //   if (!this.isFormValid()) {
  //     const toast = await this.toastCtrl.create({
  //       message: 'Please fill all required fields',
  //       duration: 2000,
  //       color: 'warning'
  //     });
  //     toast.present();
  //     return;
  //   }

  //   const loading = await this.loadingCtrl.create({
  //     message: 'Saving faculty data...'
  //   });
  //   await loading.present();

  //   try {
  //     await this.firestore.collection('faculties').doc(this.faculty.id).set(this.faculty, { merge: true });
  //     const toast = await this.toastCtrl.create({
  //       message: 'Faculty saved successfully!',
  //       duration: 2000,
  //       color: 'success'
  //     });
  //     toast.present();
      
  //     // Reset form
  //     this.faculty = {
  //       id: '',
  //       departments: []
  //     };
  //   } catch (error: any) {
  //     const toast = await this.toastCtrl.create({
  //       message: 'Error saving faculty: ' + error.message,
  //       duration: 3000,
  //       color: 'danger'
  //     });
  //     toast.present();
  //   } finally {
  //     loading.dismiss();
  //   }
  // }







  // async saveFaculty() {
  //   if (!this.isFormValid()) {
  //     const toast = await this.toastCtrl.create({
  //       message: 'Please fill all required fields',
  //       duration: 2000,
  //       color: 'warning',
  //     });
  //     toast.present();
  //     return;
  //   }
  
  //   const loading = await this.loadingCtrl.create({
  //     message: 'Saving faculty data...',
  //   });
  //   await loading.present();
  
  //   try {
  //     // Fetch existing faculty data from Firestore
  //     const docRef = this.firestore.collection('faculties').doc(this.faculty.id);
  //     const existingDoc = await docRef.get().toPromise();
  
  //     // Initialize with an empty faculty if no existing data is found
  //     let existingFaculty: Faculty = existingDoc?.exists
  //       ? (existingDoc.data() as Faculty)
  //       : { id: this.faculty.id, departments: [] };
  
  //     // Merge new departments and streams with existing data
  //     this.faculty.departments.forEach((newDept) => {
  //       const existingDept = existingFaculty.departments.find(
  //         (d) => d.name === newDept.name
  //       );
  
  //       if (existingDept) {
  //         // Merge streams
  //         if (newDept.streams) {
  //           Object.entries(newDept.streams).forEach(([streamKey, newStreams]) => {
  //             if (!existingDept.streams) existingDept.streams = {};
  
  //             if (!existingDept.streams[streamKey]) {
  //               existingDept.streams[streamKey] = newStreams;
  //             } else {
  //               // Add new streams without overwriting existing ones
  //               newStreams.forEach((newStream) => {
  //                 if (
  //                   !existingDept.streams![streamKey].some(
  //                     (s) => s.name === newStream.name
  //                   )
  //                 ) {
  //                   existingDept.streams![streamKey].push(newStream);
  //                 }
  //               });
  //             }
  //           });
  //         }
  
  //         // Add new department modules without overwriting
  //         newDept.modules?.forEach((mod) => {
  //           if (
  //             !existingDept.modules?.some(
  //               (m) => m.moduleCode === mod.moduleCode
  //             )
  //           ) {
  //             existingDept.modules?.push(mod);
  //           }
  //         });
  //       } else {
  //         // If the department is new, add it entirely
  //         existingFaculty.departments.push(newDept);
  //       }
  //     });
  
  //     // Save the merged faculty data back to Firestore
  //     await docRef.set(existingFaculty, { merge: true });
  
  //     const toast = await this.toastCtrl.create({
  //       message: 'Faculty saved successfully!',
  //       duration: 2000,
  //       color: 'success',
  //     });
  //     toast.present();
  
  //     // Reset form
  //     this.faculty = { id: '', departments: [] };
  //   } catch (error: any) {
  //     const toast = await this.toastCtrl.create({
  //       message: 'Error saving faculty: ' + error.message,
  //       duration: 3000,
  //       color: 'danger',
  //     });
  //     toast.present();
  //   } finally {
  //     loading.dismiss();
  //   }
  // }
  








  async saveFaculty() {
    if (!this.isFormValid()) {
      const toast = await this.toastCtrl.create({
        message: 'Please fill all required fields',
        duration: 2000,
        color: 'warning',
      });
      toast.present();
      return;
    }
  
    const loading = await this.loadingCtrl.create({
      message: 'Saving faculty data...',
    });
    await loading.present();
  
    try {
      const docRef = this.firestore.collection('faculties').doc(this.faculty.id);
      const existingDoc = await docRef.get().toPromise();
  
      // Initialize with existing faculty or create a new one if it doesn't exist
      let existingFaculty: Faculty = existingDoc?.exists
        ? (existingDoc.data() as Faculty)
        : { id: this.faculty.id, departments: [] };
  
      this.faculty.departments.forEach((newDept) => {
        // Find existing department with the same name
        const existingDept = existingFaculty.departments.find(
          (d) => d.name === newDept.name
        );
  
        if (existingDept) {
          // Merge streams if the department already exists
          Object.entries(newDept.streams || {}).forEach(([streamKey, newStreams]) => {
            if (!existingDept.streams) existingDept.streams = {};
  
            if (!existingDept.streams[streamKey]) {
              // Add the entire new stream if it doesn't exist
              existingDept.streams[streamKey] = newStreams;
            } else {
              // Merge modules if the stream already exists
              newStreams.forEach((newStream) => {
                const existingStream = existingDept.streams![streamKey].find(
                  (s) => s.name === newStream.name
                );
  
                if (existingStream) {
                  // Check if the module already exists in the stream
                  newStream.modules.forEach((newModule) => {
                    const moduleExists = existingStream.modules.some(
                      (m) => m.moduleCode === newModule.moduleCode
                    );
  
                    if (moduleExists) {
                      throw new Error(`Module ${newModule.moduleName} already exists.`);
                    } else {
                      existingStream.modules.push(newModule); // Add new module
                    }
                  });
                } else {
                  // If stream with the same name doesn't exist, add the new stream
                  existingDept.streams![streamKey].push(newStream);
                }
              });
            }
          });
  
          // Merge department-level modules
          newDept.modules?.forEach((newModule) => {
            const moduleExists = existingDept.modules?.some(
              (m) => m.moduleCode === newModule.moduleCode
            );
  
            if (moduleExists) {
              throw new Error(`Module ${newModule.moduleName} already exists.`);
            } else {
              existingDept.modules?.push(newModule); // Add new module
            }
          });
        } else {
          // Add the new department if it doesn't already exist
          existingFaculty.departments.push(newDept);
        }
      });
  
      // Save the updated faculty data
      await docRef.set(existingFaculty, { merge: true });
  
      const toast = await this.toastCtrl.create({
        message: 'Faculty saved successfully!',
        duration: 2000,
        color: 'success',
      });
      toast.present();
  
      // Reset form
      this.faculty = { id: '', departments: [] };
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: error.message || 'Error saving faculty data.',
        duration: 3000,
        color: 'danger',
      });
      toast.present();
    } finally {
      loading.dismiss();
    }
  }
  
}
