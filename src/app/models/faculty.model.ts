
  export interface Faculty {
    id: string;
    departments: Department[];
  }
  
  export interface Department {
    name: string;
    streams?: StreamMap;
  }
  
  export interface StreamMap {
    [key: string]: Stream[];
  }
  
  export interface Stream {
    module: string;
    credits: number;
    year: string;
  }
  