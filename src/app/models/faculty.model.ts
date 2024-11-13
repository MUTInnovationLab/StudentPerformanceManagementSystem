export interface Faculty {
  id: string;
  departments: Department[];
}

export interface Department {
  name: string;
  streams?: StreamMap;
  modules?: Module[];  // For departments with modules but no streams
}

export interface StreamMap {
  [key: string]: Stream[];
}

export interface Stream {
  modules: Module[];
  credits: number;
  year: string;
}

export interface Module {
  moduleName: string;
  moduleCode: string;
  moduleLevel: string;
}

export interface TestPercentages {
  [key: string]: number;  // e.g., { 'test1': 0.2, 'test2': 0.3 }
}

export interface StudentMarks {
  [key: string]: number;  // e.g., { 'test1': 75, 'test2': 80 }
}

const faculty: Faculty = {
  id: 'Faculty of Applied and Health Science',
  departments: [
    {
      name: 'Information Communication Technology',
      streams: {
        CNET: [
          {
            modules: [
              { moduleName: 'Networking', moduleCode: '150', moduleLevel: 'Y1' },
              { moduleName: 'Data Communications', moduleCode: '151', moduleLevel: 'Y1' }
            ],
            credits: 20,
            year: 'Y1'
          }
        ],
        SD: [
          {
            modules: [
              { moduleName: 'System Software', moduleCode: '200', moduleLevel: 'Y1' },
              { moduleName: 'Software Engineering', moduleCode: '201', moduleLevel: 'Y1' }
            ],
            credits: 20,
            year: 'Y1'
          }
        ]
      }
    },
    {
      name: 'Agriculture',
      modules: [
        { moduleName: 'Plant Science', moduleCode: '300', moduleLevel: 'Y2' },
        { moduleName: 'Soil Science', moduleCode: '301', moduleLevel: 'Y2' }
      ]
    },
    {
      name: 'Environmental Science',
      modules: [
        { moduleName: 'Ecology', moduleCode: '400', moduleLevel: 'Y3' },
        { moduleName: 'Environmental Chemistry', moduleCode: '401', moduleLevel: 'Y3' }
      ]
    }
  ]
};
