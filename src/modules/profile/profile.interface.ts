// studentProfile Interface
export interface UpdateStudentData {
  bio?: string;
  education?: string;
  interests?: string[];
  phone?: string;
  address?: string;
}

// tutorProfile Interface
export interface UpdateTutorData {
  title?: string;
  bio?: string;
  qualifications?: string;
  skills?: string[];
  experienceYears?: number;
  pricePerHour?: number;
  categories?: string[];
}
