export interface Faculty {
    id: string;  // The document ID, e.g., 'Faculty of Applied and Health Science'
    departments: Department[];  // Array of departments within the faculty
  }
  
  export interface Department {
    name: string;  // Name of the department, e.g., 'Information Communication Technology'
    streams?: StreamMap;  // Optional map of different streams within the department (may be missing for some departments)
  }
  
  export interface StreamMap {
    [key: string]: Stream[];  // A dynamic map where each stream name (like 'CNET' or 'Animal production') maps to an array of Stream objects
  }
  
  export interface Stream {
    module: string;  // The name of the module, e.g., 'Networking' or 'Anim'
    credits: number;  // Number of credits for the module
    year: string;  // Year of study, e.g., 'Y1' or '1'
  }
  