export interface User {
    position: any;
    staffNumber: any;
    role: any;
    id: string;
    department:string;
    email: string;
    fullName: string;
    module: string; // Single module, if applicable
    modules: string[]; // Array of module names
    phoneNumber: string;
    password: string;
    confirmPassword: string;
}
